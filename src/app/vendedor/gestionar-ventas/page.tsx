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
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
        {/* Breadcrumbs Premium */}
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
           <Link href="/vendedor/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Home size={12} /> Inicio
           </Link>
           <ChevronRight size={10} />
           <span className="text-slate-900 border-b-2 border-blue-600 pb-0.5">Gestión de Ventas</span>
        </div>

        <div className="flex flex-col gap-3">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full w-fit">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Panel de Control Live</span>
           </div>
           <h1 className="text-4xl font-black text-[#1a2744] tracking-tight uppercase leading-none">
             Gestión de <span className="text-blue-600">Estatus</span>
           </h1>
           <p className="text-slate-500 font-medium text-sm max-w-2xl leading-relaxed">
             Administra tus ventas registradas. Cambia el estatus en tiempo real para sincronizar con tu reporte mensual y el dashboard de coordinación.
           </p>
        </div>

        <SellerDailySalesManager 
          rows={rows} 
          scriptUrl={sheet?.script_url || null} 
          sheetId={sheet?.sheet_id || ''} 
        />
      </div>
    </div>
  )
}
