import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, extractGid, getGoogleSheetsWeek } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

interface WeeklyData {
  week: string
  ventas: number
  fvc: number
  altas: number
  conversion: number
}

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const supervisorId = searchParams.get('supervisorId')
  const sellerId = searchParams.get('sellerId')
  const forceFresh = searchParams.get('force') === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Determine target site owner
  let targetOwnerId = user.id
  if (supervisorId && supervisorId !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'coordinator' || profile?.role === 'superadmin') {
      targetOwnerId = supervisorId
    }
  }

  // 2. Fetch ALL sellers for the supervisor (for the list in UI)
  const { data: allSellers, error: allSellersError } = await supabase
    .from('sellers')
    .select('id, first_name, last_name')
    .eq('created_by', targetOwnerId)

  if (allSellersError || !allSellers) {
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 })
  }

  // 3. Determine filtered sellers for stats
  let filteredSellerIds = allSellers.map((s: any) => s.id)

  if (sellerId && sellerId !== 'all') {
    // Support multiple IDs separated by commas
    const ids = sellerId.split(',').filter(id => id.trim() !== '')
    if (ids.length > 0) {
      filteredSellerIds = ids
    }
  }
  
  // 4. Get sheets for the filtered sellers
  const { data: sheets, error: sheetsError } = await supabase
    .from('seller_sheets')
    .select('id, seller_id, sheet_id, sheet_url')
    .in('seller_id', filteredSellerIds)

  if (sheetsError || !sheets) {
    return NextResponse.json({ error: 'Error al obtener sheets' }, { status: 500 })
  }

  const sellersTyped = allSellers as { id: string, first_name: string, last_name: string }[]


  // 4. Determine weeks (Last 15 weeks)
  const currentWeek = getGoogleSheetsWeek()
  const weeklyTargetRange = Array.from({ length: 15 }, (_, i) => String(currentWeek - i))
    .filter(w => parseInt(w) > 0)

  const statsMap: Record<string, WeeklyData> = {}
  weeklyTargetRange.forEach(w => {
    statsMap[w] = { week: w, ventas: 0, fvc: 0, altas: 0, conversion: 0 }
  })

  // 5. Process sheets
  const sheetsTyped = sheets as { id: string, seller_id: string, sheet_id: string, sheet_url: string }[]
  await Promise.all(sheetsTyped.map(async (sheet: any) => {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, forceFresh)

    if (fetched.success && fetched.rows.length > 0) {
      const { rows, headers } = fetched
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const semanaFvcCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA FVC')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const fvcCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
      const estatusCol = headers.find(h => h.trim().toUpperCase() === 'ESTATUS')

      rows.forEach(row => {
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')

        const rawWeekFvc = row[semanaFvcCol || 'SEMANA FVC']?.trim()
        const rowWeekFvcNum = rawWeekFvc && rawWeekFvc !== '' ? rawWeekFvc.replace(/\D/g, '') : rowWeekNum

        const dnVal = row[dnCol || 'DN']?.trim()
        
        // Count VENTAS based on SEMANA
        if (rowWeekNum && statsMap[rowWeekNum]) {
          if (dnVal) statsMap[rowWeekNum].ventas++
        }

        // Count FVC & ALTAS based on SEMANA FVC
        if (rowWeekFvcNum && statsMap[rowWeekFvcNum]) {
          const fvcRaw = row[fvcCol || 'FVC']?.trim().toUpperCase()
          const estatusRaw = row[estatusCol || 'ESTATUS']?.trim().toUpperCase()
          const isValidFvc = fvcRaw && fvcRaw !== 'NO' && !(fvcRaw === 'FVC' && estatusRaw === 'RECHAZO')

          if (isValidFvc) {
            statsMap[rowWeekFvcNum].fvc++
            if (estatusRaw === 'ALTA') {
              statsMap[rowWeekFvcNum].altas++
            }
          }
        }
      })
    }
  }))

  // 6. Calculate conversions
  const result = weeklyTargetRange.map(w => {
    const s = statsMap[w]
    s.conversion = s.fvc > 0 ? Math.round((s.altas / s.fvc) * 100) : 0
    return s
  }).reverse() // Order: w-2, w-1, Current

  // 7. Get sellers list for the filter
  const sellerList = sellersTyped.map((s: any) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`
  }))


  return NextResponse.json({
    weeks: result,
    vendedores: sellerList
  })
}
