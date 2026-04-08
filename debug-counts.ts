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
  const { data: sellers } = await supabase.from('sellers').select('created_by, first_name, last_name')
  if (!sellers) {
    console.log("No sellers found")
    return
  }

  const counts: Record<string, number> = {}
  sellers.forEach(s => {
    counts[s.created_by] = (counts[s.created_by] || 0) + 1
  })

  console.log("Sellers per CreatedBy ID:")
  for (const [id, count] of Object.entries(counts)) {
     const sample = sellers.find(s => s.created_by === id)
     console.log(`${id}: ${count} sellers (Sample: ${sample?.first_name} ${sample?.last_name})`)
  }
}

debug()
