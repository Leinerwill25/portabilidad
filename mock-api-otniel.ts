import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fetchSheetAsCSV, extractGid, getLocalTimeDate } from './src/lib/sheets/scraper'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseKey!)

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

async function runMockAPI(userId: string) {
  // SIMULAR LÓGICA DE API
  console.log(`Simulating Sales Hierarchy API for UserID: ${userId}`)
  
  const supervisorIds = [userId]
  const currentMonthIndex = getLocalTimeDate().getMonth()
  const currentMonthName = MONTHS_ES[currentMonthIndex]
  
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', supervisorIds)
  const { data: sellersData } = await supabase.from('sellers').select('id, first_name, last_name, created_by').in('created_by', supervisorIds)
  const sellers = sellersData || []

  const { data: sheetsData } = await supabase.from('seller_sheets').select('*').in('seller_id', sellers.map(s => s.id))
  const sheets = sheetsData || []

  console.log(`Found ${sellers.length} sellers and ${sheets.length} sheets`)

  const hierarchyData: any = {}
  supervisorIds.forEach((sid: string) => {
    const p = profiles?.find(prof => prof.id === sid)
    hierarchyData[sid] = {
      id: sid,
      name: p?.full_name || p?.email || sid,
      sellers: {},
      totalVentas: 0
    }
  })

  sellers.forEach((s: any) => {
    hierarchyData[s.created_by].sellers[s.id] = {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      totalVentas: 0
    }
  })

  for (const sheet of sheets) {
    const seller = sellers.find(s => s.id === sheet.seller_id)
    if (!seller) continue
    
    const sid = seller.created_by
    const sellerEntry = hierarchyData[sid].sellers[sheet.seller_id]
    
    console.log(`Processing Sheet for ${seller.first_name} ${seller.last_name}`)
    const fetched = await fetchSheetAsCSV(sheet.sheet_id, extractGid(sheet.sheet_url), true)
    
    if (fetched.success) {
      const { headers, rows } = fetched
      const mesCol = headers.find(h => h.trim().toUpperCase() === 'MES')
      const dnCol = headers.find(h => h.trim().toUpperCase() === 'DN')
      
      rows.forEach((row: any, i) => {
        const dn = row[dnCol || 'DN']?.trim()
        const rowMonth = row[mesCol || 'MES']?.trim().toUpperCase()
        
        if (dn) {
           if (rowMonth === currentMonthName) {
             sellerEntry.totalVentas++
             hierarchyData[sid].totalVentas++
           }
        }
      })
    }
  }

  console.log("\nFINAL HIERARCHY DATA:")
  console.log(JSON.stringify(hierarchyData, null, 2))
}

// Otniel ID: 0044adbd-6ce6-483a-ae33-ac0547154664 (creator of Briceño & Mejias)
runMockAPI('0044adbd-6ce6-483a-ae33-ac0547154664')
