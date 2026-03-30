'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'

export default function SalesFloatingWidget() {
  const [data, setData] = useState<{ totalToday: number; lastUpdate: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

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
          <div className="bg-[#0f172a] border-2 border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[200px] backdrop-blur-xl">
             {/* Close button */}
             <button 
               onClick={() => setIsVisible(false)}
               className="absolute -top-2 -right-2 h-6 w-6 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:text-white border border-white/5 transition-colors"
             >
               <X size={14} />
             </button>

             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                      <TrendingUp size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ventas de Hoy</p>
                      <p className="text-2xl font-black text-white leading-none">
                        {loading ? '...' : data?.totalToday ?? 0}
                      </p>
                   </div>
                </div>

                <button 
                  onClick={() => fetchSales(true)}
                  disabled={loading}
                  className={`h-10 w-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-600/20 ${loading ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={18} />
                </button>
             </div>

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
