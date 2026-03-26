import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener el mes actual en español y mayúsculas
  const currentMonthIndex = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]

  // 1. Obtener vendedores del usuario actual
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, first_name, last_name')
    .eq('created_by', user.id)

  if (sellersError) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  // 2. Obtener sheets vinculados
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url, display_name')
    .in('seller_id', sellers.map((s: { id: string }) => s.id))

  if (sheetsError) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  // 3. Procesar sheets en paralelo para agregar estadísticas
  const sellerStatsMap: Record<string, { 
    name: string, 
    ventas: number, 
    fvc: number, 
    altas: number 
  }> = {}

  // Inicializar mapa de vendedores
  sellers.forEach((s: { id: string, first_name: string, last_name: string }) => {
    sellerStatsMap[s.id] = {
      name: `${s.first_name} ${s.last_name}`,
      ventas: 0,
      fvc: 0,
      altas: 0
    }
  })

  await Promise.all(sheets.map(async (sheet: { seller_id: string, sheet_id: string, sheet_url: string }) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid)

    if (fetched.success && fetched.rows.length > 0) {
      const rows = fetched.rows
      
      // Encontrar nombres reales de columnas (insensible a mayúsculas)
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')

      const stats = sellerStatsMap[sheet.seller_id]
      if (!stats) return

      rows.forEach(row => {
        // Filtrar por mes actual
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        if (rowMonth !== currentMonthName) return

        // 1. Ventas: Si tiene DN válido
        if (row[dnCol || 'DN']) {
          stats.ventas++
        }

        // 2. FVC: Sumar si existe registro (o valor si es numérico)
        // Según el usuario, es la cantidad de FVC registrados en el mes
        if (row[fvcCol || 'FVC']) {
          stats.fvc++
        }

        // 3. Altas: Si el estatus es 'ALTA'
        const estatus = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
        if (estatus === 'ALTA') {
          stats.altas++
        }
      })
    }
  }))

  const sellerStatsList = Object.values(sellerStatsMap)
    .filter(s => s.ventas > 0 || s.fvc > 0 || s.altas > 0)
    .map(s => {
      const porcentajeAltas = s.fvc > 0 ? Math.round((s.altas / s.fvc) * 100) : 0
      return {
        ...s,
        porcentajeAltas: `${porcentajeAltas}%`,
        porcentajeRaw: porcentajeAltas
      }
    })

  // Global totals
  const global = sellerStatsList.reduce((acc, curr) => ({
    ventas: acc.ventas + curr.ventas,
    fvc: acc.fvc + curr.fvc,
    altas: acc.altas + curr.altas
  }), { ventas: 0, fvc: 0, altas: 0 })

  const globalPorcentaje = global.fvc > 0 ? Math.round((global.altas / global.fvc) * 100) : 0

  return NextResponse.json({
    month: currentMonthName,
    sellers: sellerStatsList,
    global: {
      ...global,
      porcentajeAltas: `${globalPorcentaje}%`
    }
  })
}
