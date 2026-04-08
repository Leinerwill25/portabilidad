import { fetchSheetAsCSV, extractGid } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1mseSOwa-XQQ7V-W56fcjSVlBM__Oa2_wmlRREAZk-0'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    console.log("CSV Headers:", fetched.headers.join(','))
    fetched.rows.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i+1}: ${Object.values(row).join(',')}`)
    })
  }
}

debug()
