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
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
  const otniel = profiles?.find(p => p.full_name?.includes('Otniel') || p.email?.includes('otniel'))
  
  if (!otniel) {
    console.log("Otniel profile not found")
    return
  }
  
  console.log(`Found Otniel: ${otniel.full_name} (${otniel.id})`)

  const { data: sellers } = await supabase.from('sellers').select('id, first_name, last_name').eq('created_by', otniel.id)
  if (!sellers || sellers.length === 0) {
    console.log("No sellers found for Otniel")
    return
  }

  console.log(`Found ${sellers.length} sellers for Otniel`)

  const { data: sheets } = await supabase.from('seller_sheets').select('*').in('seller_id', sellers.map(s => s.id))
  if (!sheets || sheets.length === 0) {
    console.log("No sheets found for Otniel's sellers")
    return
  }

  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  console.log(`Current Month (Caracas): ${currentMonthName}`)

  for (const sheet of sheets) {
    const seller = sellers.find(s => s.id === sheet.seller_id)
    console.log(`\nChecking Seller: ${seller.first_name} ${seller.last_name}`)
    
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
    
    if (fetched.success) {
      const headers = fetched.headers
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')

      console.log(`Headers found: MES=${mesCol}, DN=${dnCol}, SEMANA=${semanaCol}, DIA=${diaCol}`)

      fetched.rows.forEach((row, i) => {
        const dnValue = row[dnCol || 'DN']?.trim()
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')
        const rowDay = normalizeDay(row[diaCol || 'DIA DE LA VENTA'] || '')

        if (dnValue) {
          const matchMonth = rowMonth === currentMonthName
          console.log(`Row ${i+1}: DN=${dnValue} | Month=${rowMonth} | Week=${rowWeekNum} | Day=${rowDay} | MatchMonth=${matchMonth}`)
        }
      })
    }
  }
}

debug()
