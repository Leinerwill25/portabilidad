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
  const { data: sellers } = await supabase.from('sellers').select('*')
  if (!sellers) return

  const targetSellers = sellers.filter(s => 
    ['Daniel Mejias', 'Edgar Briceño'].includes(`${s.first_name} ${s.last_name}`)
  )

  for (const s of targetSellers) {
    const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', s.id)
    if (sheets) {
      for (const sh of sheets) {
        console.log(`Seller: ${s.first_name} ${s.last_name} | Sheet URL: ${sh.sheet_url}`)
      }
    }
  }
}

debug()
