import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getGoogleSheetsWeek } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const DAYS_ES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ts = searchParams.get('t')
  const filterWeek = searchParams.get('week')
  const supervisorId = searchParams.get('supervisorId')
  const forceFresh = searchParams.get('force') === 'true'

  console.log(`[Daily Stats API] Processing request (t: ${ts}, w: ${filterWeek}, s: ${supervisorId})`)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Determine the target owner (supervisor)
  let targetOwnerId = user.id

  if (supervisorId && supervisorId !== 'undefined' && supervisorId !== user.id) {
    // 1. Check if the user is a coordinator who has this supervisor assigned
    const { data: assignment } = await supabase
      .from('coordinator_supervisors')
      .select('*')
      .eq('coordinator_id', user.id)
      .eq('supervisor_id', supervisorId)
      .single()
    
    if (assignment) {
      targetOwnerId = supervisorId
    } else {
      // 2. Fallback: check if the user is a superadmin
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'superadmin') {
        targetOwnerId = supervisorId
      } else {
        // Forbidden access
        return NextResponse.json({ error: 'No tienes acceso a este supervisor' }, { status: 403 })
      }
    }
  }

  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, first_name, last_name')
    .eq('created_by', targetOwnerId)

  if (sellersError) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  console.log(`[Daily Stats API] Found ${sellers?.length || 0} sellers for targetOwnerId: ${targetOwnerId}`)

  // 2. Obtener sheets vinculados
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url, display_name')
    .in('seller_id', sellers.map((s: { id: string }) => s.id))

  if (sheetsError) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  // Determinar la semana actual (Google Sheets compatible)
  const currentWeekNum = getGoogleSheetsWeek()
  const activeWeek = filterWeek || String(currentWeekNum)
  const activeWeekStr = String(activeWeek)

  // Estructura de datos: Mapa de vendedores -> Mapa de días
  const sellerDailyMap: Record<string, {
    name: string,
    days: Record<string, { ventas: number, fvc: number, van: number, no_enrolado?: number, aa?: number, promesa?: number, sin_status?: number }>
  }> = {}

  const availableWeeks = new Set<string>()

  // Inicializar mapa
  sellers.forEach((s: { id: string, first_name: string, last_name: string }) => {
    sellerDailyMap[s.id] = {
      name: `${s.first_name} ${s.last_name}`,
      days: {}
    }
    DAYS_ES.forEach(day => {
      const normalizedDay = normalizeDay(day)
      sellerDailyMap[s.id].days[normalizedDay] = { ventas: 0, fvc: 0, van: 0, no_enrolado: 0, aa: 0, promesa: 0, sin_status: 0 }
    })
  })

  await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (!fetched.success) {
      console.error(`[Daily Stats API] Error fetching sheet ${sheet.sheet_id}: ${fetched.error}`)
      return
    }

    if (fetched.success && fetched.rows.length > 0) {
      const rows = fetched.rows
      const headers = fetched.headers
      
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const semanaFvcCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA FVC')
      const diaVentaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
      const diaFvcCol = headers.find(h => h.trim().toUpperCase() === 'DIA FVC')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const vanCol = headers.find(h => h.trim().toUpperCase() === 'VAN')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')

      const sellerStats = sellerDailyMap[sheet.seller_id]
      if (!sellerStats) return

      rows.forEach(row => {
        const dn = row[dnCol || 'DN']?.trim()
        
        // Robustness: If DN column exists, we require a value. 
        // If DN column is missing, count if MES or SEMANA is present (indicating a data row).
        if (dnCol && !dn) return
        if (!dnCol && !row[mesCol || 'MES'] && !row[semanaCol || 'SEMANA']) return

        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '') // "13"

        const rawWeekFvc = row[semanaFvcCol || 'SEMANA FVC']?.trim()
        const rowWeekFvcNum = rawWeekFvc && rawWeekFvc !== '' ? rawWeekFvc.replace(/\D/g, '') : rowWeekNum
        
        // Determinar días por métrica
        const rowDiaVenta = normalizeDay(row[diaVentaCol || 'DIA DE LA VENTA'])
        const rowDiaFvc = normalizeDay(row[diaFvcCol || 'DIA FVC'])
        
        // Solo agregar semanas válidas al filtro (con datos y no futuras)
        if (rowWeekNum && Number(rowWeekNum) > 0 && Number(rowWeekNum) <= currentWeekNum) {
          if (row[fvcCol || 'FVC'] || row[vanCol || 'VAN']) {
            availableWeeks.add(rowWeekNum)
          }
        }
        if (rowWeekFvcNum && Number(rowWeekFvcNum) > 0 && Number(rowWeekFvcNum) <= currentWeekNum) {
          if (row[fvcCol || 'FVC'] || row[vanCol || 'VAN']) {
            availableWeeks.add(rowWeekFvcNum)
          }
        }

        // Solo procesar si coincide con la semana activa
        if (rowWeekNum === activeWeekStr) {
          // 1. Contar Venta (Hacia el día de la venta) usando SEMANA
          if (rowDiaVenta && sellerStats.days[rowDiaVenta]) {
            sellerStats.days[rowDiaVenta].ventas++
          }
        }

        if (rowWeekFvcNum === activeWeekStr) {
          // 2. Contar FVC y Altas (Hacia el día de entrega/FVC) usando SEMANA FVC
          if (rowDiaFvc && sellerStats.days[rowDiaFvc]) {
            const fvcRaw = row[fvcCol || 'FVC']?.trim().toUpperCase()
            const estatusRaw = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
            const isValidFvc = fvcRaw && fvcRaw !== 'NO' && !(fvcRaw === 'FVC' && estatusRaw === 'RECHAZO')

            if (isValidFvc) {
              sellerStats.days[rowDiaFvc].fvc++

              if (estatusRaw === 'ALTA') {
                sellerStats.days[rowDiaFvc].van++
              } else if (estatusRaw === 'NO ENROLADO') {
                sellerStats.days[rowDiaFvc].no_enrolado = (sellerStats.days[rowDiaFvc].no_enrolado || 0) + 1
              } else if (estatusRaw === 'AA') {
                sellerStats.days[rowDiaFvc].aa = (sellerStats.days[rowDiaFvc].aa || 0) + 1
              } else if (estatusRaw === 'PROMESA DE VISITA') {
                sellerStats.days[rowDiaFvc].promesa = (sellerStats.days[rowDiaFvc].promesa || 0) + 1
              } else if (estatusRaw === 'SIN STATUS') {
                sellerStats.days[rowDiaFvc].sin_status = (sellerStats.days[rowDiaFvc].sin_status || 0) + 1
              }
            }
          }
        }

      })
    }
  }))

  const sellerList = Object.values(sellerDailyMap)
    .map(s => {
      const processedDays: Record<string, { ventas: number, fvc: number, van: number, pct: string, pctRaw: number, no_enrolado: number, aa: number, promesa: number, sin_status: number }> = {}
      DAYS_ES.forEach(day => {
        const normalizedDay = normalizeDay(day)
        const d = s.days[normalizedDay]
        const pct = d.fvc > 0 ? Math.round((d.van / d.fvc) * 100) : 0
        processedDays[normalizedDay] = {
          ...d,
          no_enrolado: d.no_enrolado || 0,
          aa: d.aa || 0,
          promesa: d.promesa || 0,
          sin_status: d.sin_status || 0,
          pct: `${pct}%`,
          pctRaw: pct
        }
      })
      return { ...s, days: processedDays }
    })

  // Calcular totales globales por día
  const dailyTotals: Record<string, { ventas: number, fvc: number, van: number, pct: string, pctRaw: number, no_enrolado: number, aa: number, promesa: number, sin_status: number }> = {}
  DAYS_ES.forEach(day => {
    const normalizedDay = normalizeDay(day)
    const ventas = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.ventas || 0), 0)
    const fvc = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.fvc || 0), 0)
    const van = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.van || 0), 0)
    const no_enrolado = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.no_enrolado || 0), 0)
    const aa = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.aa || 0), 0)
    const promesa = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.promesa || 0), 0)
    const sin_status = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.sin_status || 0), 0)
    const pct = fvc > 0 ? Math.round((van / fvc) * 100) : 0
    dailyTotals[normalizedDay] = {
      ventas,
      fvc,
      van,
      no_enrolado,
      aa,
      promesa,
      sin_status,
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
