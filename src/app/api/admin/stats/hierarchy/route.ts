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

function findCol(headers: string[], aliases: string[]): string | undefined {
  const normalizedAliases = aliases.map(a => normalizeHeader(a))
  const normalizedHeaders = headers.map(h => normalizeHeader(h))

  // Prioridad 1: Coincidencia exacta respetando el orden de ALIAS
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex(nh => nh === alias)
    if (idx !== -1) return headers[idx]
  }

  // Prioridad 2: Inclusión parcial (alias contenido en header o viceversa)
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex(nh => nh.includes(alias) || alias.includes(nh))
    if (idx !== -1) return headers[idx]
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
  stats: {
    ventas: number
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
    ventas: number
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
    // Si es supervisor, solo se ve a sí mismo
    supervisorIds = [user.id]
  } else {
    // Si es coordinador o superadmin
    if (supervisorId) {
      // Verificar si tiene asignado a este supervisor
      if (supervisorId === user.id) {
        supervisorIds = [user.id]
      } else {
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
      }
    } else {
      // Obtener todos sus supervisores asignados
      const { data: assignments } = await supabase
        .from('coordinator_supervisors')
        .select('supervisor_id')
        .eq('coordinator_id', user.id)

      if (assignments && assignments.length > 0) {
        supervisorIds = (assignments as { supervisor_id: string[] }[]).map(a => a.supervisor_id as unknown as string)
      } else {
        supervisorIds = []
      }
      
      // Inyectar el ID del coordinador para mostrar a sus vendedores directos
      supervisorIds.push(user.id)
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
  
  // Helper para normalizar valores (quitar acentos, espacios, etc.)
  function cleanValue(v: string | undefined): string {
    if (!v) return ''
    return v.trim().toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '') // Mantener solo letras y números para máxima robustez
  }

  // 6. Preparar Firmas de Búsqueda por Rango (si aplica)
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

  // 6. Preparar Mapas de Agregación
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  const hierarchyData: Record<string, HierarchySupervisor> = {}

  supervisorIds.forEach((sid: string) => {
    const p = profiles?.find((prof: { id: string, full_name?: string | null, email?: string | null }) => prof.id === sid)
    hierarchyData[sid] = {
      id: sid,
      name: p?.full_name || p?.email || 'Supervisor Desconocido',
      sellers: {},
      totals: {
        ventas: 0,
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
            ventas: 0,
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
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const headers = fetched.headers
      const dnCol = findCol(headers, ['DN', 'CELULAR', 'TELEFONO', 'NUMERO', 'NRO', 'MSISDN', 'DN VENTA', 'CONTACTO', 'CEL'])
      const mesCol = findCol(headers, ['MES', 'MONTH', 'PERIODO', 'MES VENTA', 'MES ACTIVACION'])
      const statusCol = findCol(headers, ['ESTATUS', 'STATUS', 'ESTADO', 'ESTADO VENTA', 'RESULTADO'])
      
      // Búsqueda más flexible para la columna indicadora de FVC
      const fvcIndicatorCol = findCol(headers, ['FVC', 'INDICADOR FVC', 'FVC ']) || 'FVC'

      // Columnas temporales separadas - Alias extendidos
      const ventaDiaCol = findCol(headers, ['FECHA DE LA VENTA', 'FECHA DE VENTA', 'DÍA DE LA VENTA', 'FECHA VENTA', 'FECHA REGISTRO', 'FECHA', 'DIA VENTA', 'DIA'])
      const ventaSemanaCol = findCol(headers, ['SEMANA', 'WEEK', 'SEMANA VENTA'])
      
      const fvcDiaCol = findCol(headers, ['FECHA DE LA CITA', 'FECHA CITA', 'CITA', 'FECHA ACTIVACION', 'FECHA FVC', 'DIA FVC', 'DÍA FVC', 'DIAFVC', 'DIAL FVC', 'ACTIVACION'])
      const fvcSemanaCol = findCol(headers, ['SEMANA FVC', 'SEMANAFVC', 'WEEK FVC'])

      const seller = sellers?.find((s: Seller) => s.id === sheet.seller_id)
      if (!seller) return
      
      const sid = seller.created_by
      const sellerEntry = hierarchyData[sid]?.sellers[sheet.seller_id]
      if (!sellerEntry) return

      fetched.rows.forEach((row: RowData) => {
        const dn = row[dnCol || 'DN']?.trim()
        let rowMonth = cleanValue(row[mesCol || 'MES']) // Normalizado
        
        const rawWeekVenta = row[ventaSemanaCol || 'SEMANA']?.trim().replace(/\D/g, '')
        const rawWeekFvc = row[fvcSemanaCol || 'SEMANA FVC']?.trim().replace(/\D/g, '')
        
        const normWeekVenta = rawWeekVenta ? parseInt(rawWeekVenta).toString() : ''
        const normWeekFvc = rawWeekFvc ? parseInt(rawWeekFvc).toString() : ''

        if (normWeekVenta) allWeeks.add(normWeekVenta)
        if (normWeekFvc) allWeeks.add(normWeekFvc)

        // Helper para evaluar coincidencia temporal
        const checkMatch = (diaC: string | undefined, semRow: string | undefined) => {
          const rowDateStr = diaC ? row[diaC]?.trim() : ''
          const cleanedRowDayName = cleanValue(rowDateStr)
          const parsedRowDate = rowDateStr ? parseDateFlexible(rowDateStr) : null
          
          // Si no hay mes en la columna, intentamos sacarlo de la fecha
          if (!rowMonth && parsedRowDate) {
            rowMonth = MONTHS_ES[parsedRowDate.getMonth()]
          }
          
          const rawSemNum = semRow ? row[semRow]?.trim().replace(/\D/g, '') : ''
          const normSemNum = rawSemNum ? parseInt(rawSemNum).toString() : ''

          if (startDate && endDate) {
            // Comparación de cadenas pura (YYYY-MM-DD) para evitar desfases de zona horaria
            if (parsedRowDate) {
              const rowDateStrYYYY = toYYYYMMDD(parsedRowDate)
              if (rowDateStrYYYY) {
                return rowDateStrYYYY >= startDate && rowDateStrYYYY <= endDate
              }
            } 
            
            // 2. Intentar construir fecha a partir de Mes y Número de día (ej. "Lunes 13" -> 13)
            const dayMatch = rowDateStr?.match(/(\d{1,2})/)
            if (dayMatch && rowMonth) {
              const dayNum = parseInt(dayMatch[1])
              const monthIndex = MONTHS_ES.indexOf(rowMonth)
              if (monthIndex > -1) {
                const year = startDate.split('-')[0] || '2026'
                const constructedDate = new Date(parseInt(year), monthIndex, dayNum)
                const constructedStr = toYYYYMMDD(constructedDate)
                if (constructedStr) {
                  return constructedStr >= startDate && constructedStr <= endDate
                }
              }
            }

            // 3. Fallback: Comparación contra firmas normalizadas
            if (cleanedRowDayName && rowMonth) {
              return targetRangeSignatures.has(`${rowMonth}|${normSemNum}|${cleanedRowDayName}`)
            }
            return false
          } else if (filterWeek) {
            return normSemNum === filterWeek
          } else if (filterMonth) {
            return rowMonth === filterMonth
          } else {
            return rowMonth === currentMonthName
          }
        }

        const matchVenta = checkMatch(ventaDiaCol, ventaSemanaCol)
        const matchFvc = checkMatch(fvcDiaCol, fvcSemanaCol)

        // Registrar meses disponibles encontrados/derivados
        if (rowMonth) allMonths.add(rowMonth)

        const estatus = (row[statusCol || 'ESTATUS'] || '').trim().toUpperCase()
        const targetStats = sellerEntry.stats
        const targetTotals = hierarchyData[sid].totals

        // 1. Lógica de VENTAS y ALTAS (Filtro por VENTA)
        if (matchVenta && dn) {
          targetStats.ventas++
          targetTotals.ventas++

          if (estatus === 'ALTA') {
            targetStats.alta++
            targetTotals.alta++
          } else if (estatus === 'AA') {
            targetStats.activacion_no_alta++
            targetTotals.activacion_no_alta++
          } else if (estatus === 'NO ENROLADO') {
            targetStats.alta_no_enrolada++
            targetTotals.alta_no_enrolada++
          } else if (estatus === 'CHARGE BACK') {
            targetStats.chargeback++
            targetTotals.chargeback++
          } else if (estatus === 'SIN STATUS') {
            targetStats.sin_status++
            targetTotals.sin_status++
          } else if (estatus === 'PROMESA DE VISITA') {
            targetStats.promesa++
            targetTotals.promesa++
          }
        }

        // 2. Lógica Estricta de FVC (Filtro por CITA)
        // Solicidud: "TOTAL FVC el resultado se va a calcular pero siendo filtrada por la columna de 'FECHA DE LA CITA'"
        // Solicidud: "columna 'FVC' === 'FVC'"
        if (matchFvc) {
          const fvcValue = row[fvcIndicatorCol || '']?.trim().toUpperCase()
          if (fvcValue === 'FVC') {
            targetStats.total++ // En este dashboard 'total' representa el conteo de FVC
            targetTotals.total++
          }
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

  // 10. Consolidado Global
  const grandTotal = finalSupervisors.reduce((acc, curr) => ({
    ventas: acc.ventas + curr.totals.ventas,
    activacion_no_alta: acc.activacion_no_alta + curr.totals.activacion_no_alta,
    alta: acc.alta + curr.totals.alta,
    alta_no_enrolada: acc.alta_no_enrolada + curr.totals.alta_no_enrolada,
    sin_status: acc.sin_status + curr.totals.sin_status,
    chargeback: acc.chargeback + curr.totals.chargeback,
    promesa: acc.promesa + curr.totals.promesa,
    total: acc.total + curr.totals.total
  }), { ventas: 0, activacion_no_alta: 0, alta: 0, alta_no_enrolada: 0, sin_status: 0, chargeback: 0, promesa: 0, total: 0 })

  const grandConv = grandTotal.total > 0 ? Math.round((grandTotal.alta / grandTotal.total) * 100) : 0

  return NextResponse.json({
    debug_timestamp: new Date().toISOString(),
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
