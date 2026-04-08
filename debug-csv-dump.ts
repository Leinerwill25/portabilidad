import * as fs from 'fs'
import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1mseSOwa-XQQ7V-W56fcjSVlBM__Oa2_wmlRREAZk-0'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    let out = "CSV Headers: " + fetched.headers.join(',') + "\n"
    fetched.rows.slice(0, 50).forEach((row, i) => {
      out += `Row ${i+1}: ${Object.values(row).join(',')}\n`
    })
    fs.writeFileSync('csv_dump.txt', out)
    console.log("Written csv_dump.txt")
  }
}

debug()
