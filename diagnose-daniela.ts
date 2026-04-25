import { fetchSheetAsCSV, parseDateFlexible, cleanValue } from './src/lib/sheets/scraper'

async function diagnose() {
  const sheetId = '1rr9gTmWlLmeo9zBh9mrliBqANNUV1c3wUJhR-zdFQAE'
  const gid = '0'
  const fetched = await fetchSheetAsCSV(sheetId, gid, true)
  
  if (!fetched.success) {
    console.log("Error:", fetched.error)
    return
  }

  const startDate = new Date('2026-04-07T00:00:00')
  const endDate = new Date('2026-04-13T23:59:59')

  console.log("Headers:", fetched.headers)

  const rows = fetched.rows
  // Según el usuario, el rango es 165-194 (1-indexed suele ser, en 0-indexed es 164-193)
  const interestingRows = rows.slice(160, 200)

  console.log("Checking Rows 160-200...")
  
  const fvcDiaCol = findHeader(fetched.headers, ['FECHA DE LA CITA', 'FECHA CITA', 'CITA', 'FECHA ACTIVACION', 'FECHA FVC', 'DIA FVC', 'DÍA FVC', 'DIAFVC'])
  const fvcCol = findHeader(fetched.headers, ['FVC'])

  interestingRows.forEach((row, i) => {
    const rawDate = row[fvcDiaCol || '']
    const rawFvc = row[fvcCol || '']
    const parsed = rawDate ? parseDateFlexible(rawDate) : null
    
    let match = false
    if (parsed) {
      match = (parsed >= startDate && parsed <= endDate)
    }

    // Lógica secundaria de construcción de fecha
    let constructed = null
    if (!match && rawDate) {
      const dayMatch = rawDate.match(/(\d{1,2})/)
      if (dayMatch) {
         const dayNum = parseInt(dayMatch[1])
         // Asumimos ABRIL (mes 3) para este test
         constructed = new Date(2026, 3, dayNum)
         if (constructed >= startDate && constructed <= endDate) match = true
      }
    }

    console.log(`[Row ${160 + i + 1}] Date='${rawDate}' FVC='${rawFvc}' Parsed=${parsed?.toISOString().split('T')[0] || 'FAIL'} Match=${match}`)
  })
}

function findHeader(headers: string[], alternates: string[]) {
  return headers.find(h => {
    const cleanH = h.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
    return alternates.some(alt => {
      const cleanAlt = alt.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
      return cleanH === cleanAlt || cleanH.includes(cleanAlt)
    })
  })
}

diagnose()
