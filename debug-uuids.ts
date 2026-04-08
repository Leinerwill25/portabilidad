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
  const { data: otnielProfile } = await supabase.from('profiles').select('*').ilike('full_name', '%Otniel%').single()
  console.log(`Otniel Profile found: ${otnielProfile?.id} (${otnielProfile?.full_name})`)

  const { data: sellers } = await supabase.from('sellers').select('*')
  const creates = Array.from(new Set(sellers?.map(s => s.created_by) || []))
  
  console.log("\nSellers Summary:")
  for (const cId of creates) {
    const count = sellers?.filter(s => s.created_by === cId).length
    const sample = sellers?.find(s => s.created_by === cId)
    console.log(`Creator ID: ${cId} | Count: ${count} | Sample: ${sample?.first_name} ${sample?.last_name}`)
  }

  const { data: assignments } = await supabase.from('coordinator_supervisors').select('*')
  console.log("\nAssignments Summary:")
  console.log(JSON.stringify(assignments, null, 2))
}

debug()
