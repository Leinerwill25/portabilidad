import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ts = searchParams.get('t')
  const filterMonth = searchParams.get('month')?.toUpperCase()
  const filterWeek = searchParams.get('week')
  const supervisorId = searchParams.get('supervisorId')

  console.log(`[API] Processing stats request (t: ${ts}, m: ${filterMonth}, w: ${filterWeek})`)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Valores predeterminados si no hay filtros
  const currentMonthIndex = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  // 1. Determinar el owner de los sellers (Supervisor)
  let targetOwnerId = user.id

  if (supervisorId) {
    // Si se pasa un supervisorId, verificar si el usuario actual es coordinador y tiene permiso
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    
    if (profile?.role === 'superadmin') {
      const { data: assignment } = await supabase
        .from('coordinator_supervisors')
        .select('*')
        .eq('coordinator_id', user.id)
        .eq('supervisor_id', supervisorId)
        .single()
      
      if (!assignment) {
        return NextResponse.json({ error: 'No tienes acceso a este supervisor' }, { status: 403 })
      }
      targetOwnerId = supervisorId
    }
  }

  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, first_name, last_name')
    .eq('created_by', targetOwnerId)

  if (sellersError) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  // 2. Obtener sheets vinculados
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url, display_name')
    .in('seller_id', sellers.map((s: { id: string }) => s.id))

  if (sheetsError) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  // 3. Procesar sheets en paralelo
  const sellerStatsMap: Record<string, { 
    name: string, 
    ventas: number, 
    fvc: number, 
    altas: number 
  }> = {}

  const availableMonths = new Set<string>()
  const availableWeeks = new Set<string>()

  sellers.forEach((s: { id: string, first_name: string, last_name: string }) => {
    sellerStatsMap[s.id] = {
      name: `${s.first_name} ${s.last_name}`,
      ventas: 0,
      fvc: 0,
      altas: 0
    }
  })

  await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const rows = fetched.rows
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')

      const stats = sellerStatsMap[sheet.seller_id]
      if (!stats) return

      const currentWeekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)) + 1

      rows.forEach(row => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        // Extraer solo números de la semana (ej: "SEMANA 13" -> "13")
        const rowWeek = rawWeek?.replace(/\D/g, '')

        if (rowMonth) availableMonths.add(rowMonth)
        
        const currentWeekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)) + 1

        // Solo agregar semanas válidas al filtro (con datos y no futuras)
        if (rowWeek && Number(rowWeek) > 0 && Number(rowWeek) <= currentWeekNum) {
          if (row[dnCol || 'DN'] || row[fvcCol || 'FVC']) {
             availableWeeks.add(rowWeek)
          }
        }

        // Lógica de Filtrado:
        // Si se especifica semana, prima la semana.
        // Si no, se usa el mes filtrado o el mes actual por defecto.
        let match = false
        if (filterWeek) {
          match = rowWeek === filterWeek
        } else if (filterMonth) {
          match = rowMonth === filterMonth
        } else {
          match = rowMonth === currentMonthName
        }

        if (!match) return

        // 1. Ventas
        if (row[dnCol || 'DN']) stats.ventas++

        // 2. FVC
        if (row[fvcCol || 'FVC']) stats.fvc++

        // 3. Altas (Validando cruce con FVC)
        const estatus = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
        const fvcValue = row[fvcCol || 'FVC']?.trim().toUpperCase()
        if (estatus === 'ALTA' && fvcValue === 'FVC') stats.altas++
      })
    }
  }))

  const sellerStatsList = Object.values(sellerStatsMap)
    .map(s => {
      const porcentajeAltas = s.fvc > 0 ? Math.round((s.altas / s.fvc) * 100) : 0
      return {
        ...s,
        porcentajeAltas: `${porcentajeAltas}%`,
        porcentajeRaw: porcentajeAltas
      }
    })

  const global = sellerStatsList.reduce((acc, curr) => ({
    ventas: acc.ventas + curr.ventas,
    fvc: acc.fvc + curr.fvc,
    altas: acc.altas + curr.altas
  }), { ventas: 0, fvc: 0, altas: 0 })

  const globalPorcentaje = global.fvc > 0 ? Math.round((global.altas / global.fvc) * 100) : 0

  return NextResponse.json({
    selectedMonth: filterMonth || (filterWeek ? 'Variante' : currentMonthName),
    selectedWeek: filterWeek || 'Todas',
    filterOptions: {
      months: Array.from(availableMonths).sort((a, b) => MONTHS_ES.indexOf(a) - MONTHS_ES.indexOf(b)),
      weeks: Array.from(availableWeeks).sort((a, b) => Number(a) - Number(b))
    },
    sellers: sellerStatsList,
    global: {
      ...global,
      porcentajeAltas: `${globalPorcentaje}%`
    }
  })
}
