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
    days: Record<string, { ventas: number, fvc: number, van: number }>
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
      sellerDailyMap[s.id].days[normalizedDay] = { ventas: 0, fvc: 0, van: 0 }
    })
  })

  await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const rows = fetched.rows
      const headers = fetched.headers
      
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaVentaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
      const diaFvcCol = headers.find(h => h.trim().toUpperCase() === 'DIA FVC')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const vanCol = headers.find(h => h.trim().toUpperCase() === 'VAN')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')

      const sellerStats = sellerDailyMap[sheet.seller_id]
      if (!sellerStats) return

      rows.forEach(row => {
        const dn = row[dnCol || 'DN']?.trim()
        if (!dn) return

        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '') // "13"
        
        // Determinar días por métrica
        const rowDiaVenta = normalizeDay(row[diaVentaCol || 'DIA DE LA VENTA'])
        const rowDiaFvc = normalizeDay(row[diaFvcCol || 'DIA FVC'])
        
        // Solo agregar semanas válidas al filtro (con datos y no futuras)
        if (rowWeekNum && Number(rowWeekNum) > 0 && Number(rowWeekNum) <= currentWeekNum) {
          if (row[fvcCol || 'FVC'] || row[vanCol || 'VAN']) {
            availableWeeks.add(rowWeekNum)
          }
        }

        // Solo procesar si coincide con la semana activa
        if (rowWeekNum === activeWeekStr) {
          // 1. Contar Venta (Hacia el día de la venta)
          if (rowDiaVenta && sellerStats.days[rowDiaVenta]) {
            sellerStats.days[rowDiaVenta].ventas++
          }

          // 2. Contar FVC (Hacia el día de entrega/FVC)
          if (rowDiaFvc && sellerStats.days[rowDiaFvc]) {
            if (row[fvcCol || 'FVC']) {
              sellerStats.days[rowDiaFvc].fvc++
            }
          }

          // 3. Contar Altas (Hacia el día de entrega/FVC)
          if (rowDiaFvc && sellerStats.days[rowDiaFvc]) {
            const estatusVal = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
            if (estatusVal === 'ALTA') {
              sellerStats.days[rowDiaFvc].van++
            }
          }
        }
      })
    }
  }))

  const sellerList = Object.values(sellerDailyMap)
    .map(s => {
      const processedDays: Record<string, { ventas: number, fvc: number, van: number, pct: string, pctRaw: number }> = {}
      DAYS_ES.forEach(day => {
        const normalizedDay = normalizeDay(day)
        const d = s.days[normalizedDay]
        const pct = d.fvc > 0 ? Math.round((d.van / d.fvc) * 100) : 0
        processedDays[normalizedDay] = {
          ...d,
          pct: `${pct}%`,
          pctRaw: pct
        }
      })
      return { ...s, days: processedDays }
    })

  // Calcular totales globales por día
  const dailyTotals: Record<string, { ventas: number, fvc: number, van: number, pct: string, pctRaw: number }> = {}
  DAYS_ES.forEach(day => {
    const normalizedDay = normalizeDay(day)
    const ventas = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.ventas || 0), 0)
    const fvc = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.fvc || 0), 0)
    const van = sellerList.reduce((acc, curr) => acc + (curr.days[normalizedDay]?.van || 0), 0)
    const pct = fvc > 0 ? Math.round((van / fvc) * 100) : 0
    dailyTotals[normalizedDay] = {
      ventas,
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
