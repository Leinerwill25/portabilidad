import { fetchSheetAsCSV, extractGid, getLocalTimeDate } from './src/lib/sheets/scraper'

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

function normalizeDay(day: string): string {
  if (!day) return ''
  return day.trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

async function debug() {
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  console.log(`System Context: CurrentMonth=${currentMonthName}`)

  const sheetId = '1mseSOQTrUksSRghw6mnwv8cvwa-XQQ7V-W56fcjVz0w'
  const gid = '0'
  
  console.log(`Fetching correct sheet: ${sheetId}`)
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (fetched.success) {
    const { headers, rows } = fetched
    const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
    const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
    
    console.log(`Headers: MES=${mesCol}, DN=${dnCol}`)

    rows.forEach((row, i) => {
      const dn = row[dnCol || 'DN']?.trim()
      const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
      
      if (dn) {
         const match = rowMonth === currentMonthName
         console.log(`Row ${i+1}: DN=${dn} | Month=${rowMonth} | MATCH=${match}`)
      }
    })
  } else {
    console.log("Fetch failed:", fetched.error)
  }
}

debug()
