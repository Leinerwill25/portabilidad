import { createClient } from '@supabase/supabase-js'
import { fetchSheetAsCSV } from './src/lib/sheets/scraper'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL')!, getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')!)

async function check() {
  const { data: supervisor } = await supabase.from('profiles').select('id').ilike('full_name', '%Luis Y%').single()
  if (!supervisor) return console.log("Supervisor not found")

  const { data: sellers } = await supabase.from('sellers').select('*').eq('created_by', supervisor.id)
  if (!sellers) return console.log("No sellers found")

  for (const s of sellers) {
    const { data: sheets } = await supabase.from('seller_sheets').select('*').eq('seller_id', s.id)
    if (sheets && sheets.length > 0) {
      console.log(`Checking ${s.first_name}... SheetId: ${sheets[0].sheet_id}`)
      const fetched = await fetchSheetAsCSV(sheets[0].sheet_id, '0', true)
      if (fetched.success) {
        console.log(`  Headers: ${fetched.headers.slice(0, 15).join(' | ')}`)
        const fvcCol = fetched.headers.find(h => h.toUpperCase().includes('FVC'))
        console.log(`  FVC Column Found: ${fvcCol || 'NONE'}`)
      } else {
        console.log(`  Fetch Fail: ${fetched.error}`)
      }
    }
  }
}

check()
