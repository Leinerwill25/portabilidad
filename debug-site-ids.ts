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
  const ids = Array.from(new Set(sellers?.map(s => s.created_by) || []))
  
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
  
  for (const id of ids) {
    const p = profiles?.find(prof => prof.id === id)
    const sCount = sellers?.filter(s => s.created_by === id).length
    console.log(`Profile: ${p?.full_name || p?.email || id} | ID: ${id} | Sellers: ${sCount}`)
  }
}

debug()
