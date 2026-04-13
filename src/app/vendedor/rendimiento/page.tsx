import { getSellerSession } from '@/lib/auth/seller'
import { redirect } from 'next/navigation'
import SellerPerformanceModule from '@/components/dashboard/SellerPerformanceModule'
import { TrendingUp, Calendar, Target } from 'lucide-react'

export default async function SellerPerformancePage() {
  const session = await getSellerSession()
  if (!session || !session.id) redirect('/login')

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tight uppercase">Mi Rendimiento <span className="text-blue-600 italic">Efectivo</span></h1>
        </div>
        <p className="text-slate-500 text-[13px] font-medium max-w-2xl">
          Visualiza el resumen semanal y mensual de tus ventas, efectividad de FVC y altas aprobadas directamente desde tu base de datos sincronizada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</p>
                <p className="text-sm font-black text-[#0f172a]">Periodo Activo</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Calendar size={24} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes</p>
                <p className="text-sm font-black text-[#0f172a] uppercase">{new Date().toLocaleString('es-ES', { month: 'long' })}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Target size={24} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronización</p>
                <p className="text-sm font-black text-[#0f172a]">En Tiempo Real</p>
            </div>
        </div>
      </div>

      <SellerPerformanceModule sellerId={session.id} />
    </div>
  )
}
