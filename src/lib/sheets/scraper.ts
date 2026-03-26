const SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SheetRow {
  [key: string]: string
}

export interface DNSearchResult {
  sellerName: string
  sheetDisplayName: string
  sheetId: string
  sheetUrl?: string
  row: SheetRow
  rowIndex: number
}

export interface SheetFetchResult {
  success: boolean
  rows: SheetRow[]
  headers: string[]
  error?: string
}

// ─── Utilidad: extraer sheet ID de una URL de Google Sheets ──────────────────

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export function extractGid(url: string): string {
  const match = url.match(/[#&?]gid=(\d+)/)
  return match ? match[1] : '0'
}

// ─── Fetch del sheet como CSV (sin API key) ───────────────────────────────────

export async function fetchSheetAsCSV(
  sheetId: string,
  gid: string = '0'
): Promise<SheetFetchResult> {
  const url = `${SHEET_BASE_URL}/${sheetId}/export?format=csv&gid=${gid}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DNSearchBot/1.0)',
      },
      // Revalidar cada 5 minutos en el cache de Next.js
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      // Si falla CSV, intentar con gviz/tq (más permisivo)
      return await fetchSheetAsGviz(sheetId, gid)
    }

    const csvText = await response.text()
    return parseCSV(csvText)

  } catch (error) {
    console.error(`Error fetching sheet ${sheetId}:`, error)
    // Fallback al método gviz
    return await fetchSheetAsGviz(sheetId, gid)
  }
}

// ─── Método alternativo: gviz/tq (Google Visualization API, también público) ──

async function fetchSheetAsGviz(
  sheetId: string,
  gid: string = '0'
): Promise<SheetFetchResult> {
  const url = `${SHEET_BASE_URL}/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return {
        success: false,
        rows: [],
        headers: [],
        error: `HTTP ${response.status}: No se pudo acceder al sheet. ¿Está configurado como público?`,
      }
    }

    // Google retorna JSONP con prefijo: /*O_o*/\ngoogle.visualization.Query.setResponse({...})
    const text = await response.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')

    if (jsonStart === -1) {
      return { success: false, rows: [], headers: [], error: 'Respuesta inválida del sheet' }
    }

    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    return parseGvizResponse(json)

  } catch (error) {
    return {
      success: false,
      rows: [],
      headers: [],
      error: `Error de red: ${error instanceof Error ? error.message : 'Desconocido'}`,
    }
  }
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────

function parseCSV(csv: string): SheetFetchResult {
  const lines = csv.trim().split('\n').filter(Boolean)

  if (lines.length < 2) {
    return { success: false, rows: [], headers: [], error: 'El sheet está vacío' }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows: SheetRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: SheetRow = {}
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim()
    })
    // Ignorar filas completamente vacías
    if (Object.values(row).some(v => v !== '')) {
      rows.push(row)
    }
  }

  return { success: true, rows, headers }
}

// CSV parser que maneja comillas y comas dentro de campos
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ─── Parser gviz/tq JSON ──────────────────────────────────────────────────────

function parseGvizResponse(json: any): SheetFetchResult {
  try {
    const table = json?.table
    if (!table) return { success: false, rows: [], headers: [], error: 'Estructura inválida' }

    const headers: string[] = table.cols.map((col: any) => col.label || col.id)
    const rows: SheetRow[] = table.rows.map((row: any) => {
      const obj: SheetRow = {}
      row.c?.forEach((cell: any, idx: number) => {
        obj[headers[idx]] = cell?.v?.toString() ?? cell?.f ?? ''
      })
      return obj
    }).filter((row: SheetRow) => Object.values(row).some(v => v !== ''))

    return { success: true, rows, headers }
  } catch {
    return { success: false, rows: [], headers: [], error: 'Error al parsear respuesta gviz' }
  }
}

// ─── Filtrar por última semana ────────────────────────────────────────────────

export function filterLastWeek(rows: SheetRow[], dateColumn: string): SheetRow[] {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Encontrar el nombre real de la columna (insensible a mayúsculas/espacios)
  const findRealCol = (target: string, row: SheetRow) => {
    const keys = Object.keys(row)
    const exact = keys.find(k => k.trim().toUpperCase() === target.trim().toUpperCase())
    if (exact) return exact
    return keys.find(k => k.trim().toUpperCase().includes(target.trim().toUpperCase()))
  }

  return rows.filter(row => {
    const realDateCol = findRealCol(dateColumn, row) || dateColumn
    const dateStr = row[realDateCol]
    if (!dateStr) return false

    // Intentar parsear varios formatos de fecha comunes en Venezuela/LatAm
    const parsed = parseDateFlexible(dateStr)
    if (!parsed) return false

    return parsed >= oneWeekAgo && parsed <= now
  })
}

// Parser de fechas flexible (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
function parseDateFlexible(dateStr: string): Date | null {
  const s = dateStr.trim()

  // ISO: 2024-12-25
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  // DD/MM/YYYY o DD-MM-YYYY (formato Venezuela)
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(d.getTime()) ? null : d
  }

  // Intentar parse nativo como último recurso
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// ─── Búsqueda de DN ───────────────────────────────────────────────────────────

export function searchDNInRows(
  rows: SheetRow[],
  dnCode: string,
  dnColumnName: string = 'DN'
): SheetRow[] {
  const normalizedQuery = dnCode.trim().toUpperCase()

  // Encontrar el nombre real de la columna (insensible a mayúsculas/espacios)
  const findRealCol = (target: string, row: SheetRow) => {
    const keys = Object.keys(row)
    // Coincidencia exacta (trim + uppercase)
    const exact = keys.find(k => k.trim().toUpperCase() === target.trim().toUpperCase())
    if (exact) return exact
    // Coincidencia parcial (que contenga el target)
    return keys.find(k => k.trim().toUpperCase().includes(target.trim().toUpperCase()))
  }

  return rows.filter(row => {
    const realDnCol = findRealCol(dnColumnName, row) || dnColumnName
    const dnValue = row[realDnCol]?.toString().trim().toUpperCase()
    
    if (dnValue === normalizedQuery) return true

    // Búsqueda parcial: si el DN está contenido en alguna columna
    return Object.values(row).some(val =>
      val?.toString().trim().toUpperCase().includes(normalizedQuery)
    )
  })
}

// ─── Función principal: buscar DN en múltiples sheets ─────────────────────────

export async function searchDNAcrossSheets(
  sheets: Array<{
    sheetId: string
    gid: string
    displayName: string
    sellerName: string
    sheetUrl?: string
    dateColumn?: string // columna de fecha, por defecto 'FECHA'
    dnColumn?: string   // columna DN, por defecto 'DN'
  }>,
  dnCode: string,
  filterByWeek: boolean = true
): Promise<{
  results: DNSearchResult[]
  errors: Array<{ sheetId: string; error: string }>
  totalSheetsSearched: number
}> {
  const results: DNSearchResult[] = []
  const errors: Array<{ sheetId: string; error: string }> = []

  // Buscar en todos los sheets en PARALELO para máxima velocidad
  await Promise.all(
    sheets.map(async (sheet) => {
      const fetched = await fetchSheetAsCSV(sheet.sheetId, sheet.gid)

      if (!fetched.success) {
        errors.push({ sheetId: sheet.sheetId, error: fetched.error ?? 'Error desconocido' })
        return
      }

      let rowsToSearch = fetched.rows

      // Filtrar por última semana si se solicita
      if (filterByWeek) {
        const dateCol = sheet.dateColumn ?? 'FECHA'
        // Solo filtrar si existe la columna de fecha
        if (fetched.headers.includes(dateCol)) {
          rowsToSearch = filterLastWeek(rowsToSearch, dateCol)
        }
      }

      const dnCol = sheet.dnColumn ?? 'DN'
      const matchingRows = searchDNInRows(rowsToSearch, dnCode, dnCol)

      matchingRows.forEach((row, idx) => {
        results.push({
          sellerName: sheet.sellerName,
          sheetDisplayName: sheet.displayName,
          sheetId: sheet.sheetId,
          sheetUrl: sheet.sheetUrl,
          row,
          rowIndex: idx,
        })
      })
    })
  )

  return {
    results,
    errors,
    totalSheetsSearched: sheets.length,
  }
}
