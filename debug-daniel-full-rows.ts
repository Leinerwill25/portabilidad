import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1YU4LeyxmfiZPb5nkjWqyUAn8SVlBM__Oa2_wmlREAZk'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    console.log(`Rows: ${fetched.rows.length}`)
    fetched.rows.forEach((row, i) => {
       if (row['MES'] === 'ABRIL' || row['MES'] === 'MARZO') {
         console.log(`Row ${i+1}: DN='${row['DN']}' Month='${row['MES']}'`)
       }
    })
  }
}

debug()
