import { getLocalTimeDate, getGoogleSheetsWeek } from './src/lib/sheets/scraper'

const now = getLocalTimeDate()
const week = getGoogleSheetsWeek(now)

console.log('--- Time Diagnostics ---')
console.log('Local Time (Caracas):', now.toString())
console.log('ISO String:', now.toISOString())
console.log('Year:', now.getFullYear())
console.log('Month (0-indexed):', now.getMonth()) 
console.log('Date:', now.getDate())
console.log('Day of Week (0-Sun):', now.getDay())
console.log('Calculated Google Sheets Week:', week)

// Special check for April 1st 2026
const target = new Date(2026, 3, 1) // April 1st
console.log('\n--- Specific Date Check: April 1, 2026 ---')
console.log('Date:', target.toDateString())
console.log('Calculated Week:', getGoogleSheetsWeek(target))
