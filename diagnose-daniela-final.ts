import { fetchSheetAsCSV, parseDateFlexible, toYYYYMMDD, getGoogleSheetsWeek } from './src/lib/sheets/scraper'

const MONTHS_ES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

function cleanVal(v: string | undefined): string {
  if (!v) return ''
  return v.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
}

async function diagnose() {
  const sheetId = '1rr9gTmWlLmeo9zBh9mrliBqANNUV1c3wUJhR-zdFQAE' // Daniela
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (!fetched.success) return console.log("Fetch Error")

  const startDate = '2026-04-07'
  const endDate = '2026-04-13'

  const headers = fetched.headers
  const mesCol = headers.find(h => h.toUpperCase().includes('MES'))
  const fvcIndicatorCol = headers.find(h => h.trim().toUpperCase() === 'FVC')
  const fvcDiaCol = headers.find(h => h.includes('CITA'))
  
  console.log(`Using columns: MES='${mesCol}' FVC_IND='${fvcIndicatorCol}' CITA='${fvcDiaCol}'`)

  let totalCount = 0
  
  fetched.rows.forEach((row, i) => {
    let rowMonth = cleanVal(row[mesCol || 'MES'])
    const rowDateStr = row[fvcDiaCol || '']?.trim()
    const parsedRowDate = rowDateStr ? parseDateFlexible(rowDateStr) : null
    
    if (!rowMonth && parsedRowDate) {
      rowMonth = MONTHS_ES[parsedRowDate.getMonth()]
    }

    const startStr = toYYYYMMDD(new Date(startDate + 'T12:00:00'))
    const endStr = toYYYYMMDD(new Date(endDate + 'T12:00:00'))

    let match = false
    if (parsedRowDate) {
      const rowDateStrYYYY = toYYYYMMDD(parsedRowDate)
      if (rowDateStrYYYY && startStr && endStr) {
        match = rowDateStrYYYY >= startStr && rowDateStrYYYY <= endStr
      }
    }

    const fvcValue = row[fvcIndicatorCol || '']?.trim().toUpperCase()
    const isFvc = fvcValue === 'FVC' || fvcValue === 'SI'

    if (match && isFvc) {
      totalCount++
    }

    // LOG DE FILAS INTERESANTES (1-indexed 165 a 194 son 0-indexed 164 a 193)
    const rowNum = i + 1
    if (rowNum >= 165 && rowNum <= 194) {
      console.log(`Row ${rowNum}: Date='${rowDateStr}' Parsed='${toYYYYMMDD(parsedRowDate)}' FVC='${fvcValue}' Match=${match} IsFvc=${isFvc}`)
    }
  })

  console.log("FINAL COUNT FOR DANIELA:", totalCount)
}

diagnose()
