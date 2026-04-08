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
  const { data: sellers } = await supabase.from('sellers').select('*').ilike('last_name', '%Briceño%')
  const edgar = sellers?.find(s => s.first_name.trim().includes('Edgar'))
  if (!edgar) return

  const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', edgar.id)
  if (!sheets || sheets.length === 0) return

  const sheet = sheets[0]
  const gid = extractGid(sheet.sheet_url)
  const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
  
  if (fetched.success) {
    const { headers, rows } = fetched
    const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
    const currentMonthName = MONTHS_ES[getLocalTimeDate().getMonth()]

    console.log(`System: '${currentMonthName}' | Codes: ${[...currentMonthName].map(c => c.charCodeAt(0))}`)

    rows.forEach((row, i) => {
      const rowMonthRaw = row[mesCol || 'MES']
      const rowMonth = rowMonthRaw?.trim().toUpperCase() || ''
      if (i < 5) { // Log first few rows
        const match = rowMonth === currentMonthName
        console.log(`Row ${i+1}: '${rowMonth}' | Codes: ${[...rowMonth].map(c => c.charCodeAt(0))} | Match: ${match}`)
      }
    })
  }
}

debug()
