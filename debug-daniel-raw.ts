import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1YU4LeyxmfiZPb5nkjWqyUAn8SVlBM__Oa2_wmlREAZk'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    console.log("CSV First 3 rows:")
    fetched.rows.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i+1}: DN='${row['DN']}' Month='${row['MES']}'`)
    })
  }
}

debug()
