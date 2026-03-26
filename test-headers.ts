
import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function test() {
  const sheetId = '1Pjo-fOwaecjepYpc0mcouT4m7OxOwIUCfzcrtvfDdtk'
  const gid = '0'
  
  console.log('Fetching sheet headers...')
  const fetched = await fetchSheetAsCSV(sheetId, gid)
  
  if (fetched.success) {
    console.log('Headers:', fetched.headers)
    console.log('Sample Row:', fetched.rows[0])
  } else {
    console.log('Error:', fetched.error)
  }
}

test()
