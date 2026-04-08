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

  const targetSellers = sellers.filter(s => 
    ['Daniel Mejias', 'Genesis Briceño'].includes(`${s.first_name} ${s.last_name}`)
  )

  for (const s of targetSellers) {
    const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', s.id)
    if (sheets && sheets.length > 0) {
      console.log(`Seller: ${s.first_name} ${s.last_name}`)
      const csv = await fetchSheet(sheets[0].sheet_id)
      const lines = csv.split('\n')
      console.log(`  Headers: ${lines[0]}`)
      console.log(`  Row 1: ${lines[1] || 'EMPTY'}`)
    }
  }
}

debug()
