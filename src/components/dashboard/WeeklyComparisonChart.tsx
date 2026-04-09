'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  Users,
  LayoutGrid,
  Info,
  Camera,
  Calendar,
  Table as TableIcon
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
  { id: 'ventas', label: 'Ventas', color: '#2563eb', bg: 'bg-blue-600', gradient: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 45%, #1e40af 100%)' },
  { id: 'altas', label: 'Altas', color: '#059669', bg: 'bg-emerald-600', gradient: 'linear-gradient(180deg, #34d399 0%, #10b981 45%, #065f46 100%)' },
  { id: 'conversion', label: 'Conversión', color: '#d97706', bg: 'bg-amber-600', gradient: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 45%, #92400e 100%)' }
]


export default function WeeklyComparisonChart({ supervisorId }: WeeklyComparisonChartProps) {
  const [data, setData] = useState<WeeklyData[]>([])
  const [vendedores, setVendedores] = useState<Seller[]>([])
  const [selectedSellers, setSelectedSellers] = useState<string[]>(['all'])
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([])
  const [highlightMetric, setHighlightMetric] = useState('altas')
  const [loading, setLoading] = useState(true)
  const [showSellerList, setShowSellerList] = useState(false)
  const [showWeekList, setShowWeekList] = useState(false)

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
        // Initialize selected weeks to the last 3 available
        if (selectedWeeks.length === 0 && json.weeks.length > 0) {
          const lastThree = json.weeks.slice(-3).map((w: WeeklyData) => w.week)
          setSelectedWeeks(lastThree)
        }
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
  
  const toggleWeek = (week: string) => {
    if (selectedWeeks.includes(week)) {
      if (selectedWeeks.length > 1) {
        setSelectedWeeks(selectedWeeks.filter(w => w !== week))
      }
    } else {
      setSelectedWeeks([...selectedWeeks, week].sort((a, b) => parseInt(a) - parseInt(b)))
    }
  }

  const filteredData = data.filter(d => selectedWeeks.includes(d.week))

  // Safe maxVal calculation
  const maxVal = filteredData.length > 0 
    ? Math.max(...filteredData.map(d => Math.max(d.ventas, d.altas, d.conversion, 1)))
    : 1

  // Smooth Silk Path
  const getSilkPath = (pts: {x: number, y: number}[]) => {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`
    }
    return d
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

          {/* Week Multi-Filter with Checkboxes */}
          <div className="relative w-full lg:w-56">
            <button
              onClick={() => setShowWeekList(!showWeekList)}
              className={`w-full flex items-center justify-between pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl text-[12px] font-bold text-slate-700 transition-all shadow-sm hover:shadow-md ${showWeekList ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar size={16} />
              </div>
              <span className="truncate">
                {selectedWeeks.length === data.length 
                  ? 'Todas las Semanas' 
                  : `${selectedWeeks.length} Seleccionadas`}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${showWeekList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showWeekList && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowWeekList(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 z-[70] bg-white border border-slate-200 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] rounded-2xl overflow-hidden p-2 min-w-[220px]"
                  >
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-0.5">
                      {[...data].reverse().map(w => {
                        const isSelected = selectedWeeks.includes(w.week)
                        return (
                          <button
                            key={w.week}
                            onClick={() => toggleWeek(w.week)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                          >
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                              {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider">Semana {w.week}</span>
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
          {/* Modern Satin Gradients defined in METRICS via CSS */}


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
            {filteredData.map((weekData, weekIdx) => {
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
                            opacity: isHighlighted ? 1 : 0.25,
                            filter: isHighlighted ? 'none' : 'grayscale(100%)'
                          }}
                          transition={{ duration: 1, delay: weekIdx * 0.1 + mIdx * 0.1 }}
                          className={`w-3 sm:w-6 lg:w-9 relative border-t-2 border-white/20 transition-opacity duration-300`}
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
              className="absolute left-10 right-4 top-16 bottom-16 w-full h-full pointer-events-none overflow-visible z-30" 
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {filteredData.length > 1 && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  key={`silk-line-final-${highlightMetric}-${selectedSellers.join(',')}-${selectedWeeks.join(',')}`}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={(() => {
                    const n = filteredData.length
                    const pts = filteredData.map((d, i) => {
                      const metricVal = d[highlightMetric as keyof WeeklyData] as number
                      return {
                        x: ((i + 0.5) / n) * 100,
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

      {/* NEW DATA TABLE */}
      {!loading && filteredData.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                <TableIcon size={16} className="text-white" />
             </div>
             <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Resumen Detallado por Semana</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Semana</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Ventas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">FVC</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Altas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Eficacia</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={row.week} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-600 border border-slate-200">
                          {row.week}
                        </div>
                        <span className="text-[12px] font-bold text-slate-800 uppercase tracking-tight">Semana {row.week}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[14px] font-black text-blue-600">{row.ventas}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[14px] font-black text-slate-600">{row.fvc}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[14px] font-black text-emerald-600">{row.altas}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                          row.conversion >= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                          row.conversion >= 50 ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-red-50 border-red-100 text-red-700'
                        }`}>
                          {row.conversion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
