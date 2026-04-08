import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { fetchSheetAsCSV, extractGid, getLocalTimeDate } from './src/lib/sheets/scraper'

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
  // Edgar Briceño ID
  const sellerId = '77274673-d256-4fef-8bfc-0c174887881e'
  const { data: sheet } = await supabase.from('seller_sheets').select('*').eq('seller_id', sellerId).single()
  if (!sheet) return

  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  
  console.log(`System: '${currentMonthName}' | Codes: ${[...currentMonthName].map(c => c.charCodeAt(0))}`)

  const fetched = await fetchSheetAsCSV(sheet.sheet_id, extractGid(sheet.sheet_url), true)
  if (fetched.success) {
    const mesCol = fetched.headers.find(h => h.trim().toUpperCase() === 'MES')
    fetched.rows.forEach((row, i) => {
      const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase() || ''
      if (rowMonth) {
        const match = rowMonth === currentMonthName
        console.log(`Row ${i+1}: '${rowMonth}' | Codes: ${[...rowMonth].map(c => c.charCodeAt(0))} | Match: ${match}`)
      }
    })
  }
}

debug()
