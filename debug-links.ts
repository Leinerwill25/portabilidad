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
  const creates = Array.from(new Set(sellers?.map(s => s.created_by) || []))
  
  for (const cId of creates) {
    const sIds = sellers?.filter(s => s.created_by === cId).map(s => s.id) || []
    const { data: sheets } = await supabase.from('seller_sheets').select('*').in('seller_id', sIds)
    console.log(`\nCreator ${cId}:`)
    sheets?.forEach(sh => {
      const s = sellers?.find(sel => sel.id === sh.seller_id)
      console.log(`  Seller: ${s?.first_name} | SheetID: ${sh.sheet_id} | GID: ${sh.sheet_url.match(/gid=(\d+)/)?.[1] || '0'}`)
    })
  }
}

debug()
