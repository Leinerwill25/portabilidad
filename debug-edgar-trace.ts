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

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

async function debug() {
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  console.log(`System Context: CurrentMonth=${currentMonthName}`)

  const { data: sellers } = await supabase.from('sellers').select('*').ilike('last_name', '%Briceño%')
  const edgar = sellers?.find(s => s.first_name.trim().includes('Edgar'))
  
  if (!edgar) {
    console.log("Edgar not found")
    return
  }
  
  console.log(`Found Edgar: ${edgar.first_name} ${edgar.last_name} (ID: ${edgar.id}, CreatedBy: ${edgar.created_by})`)

  const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', edgar.id)
  if (!sheets || sheets.length === 0) {
    console.log("No sheets found for Edgar")
    return
  }

  const sheet = sheets[0]
  const gid = extractGid(sheet.sheet_url)
  console.log(`Fetching sheet: ${sheet.sheet_id} (GID: ${gid})`)
  
  const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
  if (!fetched.success) {
    console.log("Fetch failed:", fetched.error)
    return
  }

  const { headers, rows } = fetched
  const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
  const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
  const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')
  
  console.log(`Headers: MES=${mesCol}, DN=${dnCol}, DIA=${diaCol}`)

  rows.forEach((row, i) => {
    const dnValue = row[dnCol || 'DN']?.trim()
    const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
    const rowDay = normalizeDay(row[diaCol || 'DIA DE LA VENTA'] || '')

    if (dnValue) {
       const matchMonth = rowMonth === currentMonthName
       console.log(`Row ${i+1}: DN=${dnValue} | Month=${rowMonth} | Day=${rowDay} | MatchMonth=${matchMonth}`)
       if (!matchMonth) {
         console.log(`  DEBUG: rowMonth char codes: ${[...rowMonth].map(c => c.charCodeAt(0))}`)
         console.log(`  DEBUG: currentMonthName char codes: ${[...currentMonthName].map(c => c.charCodeAt(0))}`)
       }
    }
  })
}

debug()
