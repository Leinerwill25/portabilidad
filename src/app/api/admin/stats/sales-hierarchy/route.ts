import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getLocalTimeDate, parseDateFlexible, getGoogleSheetsWeek, toYYYYMMDD } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

interface RowData {
  [key: string]: string | undefined
}

// Función robusta para normalizar cabeceras de Excel
function normalizeHeader(h: string): string {
  return h.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^A-Z0-9]/g, '')     // Quitar todo lo que no sea letra o número
}

function findCol(headers: string[], aliases: string[], reverse: boolean = false): string | undefined {
  const normalizedAliases = aliases.map(a => normalizeHeader(a))
  const normalizedHeaders = headers.map(h => normalizeHeader(h))

  const indices = reverse 
    ? Array.from({ length: headers.length }, (_, i) => headers.length - 1 - i)
    : Array.from({ length: headers.length }, (_, i) => i)

  // Prioridad 1: Coincidencia exacta respetando el orden de ALIAS
  for (const alias of normalizedAliases) {
    const idx = indices.find(i => normalizedHeaders[i] === alias)
    if (idx !== undefined) return headers[idx]
  }

  // Prioridad 2: Inclusión parcial
  for (const alias of normalizedAliases) {
    const idx = indices.find(i => {
      const nh = normalizedHeaders[i]
      return nh.includes(alias) || (alias.includes(nh) && nh.length > 3)
    })
    if (idx !== undefined) return headers[idx]
  }

  return undefined
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
  const filterDay = searchParams.get('day')?.toUpperCase() // e.g. "LUNES"
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
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
    const { data: assignments } = await supabase
      .from('coordinator_supervisors')
      .select('supervisor_id')
      .eq('coordinator_id', user.id)
    
    const assignedIds = assignments ? assignments.map(a => a.supervisor_id) : []
    if (!assignedIds.includes(user.id)) assignedIds.push(user.id)

    if (supervisorId && supervisorId !== 'undefined' && supervisorId !== user.id) {
       if (assignedIds.includes(supervisorId)) {
         supervisorIds = [supervisorId]
       } else {
         return NextResponse.json({ error: 'Supervisor no asignado' }, { status: 403 })
       }
    } else {
      supervisorIds = assignedIds
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

  // Helper para normalizar valores
  function cleanValue(v: string | undefined): string {
    if (!v) return ''
    return v.trim().toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
  }

  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  const targetRangeSignatures = new Set<string>()
  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const curr = new Date(start)
    while (curr <= end) {
      const mName = MONTHS_ES[curr.getMonth()]
      const wNum = getGoogleSheetsWeek(curr).toString()
      const dName = [
        'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'
      ][curr.getDay()]
      
      const cleanedDName = cleanValue(dName)
      targetRangeSignatures.add(`${mName}|${wNum}|${cleanedDName}`)
      curr.setDate(curr.getDate() + 1)
    }
  }

  const hierarchyData: Record<string, HierarchySupervisor> = {}

  supervisorIds.forEach((sid: string) => {
    const p = profiles?.find((prof) => prof.id === sid)
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
      const dnCol = findCol(headers, ['DN', 'CELULAR', 'TELEFONO', 'NUMERO', 'NRO', 'MSISDN', 'DN VENTA', 'CONTACTO', 'CEL'])
      const mesCol = findCol(headers, ['MES', 'MONTH', 'PERIODO', 'MES VENTA', 'MES ACTIVACION'])
      const semanaCol = findCol(headers, ['SEMANA', 'WEEK', 'SEMANA VENTA'])
      const diaCol = findCol(headers, ['FECHA DE LA VENTA', 'FECHA DE VENTA', 'DÍA DE LA VENTA', 'FECHA VENTA', 'FECHA REGISTRO', 'FECHA', 'DIA VENTA', 'DIA'])

      const seller = sellers?.find((s: Seller) => s.id === sheet.seller_id)
      if (!seller) return
      
      const sid = seller.created_by
      const sellerEntry = hierarchyData[sid]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      fetched.rows.forEach((row: RowData) => {
        const dn = row[dnCol || 'DN']?.trim()
        const rowMonth = cleanValue(row[mesCol || 'MES'])
        const rowWeekNum = row[semanaCol || 'SEMANA']?.trim().replace(/\D/g, '')
        const rowDayName = cleanValue(row[diaCol || 'DIA'])
        const parsedRowDate = parseDateFlexible(row[diaCol || 'FECHA'] || '')
        const rowYYYYMMDD = toYYYYMMDD(parsedRowDate)

        if (dnCol && !dn) return

        if (rowMonth) allMonths.add(rowMonth)
        if (rowWeekNum) allWeeks.add(rowWeekNum)
        
        // Populate days for the current context
        if (rowDayName) {
           if ((filterWeek && rowWeekNum === filterWeek) || (!filterWeek && rowMonth === currentMonthName)) {
             allDays.add(rowDayName)
           }
        }

        // --- Lógica de Match (Unificada con hierarchy/route.ts) ---
        const checkMatch = () => {
          if (startDate && endDate) {
            if (!parsedRowDate) return false
            if (rowYYYYMMDD && rowYYYYMMDD >= startDate && rowYYYYMMDD <= endDate) return true
            
            // Fallback: si el rango cubre días específicos por firma
            const sig = `${rowMonth}|${rowWeekNum}|${rowDayName}`
            if (targetRangeSignatures.has(sig)) return true
            
            return false
          } else if (filterDay) {
             const targetDay = cleanValue(filterDay)
             if (rowDayName !== targetDay) return false
             if (filterWeek) return rowWeekNum === filterWeek
             if (filterMonth) return rowMonth === filterMonth
             return rowMonth === currentMonthName
          } else if (filterWeek) {
            return rowWeekNum === filterWeek
          } else if (filterMonth) {
            return rowMonth === filterMonth
          } else {
            return rowMonth === currentMonthName
          }
        }

        if (checkMatch()) {
          sellerEntry.totalVentas++
          hierarchyData[sid].totalVentas++
        }
      })
    }
  }))

  const finalSupervisors = Object.values(hierarchyData).map((supervisor: HierarchySupervisor) => {
    const sellersList = Object.values(supervisor.sellers).sort((a, b) => b.totalVentas - a.totalVentas)
    return { ...supervisor, sellers: sellersList }
  }).sort((a, b) => b.totalVentas - a.totalVentas)

  const grandTotalVentas = finalSupervisors.reduce((acc, curr) => acc + curr.totalVentas, 0)

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
