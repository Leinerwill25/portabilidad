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
  const ids = ['0044adbd-6ce6-483a-ae33-ac0547154664', 'e591fed2-1937-481e-89bc-0965224b01a7', 'dbcf4ae4-818c-4f78-925e-c7a8fe54ee8b']
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
  console.log(JSON.stringify(profiles, null, 2))
}

debug()
