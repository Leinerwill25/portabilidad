import { getSellerSession } from '@/lib/auth/seller'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SellerDailySalesManager from '@/components/vendedor/SellerDailySalesManager'
import { fetchSheetAsCSV, extractGid, extractSheetId } from '@/lib/sheets/scraper'
import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'

export default async function ManageSalesPage() {
  const [session, supabase] = await Promise.all([
    getSellerSession(),
    createClient()
  ])

  if (!session) redirect('/login')

  // Obtener la hoja principal del vendedor
  const { data: sheet } = await supabase
    .from('seller_sheets')
    .select('*')
    .eq('seller_id', session.id)
    .single()

  let rows: any[] = []
  if (sheet) {
    const sheetId = extractSheetId(sheet.sheet_url) || sheet.sheet_id
    const gid = extractGid(sheet.sheet_url)
    const fetched = await fetchSheetAsCSV(sheetId, gid, true) // Forzar fresh para gestión directa
    if (fetched.success) {
      rows = fetched.rows
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumbs Premium */}
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
         <Link href="/vendedor/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <Home size={12} /> Inicio
         </Link>
         <ChevronRight size={10} />
         <span className="text-slate-900 border-b-2 border-blue-600 pb-0.5">Gestión de Ventas Diarias</span>
      </div>

      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-black text-[#1a2744] tracking-tight uppercase">Control de Estatus Diario</h1>
         <p className="text-slate-500 font-medium text-sm max-w-2xl">
           Administra tus registros de hoy de forma directa. Cambia el estatus de tus ventas para que se reflejen instantáneamente en tu reporte mensual y el dashboard de coordinación.
         </p>
      </div>

      <SellerDailySalesManager 
        rows={rows} 
        scriptUrl={sheet?.script_url || null} 
        sheetId={sheet?.sheet_id || ''} 
      />
    </div>
  )
}
