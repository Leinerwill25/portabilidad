'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, TrendingUp, X, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

export default function SalesFloatingWidget() {
  const [data, setData] = useState<{ 
    totalToday: number; 
    supervisorName: string; 
    lastUpdate: string; 
    breakdown?: { name: string, total: number, sellers: { name: string, total: number }[] }[] 
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<number, boolean>>({})

  const fetchSales = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/stats/daily-sales${force ? '?force=true' : ''}`)
      if (!res.ok) throw new Error('Error al obtener ventas')
      const result = await res.json()
      setData(result)
      if (force) toast.success('Información actualizada en tiempo real')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo actualizar el contador')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSales()
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchSales(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSales])

  const toggleSupervisor = (idx: number) => {
    setExpandedSupervisors(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50, x: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50, x: 50 }}
        className="fixed bottom-6 right-6 z-[9999]"
      >
        <div className="relative group">
          {/* Main Card */}
          <div className="bg-[#0f172a] border-2 border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[250px] max-w-[300px] backdrop-blur-xl">
             {/* Close button */}
             <button 
               onClick={() => setIsVisible(false)}
               className="absolute -top-2 -right-2 h-6 w-6 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:text-white border border-white/5 transition-colors z-10"
             >
               <X size={14} />
             </button>

             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 shrink-0 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                      <TrendingUp size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ventas de Hoy</p>
                      <p className="text-2xl font-black text-white leading-none flex items-center gap-2">
                        {loading ? '...' : data?.totalToday ?? 0}
                        {data?.breakdown && data.breakdown.length > 0 && (
                          <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-slate-500 hover:text-white transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </p>
                   </div>
                </div>

                <button 
                  onClick={() => fetchSales(true)}
                  disabled={loading}
                  className={`h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-600/20 ${loading ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={18} />
                </button>
             </div>

             <AnimatePresence>
               {isExpanded && data?.breakdown && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="pt-2 mt-2 border-t border-white/5 flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                     {data.breakdown.map((b, idx) => {
                       const isSingleSupervisor = data.breakdown!.length === 1
                       const isSupExpanded = isSingleSupervisor || expandedSupervisors[idx]
                       const hasSellers = b.sellers && b.sellers.length > 0
                       return (
                         <div key={idx} className="flex flex-col gap-1">
                           {!isSingleSupervisor && (
                             <div 
                               className={`flex items-center justify-between text-sm ${hasSellers ? 'cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors' : ''}`}
                               onClick={() => hasSellers && toggleSupervisor(idx)}
                             >
                               <div className="flex items-center gap-1.5 overflow-hidden">
                                 <span className="text-slate-300 font-medium truncate" title={b.name}>{b.name}</span>
                               </div>
                               <div className="flex items-center gap-2 shrink-0">
                                 <span className="text-white font-bold">{b.total}</span>
                                 {hasSellers && (
                                   <span className="text-slate-500">
                                     {isSupExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                   </span>
                                 )}
                               </div>
                             </div>
                           )}
                           <AnimatePresence>
                             {hasSellers && isSupExpanded && (
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                 <div className={`py-1 flex flex-col gap-1.5 ${isSingleSupervisor ? '' : 'pl-3 border-l-2 border-white/5 ml-1 mt-1 mb-1'}`}>
                                   {b.sellers.map((s, sIdx) => (
                                     <div key={sIdx} className="flex items-center justify-between text-[11px]">
                                       <span className="text-slate-400 truncate" title={s.name}>{s.name}</span>
                                       <span className={`font-bold shrink-0 ml-2 ${s.total === 0 ? 'text-red-400/80' : 'text-emerald-400'}`}>{s.total}</span>
                                     </div>
                                   ))}
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       )
                     })}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {data?.lastUpdate && (
               <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider text-center mt-1">
                 Última actualización: {new Date(data.lastUpdate).toLocaleTimeString()}
               </p>
             )}
          </div>

          {/* Decorative Glow */}
          <div className="absolute inset-0 bg-blue-500/20 blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
