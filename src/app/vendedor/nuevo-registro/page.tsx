import { getSellerSession } from '@/lib/auth/seller'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DynamicRegistrationForm from '@/components/vendedor/DynamicRegistrationForm'
import { extractSheetId, extractGid, fetchSheetAsCSV } from '@/lib/sheets/scraper'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewRegistrationPage() {
  const session = await getSellerSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  
  // Obtener info de la hoja del vendedor
  const { data: sheet } = await supabase
    .from('seller_sheets')
    .select('sheet_url, sheet_id, script_url')
    .eq('seller_id', session.id)
    .single()

  if (!sheet) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="text-center">
           <h2 className="text-xl font-bold text-slate-900">Hoja no configurada</h2>
           <p className="text-slate-500 mt-2">Contacta a tu supervisor para vincular tu Excel.</p>
           <Link href="/vendedor/dashboard" className="mt-4 inline-block text-blue-600 font-bold hover:underline">Volver</Link>
        </div>
      </div>
    )
  }

  // Obtener las cabeceras con caché inteligente (10 min sería ideal, pero usamos los 2 min por defecto)
  const sheetId = extractSheetId(sheet.sheet_url) || sheet.sheet_id
  const gid = extractGid(sheet.sheet_url)
  const fetched = await fetchSheetAsCSV(sheetId, gid, false) // Ya no forzamos fresh

  return (
    <div className="space-y-10 pb-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1a2744] to-[#0f172a] p-10 lg:p-14 text-white shadow-2xl shadow-blue-900/10">
        <div className="max-w-3xl mx-auto flex items-center gap-6">
           <Link href="/vendedor/dashboard" className="p-4 bg-white/5 text-white rounded-2xl hover:bg-white/10 border border-white/10 transition-all group">
             <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
           </Link>
           <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-500/20">
                 PROCESO DE VENTA
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Nuevo Registro</h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">Completa todos los campos para sincronizar tu base de datos.</p>
           </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          {fetched.success ? (
            <DynamicRegistrationForm 
              headers={fetched.headers} 
              scriptUrl={sheet.script_url} 
              sellerName={session.name}
            />
          ) : (
            <div className="p-12 text-center">
              <p className="text-red-500 font-bold">Error al leer las columnas de tu Excel.</p>
              <p className="text-slate-500 text-sm mt-2">{fetched.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
