import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseKey!)

async function debug() {
  console.log('--- START DEBUG ---')
  const { data: sellers, error: sError } = await supabase.from('sellers').select('*')
  if (sError) { console.log('Sellers Error:', sError); return }
  console.log(`Total Sellers: ${sellers.length}`)

  const target = sellers.find(s => s.first_name.includes('Edgar'))
  if (!target) { console.log('Target seller Edgar not found'); return }
  console.log(`Found: ${target.first_name} ${target.last_name} (${target.id})`)

  const { data: sheets, error: shError } = await supabase.from('seller_sheets').select('*').eq('seller_id', target.id)
  if (shError) { console.log('Sheets Error:', shError); return }
  console.log(`Sheets Count: ${sheets.length}`)

  for (const sh of sheets) {
    console.log(`Sheet: ${sh.display_name} | ID: ${sh.sheet_id}`)
    const url = `https://docs.google.com/spreadsheets/d/${sh.sheet_id}/export?format=csv&gid=0`
    try {
      const res = await fetch(url)
      const text = await res.text()
      const lines = text.split('\n')
      console.log(`CSV First Line: ${lines[0].substring(0, 500)}`)
      if (lines.length > 1) {
         console.log(`CSV Second Line: ${lines[1].substring(0, 500)}`)
      }
    } catch (e) {
      console.log('Fetch error:', e)
    }
  }
}

debug()
