import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

// Need to import scraper functions manually or copy them
// To keep it simple, I'll just write a fetch function here
async function fetchSheet(sheetId: string, gid: string = '0') {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const res = await fetch(url)
  return await res.text()
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function debug() {
  console.log('Fetching sellers...')
  const { data: sellers } = await supabase.from('sellers').select('*')
  
  if (!sellers) {
    console.log('No sellers found (check RLS or key)')
    return
  }

  // Find Otniel
  const otniel = sellers.find(s => s.first_name.includes('Otniel') || s.last_name.includes('Contreras'))
  if (otniel) {
     console.log(`Found Otniel: ${otniel.id}`)
  }

  for (const s of sellers.slice(0, 10)) {
    const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', s.id)
    if (sheets && sheets.length > 0) {
      console.log(`Seller: ${s.first_name} ${s.last_name}`)
      for (const sh of sheets) {
        console.log(`  Sheet: ${sh.display_name} (${sh.sheet_id})`)
        const csv = await fetchSheet(sh.sheet_id)
        const headers = csv.split('\n')[0].split(',')
        console.log(`  Headers: ${headers.join(' | ')}`)
      }
    }
  }
}

debug()
