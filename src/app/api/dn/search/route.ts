import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractGid, searchDNAcrossSheets } from '@/lib/sheets/scraper'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dnCode = searchParams.get('dn')?.trim()
  const weekOnly = searchParams.get('week') === 'true' // Desactivado por defecto para maximizar resultados

  if (!dnCode || dnCode.length < 2) {
    return NextResponse.json(
      { error: 'Ingresa al menos 2 caracteres para buscar' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Obtener todos los sheets registrados con info del vendedor
  const { data: sellerSheets, error: dbError } = await supabase
    .from('seller_sheets')
    .select(`
      id,
      sheet_id,
      sheet_url,
      sheet_name,
      display_name,
      sellers (
        id,
        first_name,
        last_name
      )
    `)

  if (dbError) {
    console.error('DATABASE_QUERY_ERROR:', JSON.stringify(dbError, null, 2))
    return NextResponse.json({ error: 'Error consultando la base de datos' }, { status: 500 })
  }

  if (!sellerSheets || sellerSheets.length === 0) {
    return NextResponse.json({
      results: [],
      message: 'No hay sheets registrados en el sistema',
      totalSheetsSearched: 0,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetsToSearch = (sellerSheets as unknown as any[] || []).map((s) => ({
    sheetId: s.sheet_id,
    gid: extractGid(s.sheet_url),
    displayName: s.display_name,
    sheetUrl: s.sheet_url,
    sellerName: s.sellers ? (Array.isArray(s.sellers) ? `${s.sellers[0]?.first_name} ${s.sellers[0]?.last_name}` : `${s.sellers.first_name} ${s.sellers.last_name}`) : 'Socio / Vendedor',
    dateColumn: 'FECHA ALTA', // Sincronizado con el spreadsheet del usuario
    dnColumn: 'DN',
  }))

  console.log(`Buscando en ${sheetsToSearch.length} sheets...`)

  // Ejecutar búsqueda en paralelo
  const { results, errors, totalSheetsSearched } = await searchDNAcrossSheets(
    sheetsToSearch,
    dnCode,
    weekOnly
  )

  // Guardar búsqueda en auditoría (sin bloquear la respuesta)
  supabase.from('dn_searches').insert({
    dn_code: dnCode,
    results: results,
    ip_address: request.headers.get('x-forwarded-for') ?? 'unknown',
  }).then(() => {}) // fire and forget

  return NextResponse.json({
    results,
    errors,
    totalSheetsSearched,
    dnCode,
    filteredByWeek: weekOnly,
  })
}
