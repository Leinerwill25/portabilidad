import { fetchSheetAsCSV } from './src/lib/sheets/scraper'

async function dump() {
  const fetched = await fetchSheetAsCSV('1rr9gTmWlLmeo9zBh9mrliBqANNUV1c3wUJhR-zdFQAE', '0', true)
  if (fetched.success) {
    fetched.headers.forEach((h, i) => console.log(`${i}: ${h}`))
  }
}
dump()
