
import { createClient } from './src/lib/supabase/server'

async function checkSchema() {
  const supabase = await createClient()
  
  console.log('--- Checking sellers ---')
  const { data: sellers } = await supabase.from('sellers').select('*').limit(1)
  if (sellers?.[0]) console.log(Object.keys(sellers[0]))
  
  console.log('--- Checking seller_sheets ---')
  const { data: sheets } = await supabase.from('seller_sheets').select('*').limit(1)
  if (sheets?.[0]) console.log(Object.keys(sheets[0]))
  
  console.log('--- Checking dn_searches ---')
  const { data: searches } = await supabase.from('dn_searches').select('*').limit(1)
  if (searches?.[0]) console.log(Object.keys(searches[0]))
}

checkSchema()
