'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  Award, 
  BarChart3, 
  RefreshCw,
  Loader2,
  CalendarDays,
  Target,
  ChevronRight
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PerformanceStat {
  ventas: number
  fvc: number
  altas: number
  pct: number
}

interface PerformanceData {
  month: string
  weeklyStats: Record<string, PerformanceStat>
  monthlyTotal: PerformanceStat
}

export default function SellerPerformanceModule({ sellerId }: { sellerId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPerformance = async (forceSearch = false) => {
    if (!forceSearch) setLoading(true)
    else setRefreshing(true)
    
    try {
      const res = await fetch(`/api/sellers/${sellerId}/performance${forceSearch ? '?force=true' : ''}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      }
    } catch (err) {
      console.error('Error fetching performance:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPerformance()
  }, [sellerId])

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-200 p-16 flex flex-col items-center justify-center gap-5 shadow-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 blur-2xl rounded-full opacity-50 animate-pulse" />
          <Loader2 className="animate-spin text-blue-600 relative z-10" size={40} />
        </div>
        <div className="text-center">
          <p className="text-[#1a2744] font-black text-[13px] uppercase tracking-[0.2em] mb-1">Analizando Datos</p>
          <p className="text-slate-400 text-[11px] font-bold">Generando reporte de rendimiento ejecutivo...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const weeks = Object.keys(data.weeklyStats)

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Executive Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-slate-50 rounded-full blur-[80px] opacity-60 group-hover:bg-indigo-50 transition-colors duration-1000" />
         
         <div className="relative z-10 flex items-center gap-5">
            <div className="h-14 w-14 bg-[#1a2744] text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-[#1a2744]/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <BarChart3 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-[22px] font-black text-[#1a2744] tracking-tight leading-none uppercase">
                  Rendimiento <span className="text-blue-600">Corporativo</span>
                </h2>
                <div className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded uppercase tracking-tighter">Live</div>
              </div>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <CalendarDays size={14} className="text-slate-300" />
                Periodo Actual: <span className="text-slate-600">{data.month} 2024</span>
              </p>
            </div>
         </div>

         <div className="relative z-10 flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Estado de Sincronización</p>
              <p className="text-[11px] font-bold text-emerald-500">ACTIVO Y ACTUALIZADO</p>
            </div>
            <button 
              onClick={() => fetchPerformance(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-[#f8fafc] hover:bg-white text-[#1a2744] text-[12px] font-bold rounded-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-50 shadow-sm hover:shadow-md group/btn"
            >
              <RefreshCw size={16} className={cn("transition-transform duration-700", refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180')} />
              Actualizar Base
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Weekly Progress Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeks.map((week, idx) => {
              const stat = data.weeklyStats[week]
              return (
                <motion.div 
                  key={week}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-slate-200 rounded-[28px] translate-y-2 opacity-20 group-hover:translate-y-3 transition-transform" />
                  <div className="relative bg-white rounded-[24px] border border-slate-200 overflow-hidden group-hover:border-blue-200 transition-colors">
                    {/* Week Header */}
                    <div className="bg-[#5a1e3c] p-4 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="h-5 w-5 bg-white/20 rounded flex items-center justify-center">
                            <CalendarDays size={12} className="text-white" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{week}</span>
                       </div>
                       <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-extrabold text-white/80 uppercase">Registro Semanal</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="p-6">
                       <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Ventas Totales</p>
                             <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-[#1a2744] tracking-tighter">{stat.ventas}</span>
                                <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-300 w-full opacity-30" />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">FVC Realizadas</p>
                             <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-slate-600 tracking-tighter">{stat.fvc}</span>
                                <div className={cn(
                                  "h-6 px-1.5 rounded flex items-center justify-center text-[10px] font-black",
                                  stat.pct >= 60 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                  {stat.pct}%
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Effectiveness Bar */}
                       <div className="relative bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10px] font-black text-[#5a1e3c] uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={12} />
                              Altas Efectivas
                            </p>
                            <span className="text-lg font-black text-[#5a1e3c]">{stat.altas}</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stat.pct}%` }}
                              className={cn(
                                "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                stat.pct >= 60 ? "bg-emerald-500" : "bg-amber-500"
                              )}
                            />
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Altas a Cobrar</span>
                             <span className="text-[13px] font-black text-[#1a2744] tracking-tight">{stat.altas} <span className="text-[9px] text-slate-300 ml-1">UNIDADES</span></span>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Sidebar Summaries */}
        <div className="lg:col-span-4 space-y-6">
           {/* Monthly Card */}
           <div className="bg-[#1a2744] rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-900/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600 rounded-full blur-[90px] opacity-20 group-hover:scale-125 transition-transform duration-1000" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.25em] mb-1">Resumen Mensual</h3>
                      <p className="text-2xl font-black tracking-tight">{data.month} 2024</p>
                   </div>
                   <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                      <Target size={24} className="text-blue-400" />
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-end justify-between border-b border-white/10 pb-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Ventas</p>
                        <p className="text-3xl font-black leading-none">{data.monthlyTotal.ventas}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Altas Cobrables</p>
                        <p className="text-3xl font-black text-emerald-400 leading-none">{data.monthlyTotal.altas}</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio de Conversión</span>
                         <span className={cn(
                           "text-sm font-black px-2 py-0.5 rounded",
                           data.monthlyTotal.pct >= 50 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                         )}>
                           {data.monthlyTotal.pct}%
                         </span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${data.monthlyTotal.pct}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            data.monthlyTotal.pct >= 50 ? "bg-emerald-500" : "bg-amber-500"
                          )}
                        />
                      </div>
                   </div>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                   <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                     <Award size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Estado Global</p>
                      <p className="text-[12px] font-black uppercase text-white/90">Vendedor Destacado</p>
                   </div>
                   <ChevronRight size={16} className="ml-auto text-slate-600" />
                </div>
              </div>
           </div>

           {/* Quick Fact Widget */}
           <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2 opacity-5 italic font-black text-[80px] leading-none select-none">FVC</div>
              <div className="relative z-10 flex items-center gap-4">
                 <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">?</div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dato de Interés</p>
                    <p className="text-[13px] font-medium text-slate-600 leading-tight">
                      Tu efectividad es <span className="font-black text-emerald-600">{(data.monthlyTotal.pct / 100).toFixed(1)}x</span> superior al promedio.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
