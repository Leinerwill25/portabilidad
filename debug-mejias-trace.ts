import { fetchSheetAsCSV, extractGid, getLocalTimeDate } from './src/lib/sheets/scraper'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

async function debug() {
  const currentMonthName = MONTHS_ES[getLocalTimeDate().getMonth()]
  const sheetId = '1YU4LeyxmfiZPb5nkjWqyUAn8SVlBM__Oa2_wmlREAZk'
  const gid = '0'
  
  console.log(`Fetching Daniel Mejias sheet: ${sheetId}`)
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    const { headers, rows } = fetched
    const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
    const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
    
    console.log(`Headers: MES=${mesCol}, DN=${dnCol}`)
    console.log(`Rows found: ${rows.length}`)

    rows.forEach((row, i) => {
      const dn = row[dnCol || 'DN']?.trim()
      const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
      if (dn && rowMonth === currentMonthName) {
         console.log(`Row ${i+1}: DN=${dn} | Month=${rowMonth} | MATCH=true`)
      }
    })
  } else {
    console.log("Fetch failed:", fetched.error)
  }
}

debug()
