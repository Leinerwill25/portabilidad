import { getSellerSession } from '@/lib/auth/seller'
import { createClient } from '@/lib/supabase/server'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Plus,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { extractSheetId, extractGid, fetchSheetAsCSV, parseDateFlexible } from '@/lib/sheets/scraper'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import SellerRecentRegisters from '@/components/vendedor/SellerRecentRegisters'

export default async function SellerDashboard() {
  // 1. Obtener sesión e info de la hoja en paralelo
  const [session, supabase] = await Promise.all([
    getSellerSession(),
    createClient()
  ])

  if (!session) return null

  const { data: sheet } = await supabase
    .from('seller_sheets')
    .select('sheet_url, sheet_id, script_url')
    .eq('seller_id', session.id)
    .single()

  let metrics = {
    weekly: 0,
    pending: 0,
    consolidated: 0,
    total: 0
  }

  // 2. Cargar datos reales con caché inteligente (2 min)
  let fetchedRows: any[] = []
  if (sheet) {
    const sheetId = extractSheetId(sheet.sheet_url) || sheet.sheet_id
    const gid = extractGid(sheet.sheet_url)
    
    // NOTA: Quitamos forceFresh: true para usar el caché de 2 min
    const fetched = await fetchSheetAsCSV(sheetId, gid, false)

    if (fetched.success) {
      fetchedRows = fetched.rows
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      metrics.total = fetched.rows.length
      
      for (const row of fetched.rows) {
        // Optimización: buscar columnas una sola vez o usar nombres conocidos
        const dateVal = row['FECHA'] || row['Fecha'] || row['fecha']
        const parsedDate = dateVal ? parseDateFlexible(dateVal) : null

        if (parsedDate && parsedDate >= oneWeekAgo) {
          metrics.weekly++
        }

        const fvcVal = row['DIA FVC'] || row['Dia FVC'] || row['FVC']
        if (fvcVal && fvcVal.trim() !== '' && fvcVal.trim().toLowerCase() !== 'no') {
          metrics.consolidated++
        } else {
          metrics.pending++
        }
      }
    }
  }

  const stats = [
    { 
      label: 'Ventas de la Semana', 
      value: metrics.weekly, 
      icon: TrendingUp, 
      color: 'blue',
      trend: '+12%',
      description: 'Últimos 7 días'
    },
    { 
      label: 'Registros Pendientes', 
      value: metrics.pending, 
      icon: Clock, 
      color: 'amber',
      trend: 'Atención',
      description: 'Sin gestión FVC'
    },
    { 
      label: 'FVC Consolidados', 
      value: metrics.consolidated, 
      icon: CheckCircle2, 
      color: 'emerald',
      trend: 'Excelente',
      description: 'Ventas verificadas'
    },
  ]

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Welcome */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#1a2744] p-10 lg:p-14 text-white shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
           <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-500/20">
                 <Calendar size={12} />
                 {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
              </div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
                 ¡Hola de nuevo, <span className="text-blue-400">{session.name.split(' ')[0]}</span>!
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                 Tu rendimiento hoy está un <span className="text-emerald-400 font-bold">15% por encima</span> del promedio. Tienes {metrics.pending} registros esperando gestión FVC.
              </p>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href={`/vendedor/nuevo-registro?sheetId=${sheet?.sheet_id}`}
                className="group relative flex items-center gap-4 bg-white text-[#1a2744] px-8 py-5 rounded-2xl font-black text-[15px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5"
              >
                <div className="w-10 h-10 bg-[#1a2744] text-white rounded-xl flex items-center justify-center group-hover:rotate-90 transition-transform">
                   <Plus size={20} />
                </div>
                Nueva Venta
                <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>
        </div>
      </section>

      {/* Grid de Estadísticas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="group bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all">
            <div className="flex items-start justify-between mb-8">
              <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                 <stat.icon size={28} />
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-${stat.color}-50 text-${stat.color}-600`}>
                 {stat.trend}
              </div>
            </div>
            
            <div className="space-y-1">
               <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                  {stat.value}
               </p>
               <h3 className="text-[14px] font-bold text-slate-500">{stat.label}</h3>
               <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-50 mt-4">{stat.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Secciones Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Historial / Seguimientos */}
        <section className="lg:col-span-2">
           {sheet && (
             <SellerRecentRegisters 
               rows={fetchedRows} 
               scriptUrl={sheet.script_url} 
               sheetId={sheet.sheet_id}
             />
           )}
        </section>

        {/* Herramientas & Conectividad */}
        <section className="space-y-6">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Database size={20} />
                 </div>
                 <h3 className="font-black text-[14px] uppercase tracking-wider">Base de Datos</h3>
              </div>
              
              <div className="space-y-4">
                 <div className="bg-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Estado Conexión</p>
                    <div className="flex items-center gap-2 font-bold text-sm">
                       <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                       Sincronizado vía Cloud
                    </div>
                 </div>
                 
                 {sheet?.sheet_url && (
                    <a 
                      href={sheet.sheet_url}
                      target="_blank"
                      className="w-full flex items-center justify-center gap-2 py-4 bg-white text-blue-700 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-blue-50 transition-all"
                    >
                       Explorar Hojas de Google
                    </a>
                 )}
              </div>
           </div>

           <div className="p-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
             <h4 className="font-black text-slate-900 text-[12px] uppercase tracking-widest mb-6">Soporte Directo</h4>
             <div className="space-y-4">
               <button className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                 <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-700">Reportar Problema</p>
                 <p className="text-[11px] text-slate-400">Incidencias con el formulario o sync.</p>
               </button>
             </div>
           </div>
        </section>
      </div>
    </div>
  )
}
