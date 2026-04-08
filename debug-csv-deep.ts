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
  const { data: sellers } = await supabase.from('sellers').select('*').ilike('first_name', '%Edgar%')
  if (!sellers || sellers.length === 0) return

  const seller = sellers[0]
  const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', seller.id)
  if (!sheets || sheets.length === 0) return

  const sheet = sheets[0]
  const gid = sheet.sheet_url.match(/[#&?]gid=(\d+)/)?.[1] || '0'
  const url = `https://docs.google.com/spreadsheets/d/${sheet.sheet_id}/export?format=csv&gid=${gid}`
  
  console.log(`Fetching from: ${url}`)
  const res = await fetch(url)
  const csv = await res.text()
  
  const lines = csv.split('\n')
  const headers = lines[0].split(',')
  console.log('Headers Count:', headers.length)
  headers.forEach((h, i) => console.log(`${i}: [${h.trim()}]`))

  if (lines.length > 1) {
    const row1 = lines[1].split(',')
    console.log('\nRow 1 Data:')
    row1.forEach((v, i) => console.log(`${i}: [${v.trim()}]`))
  }
}

debug()
