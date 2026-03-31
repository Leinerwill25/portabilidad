import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

interface RowData {
  [key: string]: string | undefined
}

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

  if (sellersError || !sellers) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  // 2. Obtener sheets vinculados
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url, display_name')
    .in('seller_id', sellers.map((s: { id: string }) => s.id))

  if (sheetsError || !sheets) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await Promise.all(sheets.map(async (sheet: any) => {
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
      const semanaFvcCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA FVC')

      const stats = sellerStatsMap[sheet.seller_id]
      if (!stats) return

      rows.forEach((row: RowData) => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        const rawWeekFvc = row[semanaFvcCol || 'SEMANA FVC']?.trim()
        const rowWeekFvcNum = rawWeekFvc && rawWeekFvc !== '' ? rawWeekFvc.replace(/\D/g, '') : rowWeekNum

        if (rowMonth) availableMonths.add(rowMonth)
        
        const currentWeekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)) + 1

        if (rowWeekNum && Number(rowWeekNum) > 0 && Number(rowWeekNum) <= currentWeekNum) {
          if (row[dnCol || 'DN']) {
             availableWeeks.add(rowWeekNum)
          }
        }
        if (rowWeekFvcNum && Number(rowWeekFvcNum) > 0 && Number(rowWeekFvcNum) <= currentWeekNum) {
          if (row[fvcCol || 'FVC']) {
             availableWeeks.add(rowWeekFvcNum)
          }
        }

        let matchVentas = false
        if (filterWeek) {
          matchVentas = rowWeekNum === filterWeek
        } else if (filterMonth) {
          matchVentas = rowMonth === filterMonth
        } else {
          matchVentas = rowMonth === currentMonthName
        }

        let matchFvc = false
        if (filterWeek) {
          matchFvc = rowWeekFvcNum === filterWeek
        } else if (filterMonth) {
          matchFvc = rowMonth === filterMonth
        } else {
          matchFvc = rowMonth === currentMonthName
        }

        if (matchVentas) {
          if (row[dnCol || 'DN']) stats.ventas++
        }

        if (matchFvc) {
          if (row[fvcCol || 'FVC']) stats.fvc++
          const estatus = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
          if (estatus === 'ALTA') stats.altas++
        }
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
