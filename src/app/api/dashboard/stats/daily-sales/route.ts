import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getGoogleSheetsWeek } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const DAYS_ES = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const forceFresh = searchParams.get('force') === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const userRole = profile?.role

  if (userRole !== 'superadmin' && userRole !== 'coordinator' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // 1. Obtener supervisores a considerar
  let supervisorIds: string[] = []
  if (userRole === 'admin') {
    supervisorIds = [user.id]
  } else {
    // Coordinadores/Superadmins obtienen todos los supervisores asignados
    const { data: assignments } = await supabase
      .from('coordinator_supervisors')
      .select('supervisor_id')
      .eq('coordinator_id', user.id)
    
    if (assignments && assignments.length > 0) {
      supervisorIds = assignments.map((a: { supervisor_id: string }) => a.supervisor_id)
    } else if (userRole === 'superadmin') {
       // Superadmin sin asignaciones (opcional: todos los supervisores)
       const { data: allSups } = await supabase.from('profiles').select('id').eq('role', 'admin')
       supervisorIds = allSups?.map((s: { id: string }) => s.id) || []
    }
  }

  if (supervisorIds.length === 0) {
    return NextResponse.json({ totalToday: 0, supervisorName: profile?.full_name || 'N/A' })
  }

  // 2. Obtener vendedores
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id')
    .in('created_by', supervisorIds)

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({ totalToday: 0, supervisorName: profile?.full_name || 'N/A' })
  }

  const sellerIds = sellers.map((s: { id: string }) => s.id)

  // 3. Obtener sheets
  const { data: sheets } = await supabase
    .from('seller_sheets')
    .select('sheet_id, sheet_url')
    .in('seller_id', sellers.map((s: { id: string }) => s.id))

  if (!sheets || sheets.length === 0) {
    return NextResponse.json({ totalToday: 0, supervisorName: profile?.full_name || 'N/A' })
  }

  // 4. Procesar Ventas de HOY
  const currentWeekNum = getGoogleSheetsWeek()
  const todayIndex = new Date().getDay()
  const todayNameNormalized = normalizeDay(DAYS_ES[todayIndex])
  
  let totalToday = 0

  await Promise.all(sheets.map(async (sheet: { sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const headers = fetched.headers
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaVentaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')

      fetched.rows.forEach(row => {
        const dn = row[dnCol || 'DN']?.trim()
        if (!dn) return

        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        if (rowWeekNum === String(currentWeekNum)) {
          const rowDiaVenta = normalizeDay(row[diaVentaCol || 'DIA DE LA VENTA'])
          if (rowDiaVenta === todayNameNormalized) {
            totalToday++
          }
        }
      })
    }
  }))

  return NextResponse.json({
    totalToday,
    supervisorName: profile?.full_name || 'Mi Equipo',
    lastUpdate: new Date().toISOString()
  })
}
