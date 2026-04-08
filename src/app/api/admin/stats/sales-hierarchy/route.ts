import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getLocalTimeDate } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

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
  totalVentas: number
}

interface HierarchySupervisor {
  id: string
  name: string
  sellers: Record<string, SellerStats>
  totalVentas: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filterMonth = searchParams.get('month')?.toUpperCase()
  const filterWeek = searchParams.get('week')
  const filterDay = searchParams.get('day')?.toUpperCase()
  const supervisorId = searchParams.get('supervisorId')
  const forceFresh = searchParams.get('force') === 'true'

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
    supervisorIds = [user.id]
  } else if (userRole === 'coordinator') {
    // If coordinator specifies a supervisor, just use that (after validation)
    if (supervisorId && supervisorId !== 'undefined' && supervisorId !== user.id) {
       supervisorIds = [supervisorId]
    } else {
      const { data: assignments } = await supabase
        .from('coordinator_supervisors')
        .select('supervisor_id')
        .eq('coordinator_id', user.id)
      
      if (assignments) {
        supervisorIds = assignments.map(a => a.supervisor_id)
      }
      
      if (!supervisorIds.includes(user.id)) {
        supervisorIds.push(user.id) // Incluir propios
      }
    }
  } else if (userRole === 'superadmin') {
    if (supervisorId && supervisorId !== 'undefined') {
      supervisorIds = [supervisorId]
    } else {
      const { data: allSupervisors } = await supabase.from('sellers').select('created_by')
      if (allSupervisors) {
        supervisorIds = Array.from(new Set(allSupervisors.map(s => s.created_by)))
      }
    }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', supervisorIds)

  const { data: sellersData } = await supabase
    .from('sellers')
    .select('id, first_name, last_name, created_by')
    .in('created_by', supervisorIds)
  
  const sellers = sellersData as Seller[] | null

  let sheets: Sheet[] = []
  if (sellers && sellers.length > 0) {
    const sellerIds = sellers.map(s => s.id)
    const { data: sheetsData } = await supabase
      .from('seller_sheets')
      .select('id, seller_id, sheet_id, sheet_url')
      .in('seller_id', sellerIds)
    sheets = (sheetsData as Sheet[]) || []
  }

  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  const hierarchyData: Record<string, HierarchySupervisor> = {}

  supervisorIds.forEach((sid: string) => {
    const p = profiles?.find((prof: { id: string, full_name?: string | null, email?: string | null }) => prof.id === sid)
    hierarchyData[sid] = {
      id: sid,
      name: p?.full_name || p?.email || 'Supervisor Desconocido',
      sellers: {},
      totalVentas: 0
    }
  })

  if (sellersData) {
    sellersData.forEach((s: Seller) => {
      const sid = s.created_by
      if (hierarchyData[sid]) {
        hierarchyData[sid].sellers[s.id] = {
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          totalVentas: 0
        }
      }
    })
  }

  const allMonths = new Set<string>()
  const allWeeks = new Set<string>()
  const allDays = new Set<string>()

  await Promise.all(sheets.map(async (sheet) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')

      const seller = sellers?.find((s: Seller) => s.id === sheet.seller_id)
      if (!seller) return
      
      const sid = seller.created_by
      const sellerEntry = hierarchyData[sid]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      // Month/Week propagation state
      let lastRowMonth = ''
      let lastRowWeek = ''

      fetched.rows.forEach((row: RowData) => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase() || lastRowMonth
        const rawWeek = row[semanaCol || 'SEMANA']?.trim() || lastRowWeek
        const rowWeekNum = rawWeek?.replace(/\D/g, '')
        const rowDay = normalizeDay(row[diaCol || 'DIA DE LA VENTA'] || '')

        // Update propagation state
        if (row[mesCol || 'MES']?.trim()) lastRowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        if (row[semanaCol || 'SEMANA']?.trim()) lastRowWeek = row[semanaCol || 'SEMANA']?.trim()

        const dn = row[dnCol || 'DN']?.trim()
         
        // If DN column exists but value is missing, skip row
        if (dnCol && !dn) return
        
        // If no DN column AND no metadata columns, skip
        if (!dnCol && !rowMonth && !rowWeekNum) return

        if (rowMonth) allMonths.add(rowMonth)
        if (rowWeekNum) allWeeks.add(rowWeekNum)
        
        if (rowDay) {
          if ((filterWeek && rowWeekNum === filterWeek) || (!filterWeek && rowMonth === currentMonthName)) {
            allDays.add(rowDay)
          }
        }

        let match = false

        if (filterDay) {
          match = true
          if (filterWeek && rowWeekNum !== filterWeek) match = false
          if (filterMonth && !filterWeek && rowMonth !== filterMonth) match = false
          if (rowDay !== normalizeDay(filterDay)) match = false
        } else if (filterWeek) {
          match = rowWeekNum === filterWeek
        } else if (filterMonth) {
          match = rowMonth === filterMonth
        } else {
          match = rowMonth === currentMonthName
        }

        if (!match) return

        // Incrementar Venta
        sellerEntry.totalVentas++
        hierarchyData[sid].totalVentas++
      })
    }
  }))

  const finalSupervisors = Object.values(hierarchyData).map((supervisor: HierarchySupervisor) => {
    const sellersList = Object.values(supervisor.sellers).sort((a, b) => b.totalVentas - a.totalVentas)
    return { ...supervisor, sellers: sellersList }
  }).sort((a, b) => b.totalVentas - a.totalVentas)

  const grandTotalVentas = finalSupervisors.reduce((acc, curr) => acc + curr.totalVentas, 0)

  // Order days naturally (Lunes, Martes, Miercoles...)
  const dayOrder = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']
  const sortedDays = Array.from(allDays).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

  return NextResponse.json({
    selectedMonth: filterMonth || currentMonthName,
    selectedWeek: filterWeek || '',
    selectedDay: filterDay || '',
    filterOptions: {
      months: Array.from(allMonths).sort((a,b) => MONTHS_ES.indexOf(a) - MONTHS_ES.indexOf(b)),
      weeks: Array.from(allWeeks).sort((a,b) => parseInt(a) - parseInt(b)),
      days: sortedDays
    },
    supervisors: finalSupervisors,
    grandTotal: grandTotalVentas
  })
}
