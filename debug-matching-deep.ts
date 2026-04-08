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
  const otnielId = 'e591fed2-1937-481e-89bc-0965224b016d' // Based on my count script
  
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  console.log(`System Context: CurrentMonth=${currentMonthName}, Date=${getLocalTimeDate().toISOString()}`)

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', otnielId).single()
  console.log(`Target Profile: ${profile?.full_name || otnielId}`)

  const { data: sellers } = await supabase.from('sellers').select('id, first_name, last_name, created_by').eq('created_by', otnielId)
  if (!sellers) return

  const { data: sheets } = await supabase.from('seller_sheets').select('*').in('seller_id', sellers.map(s => s.id))
  if (!sheets) return

  for (const sheet of sheets) {
    const seller = sellers.find(s => s.id === sheet.seller_id)
    if (!seller) continue

    console.log(`\n--- Sheet for ${seller.first_name} ${seller.last_name} ---`)
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, gid, true)
    
    if (fetched.success) {
      const { headers, rows } = fetched
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      const semanaCol = headers.find(h => h.trim().toUpperCase() === 'SEMANA')
      const diaCol = headers.find(h => h.trim().toUpperCase() === 'DIA DE LA VENTA' || h.trim().toUpperCase() === 'DIA')

      console.log(`Headers found: MES=${mesCol}, DN=${dnCol}, SEMANA=${semanaCol}, DIA=${diaCol}`)

      let siteTotal = 0
      rows.forEach((row, i) => {
        const dn = row[dnCol || 'DN']?.trim()
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        const rawWeek = row[semanaCol || 'SEMANA']?.trim()
        const rowWeekNum = rawWeek?.replace(/\D/g, '')
        const rowDay = normalizeDay(row[diaCol || 'DIA DE LA VENTA'] || '')

        if (dn) {
           const match = rowMonth === currentMonthName
           if (match) siteTotal++
           console.log(`Row ${i+1}: DN=${dn} | Month=${rowMonth} | Week=${rowWeekNum} | Day=${rowDay} | MATCH=${match}`)
        }
      })
      console.log(`Site Total for this sheet: ${siteTotal}`)
    }
  }
}

debug()
