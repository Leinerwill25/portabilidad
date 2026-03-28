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

interface Seller {
  id: string
  first_name: string
  last_name: string
  created_by: string
}

interface Sheet {
  id: string
  seller_id: string
  sheet_id: string
  sheet_url: string
}

interface SellerStats {
  id: string
  name: string
  stats: {
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    promesa: number
    fvc: number
    total: number
  }
}

interface HierarchySupervisor {
  id: string
  name: string
  sellers: Record<string, SellerStats>
  totals: {
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    promesa: number
    fvc: number
    total: number
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filterMonth = searchParams.get('month')?.toUpperCase()
  const filterWeek = searchParams.get('week')
  const supervisorId = searchParams.get('supervisorId')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const userRole = profile?.role

  if (userRole !== 'superadmin' && userRole !== 'coordinator' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  let supervisorIds: string[] = []

  if (userRole === 'admin') {
    // Si es supervisor, solo se ve a sí mismo
    supervisorIds = [user.id]
  } else {
    // Si es coordinador o superadmin
    if (supervisorId) {
      // Verificar si tiene asignado a este supervisor
      const { data: assignment } = await supabase
        .from('coordinator_supervisors')
        .select('*')
        .eq('coordinator_id', user.id)
        .eq('supervisor_id', supervisorId)
        .single()
      
      if (!assignment) {
        return NextResponse.json({ error: 'No autorizado para este supervisor' }, { status: 403 })
      }
      supervisorIds = [supervisorId]
    } else {
      // Obtener todos sus supervisores asignados
      const { data: assignments } = await supabase
        .from('coordinator_supervisors')
        .select('supervisor_id')
        .eq('coordinator_id', user.id)

      if (!assignments || assignments.length === 0) {
        return NextResponse.json({ supervisors: [] })
      }
      supervisorIds = (assignments as { supervisor_id: string[] }[]).map(a => a.supervisor_id as unknown as string)
    }
  }

  // 3. Obtener nombres de perfiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', supervisorIds)

  // 4. Obtener todos los sellers de estos supervisores
  const { data: sellersData } = await supabase
    .from('sellers')
    .select('id, first_name, last_name, created_by')
    .in('created_by', supervisorIds)
  
  const sellers = sellersData as Seller[] | null

  // 5. Obtener todos los sheets de estos sellers
  let sheets: Sheet[] = []
  if (sellers && sellers.length > 0) {
    const sellerIds = sellers.map(s => s.id)
    const { data: sheetsData } = await supabase
      .from('seller_sheets')
      .select('id, seller_id, sheet_id, sheet_url')
      .in('seller_id', sellerIds)
    sheets = (sheetsData as Sheet[]) || []
  }

  // 6. Preparar Mapas de Agregación
  const currentMonthIndex = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  const hierarchyData: Record<string, HierarchySupervisor> = {}

  supervisorIds.forEach((sid: string) => {
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
        promesa: 0,
        fvc: 0,
        total: 0
      }
    }
  })

  if (sellers) {
    sellers.forEach((s: Seller) => {
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
            promesa: 0,
            fvc: 0,
            total: 0
          }
        }
      }
    })
  }

  const allMonths = new Set<string>()
  const allWeeks = new Set<string>()

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

      const seller = sellers?.find((s: Seller) => s.id === sheet.seller_id)
      if (!seller) return
      
      const sid = seller.created_by
      const sellerEntry = hierarchyData[sid]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      fetched.rows.forEach((row: RowData) => {
        const dn = row[dnCol || 'DN']?.trim()
        if (!dn) return

        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        if (rowMonth) allMonths.add(rowMonth)
        if (rowWeekNum) allWeeks.add(rowWeekNum)

        let match = false
        if (filterWeek) match = rowWeekNum === filterWeek
        else if (filterMonth) match = rowMonth === filterMonth
        else match = rowMonth === currentMonthName

        if (!match || !row[dnCol || 'DN']) return

        const estatus = (row[estatusCol || 'ESTATUS'] || '').trim().toUpperCase()
        const targetStats = sellerEntry.stats
        const targetTotals = hierarchyData[sid].totals

        // 3. Contar Status específicos e incrementar Total solo para estos casos
        if (estatus === 'AA') {
          targetStats.activacion_no_alta++
          targetTotals.activacion_no_alta++
          targetStats.total++
          targetTotals.total++
        } else if (estatus === 'ALTA') {
          targetStats.alta++
          targetTotals.alta++
          targetStats.total++
          targetTotals.total++
        } else if (estatus === 'NO ENROLADO') {
          targetStats.alta_no_enrolada++
          targetTotals.alta_no_enrolada++
          targetStats.total++
          targetTotals.total++
        } else if (estatus === 'CHARGE BACK') {
          targetStats.chargeback++
          targetTotals.chargeback++
          targetStats.total++
          targetTotals.total++
        } else if (estatus === 'SIN STATUS') {
          targetStats.sin_status++
          targetTotals.sin_status++
          targetStats.total++
          targetTotals.total++
        } else if (estatus === 'PROMESA DE VISITA') {
          targetStats.promesa++
          targetTotals.promesa++
          targetStats.total++
          targetTotals.total++
        }
      })
    }
  }))

  const finalSupervisors = Object.values(hierarchyData).map((supervisor: HierarchySupervisor) => {
    const sellersList = Object.values(supervisor.sellers).map((s: SellerStats) => {
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
    promesa: acc.promesa + curr.totals.promesa,
    total: acc.total + curr.totals.total
  }), { activacion_no_alta: 0, alta: 0, alta_no_enrolada: 0, sin_status: 0, chargeback: 0, promesa: 0, total: 0 })

  const grandConv = grandTotal.total > 0 ? Math.round((grandTotal.alta / grandTotal.total) * 100) : 0

  return NextResponse.json({
    selectedMonth: filterMonth || currentMonthName,
    selectedWeek: filterWeek || '',
    filterOptions: {
      months: Array.from(allMonths).sort((a,b) => MONTHS_ES.indexOf(a) - MONTHS_ES.indexOf(b)),
      weeks: Array.from(allWeeks).sort((a,b) => parseInt(a) - parseInt(b))
    },
    supervisors: finalSupervisors,
    grandTotal: { ...grandTotal, conv: `${grandConv}%` }
  })
}
