import { fetchSheetAsCSV, extractGid } from './src/lib/sheets/scraper'

async function debug() {
  const sheetId = '1mseSOQTrUksSRghw6mnwv8cvwa-XQQ7V-W56fcjVz0w'
  const gid = '0'
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  
  const res = await fetch(url)
  const text = await res.text()
  console.log(`Raw Text Length: ${text.length}`)
  console.log(`Raw Text Sample (first 500 chars): ${JSON.stringify(text.slice(0, 500))}`)
  console.log(`Line separators found: \\n:${(text.match(/\n/g) || []).length}, \\r:${(text.match(/\r/g) || []).length}`)
}

debug()
