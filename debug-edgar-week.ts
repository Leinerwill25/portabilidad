import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1mseSOQTrUksSRghw6mnwv8cvwa-XQQ7V-W56fcjVz0w'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    const semanaCol = fetched.headers.find(h => h.trim().toUpperCase() === 'SEMANA')
    fetched.rows.forEach((row, i) => {
      console.log(`Row ${i+1}: DN='${row['DN']}' Week='${row[semanaCol || 'SEMANA']}' Month='${row['MES']}'`)
    })
  }
}

debug()
