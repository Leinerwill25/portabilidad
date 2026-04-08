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
  const targetId = 'e591fed2-1937-481e-89bc-0965224b016d'
  const { data: sellers } = await supabase.from('sellers').select('*').eq('created_by', targetId)
  console.log("Sellers for e591fed2:")
  console.log(JSON.stringify(sellers?.map(s => `${s.first_name} ${s.last_name}`), null, 2))
}

debug()
