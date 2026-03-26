
import { fetchSheetAsCSV, extractGid, searchDNAcrossSheets } from './src/lib/sheets/scraper.ts'
import fs from 'fs'

async function debugSheet() {
  const sheetId = '1Pjo-fOwaecjepYpc0mcouT4m7OxOwIUCfzcrtvfDdtk'
  const gid = '0'
  const logFile = 'debug_log.txt'
  
  const log = (msg: string) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  if (fs.existsSync(logFile)) fs.unlinkSync(logFile)

  log(`Fetching raw sheet ${sheetId}...`)
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const response = await fetch(url)
  const text = await response.text()
  log('Raw CSV (first 500 chars): ' + text.substring(0, 500))

  const fetched = await fetchSheetAsCSV(sheetId, gid)

  if (!fetched.success) {
    log('Fetch failed: ' + fetched.error)
    return
  }

  log('Headers found: ' + JSON.stringify(fetched.headers))
  log('Total rows found: ' + fetched.rows.length)

  const testDNs = ['7533525130', '7531054325', '9991570194', '9612371720', '7121798543']

  for (const dn of testDNs) {
    const results = await searchDNAcrossSheets([{
      sheetId,
      gid,
      displayName: 'Debug',
      sellerName: 'Debug Seller',
      dateColumn: 'FECHA ALTA',
      dnColumn: 'DN'
    }], dn, true) // Activar filtro de semana para reproducir el error

    log(`DN ${dn}: ${results.results.length} matches found (with week filtering)`)
    
    const rowIdx = fetched.rows.findIndex(r => Object.values(r).some(v => v.includes(dn)))
    if (rowIdx !== -1) {
      const rawRow = fetched.rows[rowIdx]
      log(`  -> Row Index (Excel): ${rowIdx + 2}`)
      log(`  -> Full row data: ${JSON.stringify(rawRow)}`)
      
      const dateVal = rawRow['FECHA ALTA']
      log(`  -> FECHA ALTA raw: "${dateVal}"`)
      
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const s = String(dateVal || '').trim()
      const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
      if (dmyMatch) {
         const [, day, month, year] = dmyMatch
         const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
         log(`  -> Parsed date: ${d.toISOString()} | Matches week filter? ${d >= oneWeekAgo && d <= now}`)
      } else {
         log('  -> Date format NO coincide con el regex o está vacío')
      }
    }
  }
}

debugSheet()
