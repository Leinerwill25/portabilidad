import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSheetAsCSV, searchDNInRows } from '@/lib/sheets/scraper'

export async function POST(req: NextRequest) {
  try {
    const { dns, week } = await req.json()
    
    if (!dns || !Array.isArray(dns)) {
      return NextResponse.json({ error: 'Lista de DNs inválida' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // 1. Get all sellers and their sheets
    // Note: We don't filter by week here because we want current status in Sheets
    const { data: sheets, error: sheetsError } = await supabase
      .from('seller_sheets')
      .select('*, sellers!inner(id, first_name, last_name)')
    
    if (sheetsError) throw sheetsError

    // 2. Fetch all unique sheets in parallel
    const sheetResults: Record<string, any> = {}
    
    await Promise.all(
      sheets.map(async (s) => {
        const fetched = await fetchSheetAsCSV(s.sheet_id, s.gid || '0', true)
        if (fetched.success) {
          sheetResults[s.id] = {
            rows: fetched.rows,
            sellerName: s.sellers ? `${s.sellers.first_name || ''} ${s.sellers.last_name || ''}`.trim() : 'S/N',
            dnCol: s.dn_column || 'DN'
          }
        }
      })
    )

    // 3. Re-validate each DN
    const validationMap: Record<string, any> = {}

    dns.forEach(dn => {
      const matches: any[] = []
      
      Object.entries(sheetResults).forEach(([sheetId, data]) => {
        const matchingRows = searchDNInRows(data.rows, dn, data.dnCol)
        matchingRows.forEach(row => {
          matches.push({
            sellerName: data.sellerName,
            row
          })
        })
      })

      validationMap[dn] = {
        results: matches,
        lastSyncedAt: new Date().toISOString()
      }
    })

    return NextResponse.json({ validationMap })

  } catch (error: any) {
    console.error('[AuditRevalidate] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
