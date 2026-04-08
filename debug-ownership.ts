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
  const { data: sellers } = await supabase.from('sellers').select('id, first_name, last_name, created_by')
  if (!sellers) return

  const targetSellers = sellers.filter(s => 
    ['Daniel Mejias', 'Edgar Briceño'].includes(`${s.first_name} ${s.last_name}`)
  )

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')

  for (const s of targetSellers) {
    const creator = profiles?.find(p => p.id === s.created_by)
    console.log(`Seller: ${s.first_name} ${s.last_name} | Created By: ${creator?.full_name || creator?.email || s.created_by}`)
  }
}

debug()
