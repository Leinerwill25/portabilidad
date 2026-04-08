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
  const targetId = 'e591fed2-1937-481e-89bc-0965224b016d'
  
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  console.log(`System Context: CurrentMonth=${currentMonthName}`)

  const { data: sellers } = await supabase.from('sellers').select('id, first_name, last_name').eq('created_by', targetId)
  if (!sellers || sellers.length === 0) {
    console.log("No sellers found for this ID")
    return
  }

  const { data: sheets } = await supabase.from('seller_sheets').select('*').in('seller_id', sellers.map(s => s.id))
  
  for (const sheet of sheets || []) {
    const seller = sellers.find(s => s.id === sheet.seller_id)
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
    
    if (fetched.success) {
      console.log(`\nSeller: ${seller.first_name} ${seller.last_name}`)
      const { headers, rows } = fetched
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      
      console.log(`Headers: MES=${mesCol}, DN=${dnCol}`)

      rows.forEach((row, i) => {
        const dnValue = row[dnCol || 'DN']?.trim()
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        if (dnValue) {
           const match = rowMonth === currentMonthName
           console.log(`Row ${i+1}: DN=${dnValue} | Month=${rowMonth} | Match=${match}`)
        }
      })
    }
  }
}

debug()
