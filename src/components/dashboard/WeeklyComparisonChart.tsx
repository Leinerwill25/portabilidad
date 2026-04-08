'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  Users,
  LayoutGrid,
  Info,
  Camera
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface WeeklyData {
  week: string
  ventas: number
  fvc: number
  altas: number
  conversion: number
}

interface Seller {
  id: string
  name: string
}

interface WeeklyComparisonChartProps {
  supervisorId?: string
}

const METRICS = [
  { id: 'ventas', label: 'Ventas', color: '#2563eb', bg: 'bg-blue-600', gradient: 'url(#grad-ventas)' },
  { id: 'altas', label: 'Altas', color: '#059669', bg: 'bg-emerald-600', gradient: 'url(#grad-altas)' },
  { id: 'conversion', label: 'Conversión', color: '#d97706', bg: 'bg-amber-600', gradient: 'url(#grad-conversion)' }
]

export default function WeeklyComparisonChart({ supervisorId }: WeeklyComparisonChartProps) {
  const [data, setData] = useState<WeeklyData[]>([])
  const [vendedores, setVendedores] = useState<Seller[]>([])
  const [selectedSellers, setSelectedSellers] = useState<string[]>(['all'])
  const [highlightMetric, setHighlightMetric] = useState('altas')
  const [loading, setLoading] = useState(true)
  const [showSellerList, setShowSellerList] = useState(false)

  const fetchData = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const sellerIdParam = selectedSellers.includes('all') ? 'all' : selectedSellers.join(',')
      const url = `/api/admin/stats/weekly-comparison?supervisorId=${supervisorId || ''}&sellerId=${sellerIdParam}`
      const response = await fetch(url, { signal })
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const json = await response.json()
      if (json.weeks) {
        setData(json.weeks)
        if (vendedores.length === 0 || selectedSellers.includes('all')) {
          setVendedores(json.vendedores || [])
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error fetching weekly comparison:', error)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [selectedSellers, supervisorId])


  const toggleSeller = (id: string) => {
    if (id === 'all') {
      setSelectedSellers(['all'])
      return
    }

    const withoutAll = selectedSellers.filter(s => s !== 'all')
    if (withoutAll.includes(id)) {
      const next = withoutAll.filter(s => s !== id)
      setSelectedSellers(next.length === 0 ? ['all'] : next)
    } else {
      setSelectedSellers([...withoutAll, id])
    }
  }

  // Safe maxVal calculation
  const maxVal = data.length > 0 
    ? Math.max(...data.map(d => Math.max(d.ventas, d.altas, d.conversion, 1)))
    : 1

  // Smooth Silk Path
  const getSilkPath = (pts: {x: number, y: number}[]) => {
    if (pts.length < 2) return ''
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`
    const [p0, p1, p2] = pts
    return `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`
  }

  return (
    <div id="weekly-chart" className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <LayoutGrid size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Rendimiento Temporal</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comparativo Semanal</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Seller Multi-Filter */}
          <div className="relative w-full lg:w-64">
            <button
              onClick={() => setShowSellerList(!showSellerList)}
              className={`w-full flex items-center justify-between pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl text-[12px] font-bold text-slate-700 transition-all shadow-sm hover:shadow-md ${showSellerList ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Users size={16} />
              </div>
              <span className="truncate">
                {selectedSellers.includes('all') 
                  ? 'Todo el Equipo' 
                  : selectedSellers.length === 1 
                  ? vendedores.find(v => v.id === selectedSellers[0])?.name || '1 Seleccionado'
                  : `${selectedSellers.length} Seleccionados`}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${showSellerList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showSellerList && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowSellerList(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 z-[70] bg-white border border-slate-200 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] rounded-2xl overflow-hidden p-2 min-w-[240px]"
                  >
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-0.5">
                      <button
                        onClick={() => toggleSeller('all')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${selectedSellers.includes('all') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${selectedSellers.includes('all') ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                          {selectedSellers.includes('all') && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider">Todo el Equipo</span>
                      </button>

                      <div className="h-px bg-slate-100 my-1 mx-2" />

                      {vendedores.map(v => {
                        const isSelected = selectedSellers.includes(v.id) && !selectedSellers.includes('all')
                        return (
                          <button
                            key={v.id}
                            onClick={() => toggleSeller(v.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                          >
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                              {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-[11px] font-bold">{v.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Metric Selector */}
          <div className="flex flex-wrap items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 w-full lg:w-auto overflow-hidden">
            {METRICS.map(m => {
              const isActive = highlightMetric === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setHighlightMetric(m.id)}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 relative ${
                    isActive ? 'text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-metric"
                      className={`absolute inset-0 ${m.bg} shadow-lg shadow-black/5 rounded-xl z-0`}
                    />
                  )}
                  <span className="relative z-10">{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* Capture Button */}
          <button
            onClick={() => copyElementToClipboard('weekly-chart')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all border border-slate-200 group/btn"
            title="Copiar captura de pantalla"
          >
            <Camera size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-wider">Captura</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Cargando datos...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 gap-4">
          <div className="p-4 bg-white rounded-full shadow-sm">
            <LayoutGrid size={32} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-bold text-[14px]">Sin datos disponibles</p>
            <p className="text-slate-500 text-[12px]">No se encontró actividad para el periodo o vendedores seleccionados</p>
          </div>
        </div>
      ) : (
        <div className="relative h-[520px] w-full mt-4 group pt-16">
          {/* Modern Satin Gradients */}
          <svg className="absolute w-0 h-0 invisible">
            <defs>
              <linearGradient id="grad-ventas" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="45%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </linearGradient>
              <linearGradient id="grad-altas" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="45%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#065f46" />
              </linearGradient>
              <linearGradient id="grad-conversion" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>
          </svg>

          {/* Y-Axis Labels */}
          <div className="absolute -left-2 top-16 bottom-16 flex flex-col justify-between text-[10px] font-black text-slate-400 text-right pr-4 pointer-events-none">
            <span>{Math.round(maxVal)}</span>
            <span>{Math.round(maxVal * 0.75)}</span>
            <span>{Math.round(maxVal * 0.5)}</span>
            <span>{Math.round(maxVal * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Grid Lines */}
          <div className="absolute left-10 right-0 top-16 bottom-16 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-full border-t border-slate-100" />
            ))}
          </div>

          {/* The Chart Container */}
          <div className="absolute left-10 right-4 top-16 bottom-16 flex justify-around items-end z-10">
            {data.map((weekData, weekIdx) => {
              const activeVal = weekData[highlightMetric as keyof WeeklyData] as number
              const hPercentActive = (activeVal / maxVal) * 100
              
              const activeColorClass = highlightMetric === 'ventas' ? 'text-blue-600' : highlightMetric === 'altas' ? 'text-emerald-600' : 'text-amber-600'
              const activeBg = highlightMetric === 'ventas' ? 'bg-blue-50' : highlightMetric === 'altas' ? 'bg-emerald-50' : 'bg-amber-50'
              const activeBorder = highlightMetric === 'ventas' ? 'border-blue-100' : highlightMetric === 'altas' ? 'border-emerald-100' : 'border-amber-100'
              const suffix = highlightMetric === 'conversion' ? '%' : ''

              return (
                <div key={weekData.week} className="flex-1 flex flex-col items-center h-full relative">
                  
                  {/* Floating Tooltip ABOVE active bar */}
                  <motion.div 
                    key={`${highlightMetric}-${weekIdx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute z-50 px-2 py-1.5 rounded-xl border ${activeBorder} ${activeBg} shadow-sm flex flex-col items-center min-w-[50px] shadow-lg shadow-black/5`}
                    style={{ 
                      bottom: `calc(${hPercentActive}% + 10px)`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-[11px] font-black tracking-tighter ${activeColorClass}`}>{activeVal}{suffix}</span>
                  </motion.div>

                  {/* Architectural Pillars (Corporate Refined) */}
                  <div className="flex items-end gap-1.5 sm:gap-2 h-full pb-1 relative z-20">
                    {METRICS.map((m, mIdx) => {
                      const val = weekData[m.id as keyof WeeklyData] as number
                      const hPercent = (val / maxVal) * 100
                      const isHighlighted = highlightMetric === m.id
                      
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ height: 0 }}
                          animate={{ 
                            height: `${hPercent}%`,
                            opacity: isHighlighted ? 1 : 0.1,
                            filter: isHighlighted ? 'none' : 'grayscale(100%)'
                          }}
                          transition={{ duration: 1, delay: weekIdx * 0.1 + mIdx * 0.1 }}
                          className={`w-3 sm:w-6 lg:w-9 relative border-t-2 border-white/20`}
                          style={{ 
                            background: isHighlighted ? m.gradient : '#e2e8f0',
                            borderRadius: '6px 6px 2px 2px',
                            minHeight: val > 0 ? '4px' : '0'
                          }}
                        >
                          {/* Inner Highlight for high-end look */}
                          {isHighlighted && (
                            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 rounded-t-[6px]" />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Week Label */}
                  <div className="absolute -bottom-12 flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 tracking-widest">SEM {weekData.week}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1" />
                  </div>
                </div>
              )
            })}

            {/* Dark Blue Silk Trend Line */}
            <svg 
              className="absolute inset-x-0 top-0 bottom-0 w-full h-full pointer-events-none overflow-visible z-30" 
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ paddingBottom: '4rem', paddingTop: '4rem', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            >
              {data.length > 1 && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  key={`silk-line-final-${highlightMetric}-${selectedSellers.join(',')}`}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={(() => {
                    const pts = data.map((d, i) => {
                      const metricVal = d[highlightMetric as keyof WeeklyData] as number
                      return {
                        x: (i / (data.length - 1)) * 100,
                        y: 100 - (metricVal / maxVal) * 100
                      }
                    })
                    return getSilkPath(pts)
                  })()}
                  fill="none"
                  stroke="#1e3a8a" // Deep Blue
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  className="opacity-50"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Legend & Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 gap-6 mt-4">
        <div className="flex flex-wrap items-center gap-8">
          {METRICS.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-md ${m.bg} ${highlightMetric === m.id ? 'opacity-100 shadow-sm' : 'opacity-20 grayscale'}`} />
              <span className={`text-[11px] font-black uppercase tracking-widest ${highlightMetric === m.id ? 'text-slate-800' : 'text-slate-400'}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white text-slate-400 rounded-xl border border-slate-100 shadow-sm">
          <Info size={12} />
          <span className="text-[9px] font-black uppercase tracking-wider">Reporte de métricas semanales agregadas</span>
        </div>
      </div>
    </div>
  )
}
