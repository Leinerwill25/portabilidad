import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const DAYS_ES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ts = searchParams.get('t')
  const filterWeek = searchParams.get('week')
  const supervisorId = searchParams.get('supervisorId')

  console.log(`[Daily Stats API] Processing request (t: ${ts}, w: ${filterWeek}, s: ${supervisorId})`)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Obtener vendedores del usuario actual
  // 1. Determinar el owner de los sellers (Supervisor)
  let targetOwnerId = user.id

  if (supervisorId) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'coordinator') {
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

  // Determinar la semana actual si no se provee filtro
  const currentWeekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)) + 1
  const activeWeek = filterWeek || String(currentWeekNum)
  const activeWeekStr = String(activeWeek)

  // Estructura de datos: Mapa de vendedores -> Mapa de días
  const sellerDailyMap: Record<string, {
    name: string,
    days: Record<string, { fvc: number, van: number }>
  }> = {}

  const availableWeeks = new Set<string>()

  // Inicializar mapa
  sellers.forEach((s: { id: string, first_name: string, last_name: string }) => {
    sellerDailyMap[s.id] = {
      name: `${s.first_name} ${s.last_name}`,
      days: {}
    }
    DAYS_ES.forEach(day => {
      sellerDailyMap[s.id].days[day] = { fvc: 0, van: 0 }
    })
  })

  await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const rows = fetched.rows
      const headers = fetched.headers
      
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const vanCol = headers.find(h => h.trim().toUpperCase() === 'VAN')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')

      const sellerStats = sellerDailyMap[sheet.seller_id]
      if (!sellerStats) return

      rows.forEach(row => {
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeek = rawWeek?.replace(/\D/g, '') // "13"
        const rowDia = row[diaCol || 'DIA DE LA VENTA']?.trim().toUpperCase()
        
        // Solo agregar semanas válidas al filtro (con datos y no futuras)
        if (rowWeek && Number(rowWeek) > 0 && Number(rowWeek) <= currentWeekNum) {
          if (row[fvcCol || 'FVC'] || row[vanCol || 'VAN']) {
            availableWeeks.add(rowWeek)
          }
        }

        // Solo procesar si coincide con la semana activa
        if (rowWeek === activeWeekStr && rowDia && sellerStats.days[rowDia]) {
          // Contar FVC
          if (row[fvcCol || 'FVC']) {
            sellerStats.days[rowDia].fvc++
          }
          // Contar VAN (Retiro)
          const vanVal = row[vanCol || 'VAN']?.trim().toUpperCase()
          const estatusVal = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
          if (vanVal === 'VAN' || vanVal === 'SI' || vanVal === '1' || vanVal === 'X' || estatusVal === 'ALTA') {
            sellerStats.days[rowDia].van++
          }
        }
      })
    }
  }))

  const sellerList = Object.values(sellerDailyMap)
    .map(s => {
      const processedDays: Record<string, { fvc: number, van: number, pct: string, pctRaw: number }> = {}
      DAYS_ES.forEach(day => {
        const d = s.days[day]
        const pct = d.fvc > 0 ? Math.round((d.van / d.fvc) * 100) : 0
        processedDays[day] = {
          ...d,
          pct: `${pct}%`,
          pctRaw: pct
        }
      })
      return { ...s, days: processedDays }
    })

  // Calcular totales globales por día
  const dailyTotals: Record<string, { fvc: number, van: number, pct: string, pctRaw: number }> = {}
  DAYS_ES.forEach(day => {
    const fvc = sellerList.reduce((acc, curr) => acc + curr.days[day].fvc, 0)
    const van = sellerList.reduce((acc, curr) => acc + curr.days[day].van, 0)
    const pct = fvc > 0 ? Math.round((van / fvc) * 100) : 0
    dailyTotals[day] = {
      fvc,
      van,
      pct: `${pct}%`,
      pctRaw: pct
    }
  })

  return NextResponse.json({
    selectedWeek: activeWeek,
    availableWeeks: Array.from(availableWeeks).sort((a, b) => Number(a) - Number(b)),
    sellers: sellerList,
    dailyTotals
  })
}
