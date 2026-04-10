import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  console.log('Testing Supabase Connection...')
  console.log('URL:', url)
  
  if (!url || !key) {
    console.error('Missing URL or KEY')
    return
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase.from('profiles').select('*').limit(1)

  if (error) {
    console.error('Database Error:', error)
  } else {
    console.log('Success! Data found:', data)
  }
}

test()
