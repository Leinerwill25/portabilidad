import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getGoogleSheetsWeek, getLocalTimeDate } from '@/lib/sheets/scraper'

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
  try {
    const { searchParams } = new URL(request.url)
    const forceFresh = searchParams.get('force') === 'true'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[DailySales] No authorized user found')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.warn('[DailySales] Profile not found or error:', profileError)
      return NextResponse.json({ error: 'Perfil no configurado correctamente' }, { status: 403 })
    }

    const userRole = profile?.role

    if (userRole !== 'superadmin' && userRole !== 'coordinator' && userRole !== 'admin') {
      console.warn('[DailySales] Access denied for role:', userRole)
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 1. Obtener supervisores a considerar
    let supervisorIds: string[] = []
    if (userRole === 'admin') {
      supervisorIds = [user.id]
    } else {
      // Coordinadores/Superadmins obtienen todos los supervisores asignados
      const { data: assignments, error: assignError } = await supabase
        .from('coordinator_supervisors')
        .select('supervisor_id')
        .eq('coordinator_id', user.id)
      
      if (assignError) {
        console.error('[DailySales] Error fetching assignments:', assignError)
      }

      if (assignments && assignments.length > 0) {
        supervisorIds = assignments.map((a: { supervisor_id: string }) => a.supervisor_id)
      } else if (userRole === 'superadmin') {
         // Superadmin sin asignaciones (opcional: todos los supervisores)
         const { data: allSups } = await supabase.from('profiles').select('id').eq('role', 'admin')
         supervisorIds = allSups?.map((s: { id: string }) => s.id) || []
         console.log('[DailySales] Superadmin: Using all admins as supervisors', supervisorIds.length)
      }
    }

    if (supervisorIds.length === 0) {
      return NextResponse.json({ 
        totalToday: 0, 
        supervisorName: profile?.full_name || 'N/A',
        message: 'No hay supervisores asignados'
      })
    }

    // 2. Obtener vendedores
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, first_name, last_name, created_by')
      .in('created_by', supervisorIds)

    if (sellersError) {
      console.error('[DailySales] Error fetching sellers:', sellersError)
      throw new Error('Error al consultar vendedores')
    }

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ totalToday: 0, supervisorName: profile?.full_name || 'N/A', breakdown: [] })
    }

    const sellerIds = sellers.map((s: { id: string }) => s.id)
    const sellerToSupervisor: Record<string, string> = {}
    const sellerNameMap: Record<string, string> = {}
    sellers.forEach((s: { id: string, created_by: string, first_name: string | null, last_name: string | null }) => {
      sellerToSupervisor[s.id] = s.created_by
      sellerNameMap[s.id] = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Vendedor'
    })

    // Obtener perfiles de los supervisores para los nombres del breakdown
    const { data: supProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', supervisorIds)

    const supProfileMap: Record<string, string> = {}
    supProfiles?.forEach((p: { id: string, full_name: string | null, email: string | null }) => {
      supProfileMap[p.id] = p.full_name || p.email || 'Supervisor'
    })

    // 3. Obtener sheets
    const { data: sheets, error: sheetsError } = await supabase
      .from('seller_sheets')
      .select('seller_id, sheet_id, sheet_url')
      .in('seller_id', sellerIds)

    if (sheetsError) {
      console.error('[DailySales] Error fetching sheets:', sheetsError)
      throw new Error('Error al consultar hojas de cálculo')
    }

    if (!sheets || sheets.length === 0) {
      return NextResponse.json({ totalToday: 0, supervisorName: profile?.full_name || 'N/A' })
    }

    // 4. Procesar Ventas de HOY
    const localDate = getLocalTimeDate()
    const currentWeekNum = getGoogleSheetsWeek(localDate)
    const todayIndex = localDate.getDay()
    const todayNameNormalized = normalizeDay(DAYS_ES[todayIndex])
    
    let totalToday = 0
    const breakdownMap: Record<string, { total: number, sellers: Record<string, number> }> = {}

    supervisorIds.forEach(id => breakdownMap[id] = { total: 0, sellers: {} })
    sellers.forEach((s: { id: string, created_by: string }) => {
      if (breakdownMap[s.created_by]) {
        breakdownMap[s.created_by].sellers[s.id] = 0
      }
    })

    await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
      try {
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
                const supId = sellerToSupervisor[sheet.seller_id]
                if (supId && breakdownMap[supId]) {
                  breakdownMap[supId].total++
                  if (breakdownMap[supId].sellers[sheet.seller_id] !== undefined) {
                    breakdownMap[supId].sellers[sheet.seller_id]++
                  }
                }
              }
            }
          })
        }
      } catch (err) {
        console.error(`[DailySales] Failed to process sheet for seller ${sheet.seller_id}:`, err)
      }
    }))

    const breakdown = Object.entries(breakdownMap)
      .map(([id, data]) => ({
        name: supProfileMap[id] || 'N/A',
        total: data.total,
        sellers: Object.entries(data.sellers)
          .map(([sId, sTotal]) => ({
            name: sellerNameMap[sId] || 'N/A',
            total: sTotal
          }))
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      totalToday,
      supervisorName: profile?.full_name || 'Mi Equipo',
      breakdown,
      lastUpdate: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[DailySales] Critical Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
