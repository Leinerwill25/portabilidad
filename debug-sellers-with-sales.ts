import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { fetchSheetAsCSV, extractGid, getLocalTimeDate, SheetRow } from './src/lib/sheets/scraper'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseKey!)

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

async function debug() {
  const currentMonthName = MONTHS_ES[getLocalTimeDate().getMonth()]
  console.log(`Current Month: ${currentMonthName}`)

  const { data: sheets } = await supabase.from('seller_sheets').select('*, sellers(first_name, last_name)')
  if (!sheets) return

  for (const sheet of sheets) {
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
    
    if (fetched.success) {
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      
      let salesCount = 0
      fetched.rows.forEach(row => {
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const dn = row[dnCol || 'DN']?.trim()
        if (dn && rowMonth === currentMonthName) salesCount++
      })

      if (salesCount > 0) {
        const s = sheet.sellers as any
        console.log(`Seller: ${s.first_name} ${s.last_name} | Sales: ${salesCount} | GID: ${gid} | URL: ${sheet.sheet_url}`)
      }
    }
  }
}

debug()
