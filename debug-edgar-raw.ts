import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1mseSOQTrUksSRghw6mnwv8cvwa-XQQ7V-W56fcjVz0w'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    console.log(`Rows: ${fetched.rows.length}`)
    fetched.rows.forEach((row, i) => {
      console.log(`Row ${i+1}: DN='${row['DN']}' Month='${row['MES']}'`)
    })
  }
}

debug()
