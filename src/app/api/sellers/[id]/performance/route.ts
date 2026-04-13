import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid } from '@/lib/sheets/scraper'
import { getSellerSession } from '@/lib/auth/seller'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

function normalize(str: string): string {
  if (!str) return ''
  return str.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface PerformanceStat {
  ventas: number
  fvc: number
  altas: number
  pct: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sellerId } = await params
  const { searchParams } = new URL(request.url)
  const forceFresh = searchParams.get('force') === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sellerSession = await getSellerSession()

  // Permitir si es Admin/Supervisor (Supabase User) o si es el Propio Vendedor (Seller Session)
  const isSupabaseAuthorized = !!user
  const isSellerAuthorized = sellerSession && sellerSession.id === sellerId

  if (!isSupabaseAuthorized && !isSellerAuthorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Obtener sheets del vendedor
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('*')
    .eq('seller_id', sellerId)

  if (sheetsError || !sheets) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  const currentMonthIdx = new Date().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIdx]

  const weeklyStats: Record<string, PerformanceStat> = {}
  let monthlyTotal: PerformanceStat = { ventas: 0, fvc: 0, altas: 0, pct: 0 }

  await Promise.all(sheets.map(async (sheet) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const { rows, headers } = fetched
      const mesCol = headers.find(h => normalize(h) === 'MES')
      const semanaCol = headers.find(h => normalize(h) === 'SEMANA')
      const fvcCol = headers.find(h => normalize(h) === 'FVC')
      const estatusCol = headers.find(h => normalize(h) === 'ESTATUS')
      const dnCol = headers.find(h => normalize(h) === 'DN')

      rows.forEach(row => {
        const rowMes = normalize(row[mesCol || 'MES'] || '')
        const dn = row[dnCol || 'DN']?.trim()

        // Filtrar por mes actual
        if (rowMes !== currentMonthName) return
        if (dnCol && !dn) return // Fila vacía

        const rawSemana = row[semanaCol || 'SEMANA']?.trim().toUpperCase() || 'S/W'
        const semanaKey = rawSemana.includes('SEMANA') ? rawSemana : `SEMANA ${rawSemana}`
        
        if (!weeklyStats[semanaKey]) {
          weeklyStats[semanaKey] = { ventas: 0, fvc: 0, altas: 0, pct: 0 }
        }

        const fvcRaw = row[fvcCol || 'FVC']?.trim().toUpperCase()
        const estatusRaw = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
        const isValidFvc = fvcRaw && fvcRaw !== 'NO' && !(fvcRaw === 'FVC' && estatusRaw === 'RECHAZO')

        // Incrementar Ventas (Total filas del mes)
        weeklyStats[semanaKey].ventas++
        monthlyTotal.ventas++

        if (isValidFvc) {
          weeklyStats[semanaKey].fvc++
          monthlyTotal.fvc++
          
          if (estatusRaw === 'ALTA') {
            weeklyStats[semanaKey].altas++
            monthlyTotal.altas++
          }
        }
      })
    }
  }))

  // Calcular porcentajes
  Object.keys(weeklyStats).forEach(key => {
    const s = weeklyStats[key]
    s.pct = s.fvc > 0 ? Math.round((s.altas / s.fvc) * 100) : 0
  })
  monthlyTotal.pct = monthlyTotal.fvc > 0 ? Math.round((monthlyTotal.altas / monthlyTotal.fvc) * 100) : 0

  return NextResponse.json({
    month: currentMonthName,
    weeklyStats: Object.keys(weeklyStats)
      .sort()
      .reduce((obj, key) => {
        obj[key] = weeklyStats[key]
        return obj
      }, {} as Record<string, PerformanceStat>),
    monthlyTotal
  })
}
