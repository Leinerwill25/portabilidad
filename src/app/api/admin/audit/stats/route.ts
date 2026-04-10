import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleSheetsWeek } from '@/lib/sheets/scraper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const week = parseInt(searchParams.get('week') || '')

  if (isNaN(week)) {
    return NextResponse.json({ error: 'Week parameter is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch only necessary columns for the current year
  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1).toISOString()

  const { data: searches, error } = await supabase
    .from('dn_searches')
    .select('dn_code, results, searched_at')
    .gte('searched_at', startOfYear)

  if (error) {
    console.error('API_STATS_DB_ERROR:', error)
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 })
  }

  // 1. Filter by Selected Week
  const weeklySearches = searches.filter(s => {
    const date = new Date(s.searched_at)
    return getGoogleSheetsWeek(date) === week
  })

  // 2. Deduplicate by DN: Keep only the most recent search for each DN within THIS week
  const seenDNs = new Set<string>()
  const uniqueSearchesRecent = weeklySearches.filter(s => {
    if (seenDNs.has(s.dn_code)) return false
    seenDNs.add(s.dn_code)
    return true
  })

  // 3. Aggregate Stats by Seller
  const stats: Record<string, { total: number, altas: number }> = {}
  
  uniqueSearchesRecent.forEach(s => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seller = (s.results as any[])?.[0]?.sellerName || 'N/A'
    if (!stats[seller]) stats[seller] = { total: 0, altas: 0 }
    
    stats[seller].total++
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasAlta = (s.results as any[])?.some(r => {
      const est = r.row?.ESTATUS?.toString().toUpperCase() || r.row?.Estatus?.toString().toUpperCase()
      return est === 'ALTA'
    })
    
    if (hasAlta) stats[seller].altas++
  })

  // 4. Format Result
  const sellerStats = Object.entries(stats)
    .map(([name, data]) => ({
      name,
      ...data,
      rate: data.total > 0 ? Math.round((data.altas / data.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({
    sellerStats,
    totalImpacted: uniqueSearchesRecent.length,
    week
  })
}
