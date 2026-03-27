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
  const filterMonth = searchParams.get('month')?.toUpperCase()
  const filterWeek = searchParams.get('week')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // 1. Verificar si es superadmin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  // 2. Obtener IDs de supervisores asignados (SIN JOIN INICIAL PARA EVITAR BLOQUEOS RLS)
  const { data: assignments, error: assignError } = await supabase
    .from('coordinator_supervisors')
    .select('supervisor_id')
    .eq('coordinator_id', user.id)

  if (assignError || !assignments || assignments.length === 0) {
    console.log('[Hierarchy API] No se encontraron asignaciones en la DB para:', user.id)
    return NextResponse.json({ supervisors: [] })
  }

  const supervisorIds = (assignments || []).map((a: { supervisor_id: string }) => a.supervisor_id)
  console.log('[Hierarchy API] IDs Asignados:', supervisorIds)

  // 3. Obtener nombres de perfiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', supervisorIds)

  console.log('[Hierarchy API] Perfiles encontrados:', profiles?.length || 0)

  // 4. Obtener todos los sellers de estos supervisores
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, first_name, last_name, created_by')
    .in('created_by', supervisorIds) as { data: any[] | null }

  console.log('[Hierarchy API] Vendedores encontrados:', sellers?.length || 0)

  // 5. Obtener todos los sheets de estos sellers
  let sheets: any[] = []
  if (sellers && sellers.length > 0) {
    const sellerIds = sellers.map(s => s.id)
    const { data: sheetsData } = await supabase
      .from('seller_sheets')
      .select('id, seller_id, sheet_id, sheet_url')
      .in('seller_id', sellerIds)
    sheets = sheetsData || []
  }
  console.log('[Hierarchy API] Hojas encontradas:', sheets.length)

  // 6. Preparar Mapas de Agregación
  const currentMonthIndex = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierarchyData: Record<string, any> = {}

  supervisorIds.forEach(sid => {
    const p = profiles?.find((prof: { id: string, full_name?: string | null, email?: string | null }) => prof.id === sid)
    hierarchyData[sid] = {
      id: sid,
      name: p?.full_name || p?.email || 'Supervisor Desconocido',
      sellers: {},
      totals: {
        activacion_no_alta: 0,
        alta: 0,
        alta_no_enrolada: 0,
        sin_status: 0,
        chargeback: 0,
        total: 0
      }
    }
  })

  if (sellers) {
    sellers.forEach((s: any) => {
      const sid = s.created_by
      if (hierarchyData[sid]) {
        hierarchyData[sid].sellers[s.id] = {
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          stats: {
            activacion_no_alta: 0,
            alta: 0,
            alta_no_enrolada: 0,
            sin_status: 0,
            chargeback: 0,
            total: 0
          }
        }
      }
    })
  }

  // 7. Procesar Sheets
  await Promise.all(sheets.map(async (sheet) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')

      const seller = sellers?.find((s: any) => s.id === sheet.seller_id)
      if (!seller) return
      
      const sid = seller.created_by
      const sellerEntry = hierarchyData[sid]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      fetched.rows.forEach((row: RowData) => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        let match = false
        if (filterWeek) match = rowWeekNum === filterWeek
        else if (filterMonth) match = rowMonth === filterMonth
        else match = rowMonth === currentMonthName

        if (!match || !row[dnCol || 'DN']) return

        const estatus = (row[estatusCol || 'ESTATUS'] || 'SIN STATUS').trim().toUpperCase()
        const targetStats = sellerEntry.stats
        const targetTotals = hierarchyData[sid].totals

        targetStats.total++
        targetTotals.total++

        if (estatus.includes('ACTIVACION NO ALTA')) {
          targetStats.activacion_no_alta++
          targetTotals.activacion_no_alta++
        } else if (estatus === 'ALTA') {
          targetStats.alta++
          targetTotals.alta++
        } else if (estatus.includes('ALTA NO ENROLADA')) {
          targetStats.alta_no_enrolada++
          targetTotals.alta_no_enrolada++
        } else if (estatus === 'CHARGEBACK') {
          targetStats.chargeback++
          targetTotals.chargeback++
        } else {
          targetStats.sin_status++
          targetTotals.sin_status++
        }
      })
    }
  }))

  const finalSupervisors = Object.values(hierarchyData).map((supervisor: any) => {
    const sellersList = Object.values(supervisor.sellers).map((s: any) => {
      const conv = s.stats.total > 0 ? Math.round((s.stats.alta / s.stats.total) * 100) : 0
      return { ...s, conv: `${conv}%` }
    })
    const supervisorConv = supervisor.totals.total > 0 
      ? Math.round((supervisor.totals.alta / supervisor.totals.total) * 100) 
      : 0
    return { ...supervisor, sellers: sellersList, conv: `${supervisorConv}%` }
  })

  const grandTotal = finalSupervisors.reduce((acc, curr) => ({
    activacion_no_alta: acc.activacion_no_alta + curr.totals.activacion_no_alta,
    alta: acc.alta + curr.totals.alta,
    alta_no_enrolada: acc.alta_no_enrolada + curr.totals.alta_no_enrolada,
    sin_status: acc.sin_status + curr.totals.sin_status,
    chargeback: acc.chargeback + curr.totals.chargeback,
    total: acc.total + curr.totals.total
  }), { activacion_no_alta: 0, alta: 0, alta_no_enrolada: 0, sin_status: 0, chargeback: 0, total: 0 })

  const grandConv = grandTotal.total > 0 ? Math.round((grandTotal.alta / grandTotal.total) * 100) : 0

  return NextResponse.json({
    supervisors: finalSupervisors,
    grandTotal: { ...grandTotal, conv: `${grandConv}%` }
  })
}
