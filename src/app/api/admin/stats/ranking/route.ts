import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

interface SellerRank {
  id: string
  name: string
  site: string
  fvc: number
  ventas: number
  altas: number
  conversion: number
}

interface SellerWithProfile {
  id: string
  first_name: string
  last_name: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

interface SheetData {
  seller_id: string
  sheet_id: string
  sheet_url: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodType = searchParams.get('periodType') || 'week' // 'day' | 'week' | 'month'
  const periodValue = searchParams.get('periodValue')
  const supervisorId = searchParams.get('supervisorId')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Determinar el dueño de los sellers (Supervisor)
  let targetOwnerId = user.id

  // Obtener el rol del usuario para validación
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const userRole = profile?.role

  if (supervisorId) {
    // Si se pasa un supervisorId, verificar si el usuario actual es coordinador y tiene permiso
    if (userRole === 'superadmin' || userRole === 'coordinator') {
      const { data: assignment } = await supabase
        .from('coordinator_supervisors')
        .select('*')
        .eq('coordinator_id', user.id)
        .eq('supervisor_id', supervisorId)
        .single()
      
      if (!assignment) {
        return NextResponse.json({ error: 'No tienes acceso a este supervisor' }, { status: 403 })
      }
      targetOwnerId = supervisorId
    } else if (user.id !== supervisorId) {
      return NextResponse.json({ error: 'No tienes permiso para ver otros supervisores' }, { status: 403 })
    }
  }

  // 2. Obtener los vendedores filtrados
  const query = supabase
    .from('sellers')
    .select(`
      id,
      first_name,
      last_name,
      profiles:created_by (
        full_name,
        email
      )
    `)

  if (userRole === 'admin' || supervisorId) {
    query.eq('created_by', targetOwnerId)
  }

  const { data: sellersData, error: sellersError } = await query as { data: SellerWithProfile[] | null, error: unknown }

  if (sellersError || !sellersData) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  // 2. Obtener sheets vinculados
  const { data: sheetsData, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('seller_id, sheet_id, sheet_url') as { data: SheetData[] | null, error: unknown }

  if (sheetsError || !sheetsData) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  // Mapa de resultados por vendedor (INCLUIR TODOS)
  const rankingMap: Record<string, SellerRank> = {}
  sellersData.forEach((s) => {
    rankingMap[s.id] = {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      site: s.profiles?.full_name || s.profiles?.email || 'N/A',
      fvc: 0,
      ventas: 0,
      altas: 0,
      conversion: 0
    }
  })

  // Listas de opciones dinámicas para el UI
  const availableWeeks = new Set<string>()
  const availableMonths = new Set<string>()
  const availableDays = new Set<string>()

  // 3. Procesar Sheets en paralelo
  await Promise.all(sheetsData.map(async (sheet) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const { rows, headers } = fetched
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const fechaCol = headers.find(h => ['FECHA', 'DÍA', 'DIA'].includes(h.trim().toUpperCase()))
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const vanCol = headers.find(h => h.trim().toUpperCase() === 'VAN')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')

      const rankEntry = rankingMap[sheet.seller_id]
      if (!rankEntry) return

      rows.forEach(row => {
        // 1. Extraer identificadores básicos de la fila
        const fvcVal = row[fvcCol || 'FVC']?.trim()
        const dnVal = row[dnCol || 'DN']?.trim()
        const vanVal = row[vanCol || 'VAN']?.trim().toUpperCase()
        const estatusVal = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()

        // 2. Determinar si la fila tiene datos reales (evitar filas vacías o leyendas)
        const hasData = (fvcVal && fvcVal !== '') || (dnVal && dnVal !== '') || (vanVal && vanVal !== '') || (estatusVal && estatusVal !== '')
        if (!hasData) return

        // 3. Extraer metadatos de tiempo
        const rowWeek = row[semanaCol || 'SEMANA']?.trim().replace(/\D/g, '')
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rowDayRaw = row[fechaCol || 'FECHA' || 'DIA' || 'DÍA']?.trim()
        
        let rowDay = ''
        if (rowDayRaw) {
          rowDay = rowDayRaw.split(' ')[0]
        }

        // 4. Poblar opciones disponibles solo si la fila es válida y la semana es razonable (1-53)
        if (rowWeek) {
          const wNum = parseInt(rowWeek)
          if (wNum > 0 && wNum <= 53) {
            availableWeeks.add(rowWeek)
          }
        }
        if (rowMonth && rowMonth.length > 2) availableMonths.add(rowMonth) // Evitar meses basura de 1-2 letras
        if (rowDay && rowDay.length >= 8) availableDays.add(rowDay) // Validar formato fecha mínima

        // 5. Lógica de coincidencia según periodType
        let matches = false
        if (periodType === 'week' && rowWeek === (periodValue || '')) matches = true
        if (periodType === 'month' && rowMonth === (periodValue || '').toUpperCase()) matches = true
        if (periodType === 'day' && rowDay === periodValue) matches = true
        
        if (!periodValue && periodType === 'week' && rowWeek === '1') matches = true 

        if (matches) {
          // Total FVC: Se usa como denominador para la conversión
          if (fvcVal && fvcVal !== '') {
            rankEntry.fvc++
          }

          // Total Ventas: Se calcula por la cantidad de DN registrados
          if (dnVal && dnVal !== '') {
            rankEntry.ventas++
          }

          // Altas (VAN): Marcación explícita
          if (vanVal === 'VAN' || vanVal === 'SI' || vanVal === '1' || vanVal === 'X' || estatusVal === 'ALTA') {
            rankEntry.altas++
          }
        }
      })
    }
  }))

  // Calcular conversión final para todos
  const rankingList = Object.values(rankingMap).map(r => ({
    ...r,
    conversion: r.fvc > 0 ? Math.round((r.altas / r.fvc) * 100) : 0
  }))

  return NextResponse.json({
    periodType,
    periodValue,
    availableWeeks: Array.from(availableWeeks).sort((a, b) => Number(a) - Number(b)),
    availableMonths: Array.from(availableMonths).sort(),
    availableDays: Array.from(availableDays).sort(),
    ranking: rankingList
  })
}
