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

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Verificar si es superadmin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // 2. Obtener supervisores asignados
  const { data: assignments } = await supabase
    .from('coordinator_supervisors')
    .select('supervisor_id, profiles!inner(full_name, email)')
    .eq('coordinator_id', user.id)

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ supervisors: [] })
  }

  const supervisorIds = assignments.map((a: { supervisor_id: string }) => a.supervisor_id)
  
  // 3. Obtener todos los sellers de estos supervisores
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, first_name, last_name, created_by')
    .in('created_by', supervisorIds) as { data: any[], error: any }

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({ supervisors: [] })
  }

  // 4. Obtener todos los sheets de estos sellers
  const sellerIds = sellers.map(s => s.id)
  const { data: sheets } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url')
    .in('seller_id', sellerIds)

  // 5. Preparar Mapas de Agregación
  const currentMonthIndex = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierarchyData: Record<string, any> = {}

  assignments.forEach((a: any) => {
    hierarchyData[a.supervisor_id] = {
      id: a.supervisor_id,
      name: a.profiles?.full_name || a.profiles?.email,
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

  sellers.forEach((s: any) => {
    const supervisorId = s.created_by
    if (hierarchyData[supervisorId]) {
      hierarchyData[supervisorId].sellers[s.id] = {
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

  // 6. Procesar Sheets en Paralelo
  await Promise.all((sheets || []).map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')

      const seller = sellers.find((s: { id: string }) => s.id === sheet.seller_id)
      if (!seller) return
      
      const supervisorId = seller.created_by
      const sellerEntry = hierarchyData[supervisorId]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      fetched.rows.forEach((row: RowData) => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        // Filtro de temporalidad
        let match = false
        if (filterWeek) {
          match = rowWeekNum === filterWeek
        } else if (filterMonth) {
          match = rowMonth === filterMonth
        } else {
          match = rowMonth === currentMonthName
        }

        if (!match) return
        if (!row[dnCol || 'DN']) return // Solo filas con DN cuentan como registros base

        const estatus = (row[estatusCol || 'ESTATUS'] || 'SIN STATUS').trim().toUpperCase()
        const targetStats = sellerEntry.stats
        const targetTotals = hierarchyData[supervisorId].totals

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
          // Por defecto si no coincide con los anteriores
          targetStats.sin_status++
          targetTotals.sin_status++
        }
      })
    }
  }))

  // 7. Formatear Respuesta Final
  const result = Object.values(hierarchyData).map(supervisor => {
    const sellersList = Object.values(supervisor.sellers).map((s: any) => {
      const conv = s.stats.total > 0 ? Math.round((s.stats.alta / s.stats.total) * 100) : 0
      return { ...s, conv: `${conv}%` }
    })

    const supervisorConv = supervisor.totals.total > 0 
      ? Math.round((supervisor.totals.alta / supervisor.totals.total) * 100) 
      : 0

    return {
      ...supervisor,
      sellers: sellersList,
      conv: `${supervisorConv}%`
    }
  })

  // Calcular Gran Total
  const grandTotal = result.reduce((acc, curr) => ({
    activacion_no_alta: acc.activacion_no_alta + curr.totals.activacion_no_alta,
    alta: acc.alta + curr.totals.alta,
    alta_no_enrolada: acc.alta_no_enrolada + curr.totals.alta_no_enrolada,
    sin_status: acc.sin_status + curr.totals.sin_status,
    chargeback: acc.chargeback + curr.totals.chargeback,
    total: acc.total + curr.totals.total
  }), { activacion_no_alta: 0, alta: 0, alta_no_enrolada: 0, sin_status: 0, chargeback: 0, total: 0 })

  const grandConv = grandTotal.total > 0 ? Math.round((grandTotal.alta / grandTotal.total) * 100) : 0

  return NextResponse.json({
    supervisors: result,
    grandTotal: {
      ...grandTotal,
      conv: `${grandConv}%`
    }
  })
}
