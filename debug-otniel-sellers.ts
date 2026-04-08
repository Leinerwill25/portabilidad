import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

async function fetchSheet(sheetId: string, gid: string = '0') {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const res = await fetch(url)
  return await res.text()
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function debug() {
  const { data: sellers } = await supabase.from('sellers').select('*')
  if (!sellers) return

  const otniel = 'e22e865f-6a69-42b7-a36c-279262e3d8f2' // Otniel's ID from dashboard screenshot might be hard but I'll find by name
  const otnielSeller = sellers.find(s => s.first_name.includes('Otniel'))
  const otnielId = otnielSeller?.id

  // Sellers created by Otniel or where name matches screenshot
  const targetSellers = sellers.filter(s => 
    ['Daniel Mejias', 'Genesis Briceño', 'Fernanda Reynoso', 'Fernayle Reynoso', 'Edgar Briceño'].includes(`${s.first_name} ${s.last_name}`)
  )

  console.log(`Found ${targetSellers.length} target sellers`)

  for (const s of targetSellers) {
    const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', s.id)
    if (sheets && sheets.length > 0) {
      console.log(`Seller: ${s.first_name} ${s.last_name} (${s.id})`)
      for (const sh of sheets) {
        console.log(`  Sheet: ${sh.display_name} (${sh.sheet_id})`)
        const csv = await fetchSheet(sh.sheet_id)
        const firstLine = csv.split('\n')[0]
        console.log(`  Header Row: ${firstLine}`)
      }
    }
  }
}

debug()
