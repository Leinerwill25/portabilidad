import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const DAYS_ES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

interface DayStat {
  fvc: number
  van: number
  pct?: string
  pctRaw?: number
}

interface SupervisorData {
  id: string
  name: string
  days: Record<string, DayStat>
}

interface SellerData {
  id: string
  first_name: string
  last_name: string
  created_by: string
}

interface SheetData {
  id: string
  seller_id: string
  sheet_id: string
  sheet_url: string
}

interface AssignmentData {
  supervisor_id: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filterWeek = searchParams.get('week')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Obtener supervisores asignados al coordinador
  const { data: assignmentsData, error: assignError } = await supabase
    .from('coordinator_supervisors')
    .select(`
      supervisor_id,
      profiles:supervisor_id (
        full_name,
        email
      )
    `)
    .eq('coordinator_id', user.id)

  if (assignError || !assignmentsData) {
    return NextResponse.json({ error: 'Error al obtener asignaciones' }, { status: 500 })
  }

  const assignments = assignmentsData as unknown as AssignmentData[]
  const supervisorIds = assignments.map(a => a.supervisor_id)
  
  if (supervisorIds.length === 0) {
    return NextResponse.json({ supervisors: [], dailyTotals: {}, availableWeeks: [] })
  }

  // 2. Obtener todos los vendedores para estos supervisores
  const { data: sellersData, error: sellersError } = await supabase
    .from('sellers')
    .select('id, first_name, last_name, created_by')
    .in('created_by', supervisorIds)

  if (sellersError || !sellersData) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  const sellers = sellersData as SellerData[]

  // 3. Obtener sheets vinculados
  const { data: sheetsData, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url')
    .in('seller_id', sellers.map(s => s.id))

  if (sheetsError || !sheetsData) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  const sheets = sheetsData as SheetData[]

  // Determinar la semana actual
  const currentWeekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)) + 1
  const activeWeek = filterWeek || String(currentWeekNum)
  const activeWeekStr = String(activeWeek)

  // Estructura: Mapa de Supervisores -> Mapa de Días
  const supervisorDailyMap: Record<string, SupervisorData> = {}

  assignments.forEach(a => {
    supervisorDailyMap[a.supervisor_id] = {
      id: a.supervisor_id,
      name: a.profiles?.full_name || a.profiles?.email || 'Site Desc.',
      days: {}
    }
    DAYS_ES.forEach(day => {
      supervisorDailyMap[a.supervisor_id].days[day] = { fvc: 0, van: 0 }
    })
  })

  // Mapeo de vendedor a su supervisor para fácil agregación
  const sellerToSupervisor: Record<string, string> = {}
  sellers.forEach(s => {
    sellerToSupervisor[s.id] = s.created_by
  })

  const availableWeeks = new Set<string>()

  await Promise.all(sheets.map(async (sheet) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const { rows, headers } = fetched
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const vanCol = headers.find(h => h.trim().toUpperCase() === 'VAN')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')

      const supId = sellerToSupervisor[sheet.seller_id]
      const supervisorStats = supervisorDailyMap[supId]
      if (!supervisorStats) return

      rows.forEach(row => {
        const dn = row[dnCol || 'DN']?.trim()
        if (!dn) return

        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')
        const rowDia = row[diaCol || 'DIA DE LA VENTA']?.trim().toUpperCase()

        if (rowWeekNum && Number(rowWeekNum) > 0 && Number(rowWeekNum) <= currentWeekNum) {
          availableWeeks.add(rowWeekNum)
        }

        if (rowWeekNum === activeWeekStr && rowDia && supervisorStats.days[rowDia]) {
          // Contar FVC
          if (row[fvcCol || 'FVC']) {
            supervisorStats.days[rowDia].fvc++
          }
          // Contar VAN
          const vanVal = row[vanCol || 'VAN']?.trim().toUpperCase()
          const estatusVal = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
          if (vanVal === 'VAN' || vanVal === 'SI' || vanVal === '1' || vanVal === 'X' || estatusVal === 'ALTA') {
            supervisorStats.days[rowDia].van++
          }
        }
      })
    }
  }))

  const supervisorList = Object.values(supervisorDailyMap)
    .map(s => {
      const processedDays: Record<string, DayStat> = {}
      DAYS_ES.forEach(day => {
        const d = s.days[day]
        const pct = d.fvc > 0 ? Math.round((d.van / d.fvc) * 100) : 0
        processedDays[day] = { ...d, pct: `${pct}%`, pctRaw: pct }
      })
      return { ...s, days: processedDays }
    })

  // Totales globales
  const dailyTotals: Record<string, DayStat> = {}
  DAYS_ES.forEach(day => {
    const fvc = supervisorList.reduce((acc, curr) => acc + curr.days[day].fvc, 0)
    const van = supervisorList.reduce((acc, curr) => acc + curr.days[day].van, 0)
    const pct = fvc > 0 ? Math.round((van / fvc) * 100) : 0
    dailyTotals[day] = { fvc, van, pct: `${pct}%`, pctRaw: pct }
  })

  return NextResponse.json({
    selectedWeek: activeWeek,
    availableWeeks: Array.from(availableWeeks).sort((a, b) => Number(a) - Number(b)),
    supervisors: supervisorList,
    dailyTotals
  })
}
