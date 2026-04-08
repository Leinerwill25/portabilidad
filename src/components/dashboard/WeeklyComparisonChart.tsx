'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  Users,
  LayoutGrid,
  Info
} from 'lucide-react'


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
  { id: 'ventas', label: 'Ventas', color: '#3b82f6', bg: 'bg-blue-500' },
  { id: 'altas', label: 'Altas', color: '#10b981', bg: 'bg-emerald-500' },
  { id: 'conversion', label: 'Conversión', color: '#f59e0b', bg: 'bg-amber-500' }
]

export default function WeeklyComparisonChart({ supervisorId }: WeeklyComparisonChartProps) {
  const [data, setData] = useState<WeeklyData[]>([])
  const [vendedores, setVendedores] = useState<Seller[]>([])
  const [selectedSellers, setSelectedSellers] = useState<string[]>(['all'])
  const [highlightMetric, setHighlightMetric] = useState('altas')
  const [loading, setLoading] = useState(true)
  const [showSellerList, setShowSellerList] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const sellerIdParam = selectedSellers.includes('all') ? 'all' : selectedSellers.join(',')
      const url = `/api/admin/stats/weekly-comparison?supervisorId=${supervisorId || ''}&sellerId=${sellerIdParam}`
      const response = await fetch(url)
      const json = await response.json()
      if (json.weeks) {
        setData(json.weeks)
        // Keep the list stable once loaded or when "all" is back
        if (vendedores.length === 0 || selectedSellers.includes('all')) {
          setVendedores(json.vendedores || [])
        }
      }
    } catch (error) {
      console.error('Error fetching weekly comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const maxVal = Math.max(...data.map(d => Math.max(d.ventas, d.altas, d.conversion, 1)))

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <LayoutGrid size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Rendimiento Temporal</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comparativo Por Semana</h2>
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
                  {/* Backdrop to close */}
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowSellerList(false)} />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 z-[70] bg-white border border-slate-200 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] rounded-2xl overflow-hidden p-2 min-w-[240px]"
                  >
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-0.5">
                      {/* All Team Option */}
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

                      {/* Individual Sellers */}
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
                      className={`absolute inset-0 ${m.bg} shadow-lg shadow-${m.id === 'ventas' ? 'blue' : m.id === 'altas' ? 'emerald' : 'amber'}-500/20 rounded-xl z-0`}
                    />
                  )}
                  <span className="relative z-10">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Cargando datos...</span>
        </div>
      ) : (
        <div className="relative h-[450px] w-full mt-4 group">
          {/* Y-Axis Labels (Dynamic based on max value) */}
          <div className="absolute -left-2 top-0 bottom-12 flex flex-col justify-between text-[10px] font-black text-slate-400 text-right pr-4 pointer-events-none">
            <span>{Math.round(maxVal)}</span>
            <span>{Math.round(maxVal * 0.75)}</span>
            <span>{Math.round(maxVal * 0.5)}</span>
            <span>{Math.round(maxVal * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Grid Lines */}
          <div className="absolute left-10 right-0 top-0 bottom-12 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-full border-t border-slate-100 border-dashed" />
            ))}
          </div>
          {/* The Chart Container */}
          <div className="absolute left-10 right-4 top-0 bottom-12 flex justify-around items-end z-10">
            {data.map((weekData, weekIdx) => {
              const isSelectedMetricVentas = highlightMetric === 'ventas'
              const isSelectedMetricAltas = highlightMetric === 'altas'
              const isSelectedMetricConv = highlightMetric === 'conversion'

              const hVentas = (weekData.ventas / maxVal) * 100
              const hConv = (weekData.conversion / maxVal) * 100
              const hAltas = (weekData.altas / maxVal) * 100

              // Determine value to show fixed at the bottom
              const activeValue = highlightMetric === 'ventas' ? weekData.ventas : highlightMetric === 'altas' ? weekData.altas : weekData.conversion
              const activeLabel = highlightMetric === 'ventas' ? 'Ventas' : highlightMetric === 'altas' ? 'Altas' : 'Conv.'
              const activeSuffix = highlightMetric === 'conversion' ? '%' : ''
              const activeColor = highlightMetric === 'ventas' ? 'text-blue-500' : highlightMetric === 'altas' ? 'text-emerald-500' : 'text-amber-500'
              const activeBg = highlightMetric === 'ventas' ? 'bg-blue-50' : highlightMetric === 'altas' ? 'bg-emerald-50' : 'bg-amber-50'
              const activeBorder = highlightMetric === 'ventas' ? 'border-blue-100' : highlightMetric === 'altas' ? 'border-emerald-100' : 'border-amber-100'

              return (
                <div key={weekData.week} className="flex-1 flex flex-col items-center h-full relative z-20">
                  {/* Fixed Tooltip at the Bottom (Requested) */}
                  <div className="absolute -bottom-16 flex flex-col items-center z-50">
                    <motion.div 
                      key={highlightMetric}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`px-3 py-1.5 rounded-xl border ${activeBorder} ${activeBg} shadow-sm flex flex-col items-center min-w-[70px]`}
                    >
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${activeColor} opacity-70`}>{activeLabel}</span>
                      <span className={`text-[13px] font-black tracking-tight ${activeColor}`}>{activeValue}{activeSuffix}</span>
                    </motion.div>
                    
                    <div className="mt-2 flex flex-col items-center">
                      <span className="text-[11px] font-black text-slate-500 tracking-wider">SEMANA {weekData.week}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1" />
                    </div>
                  </div>

                  {/* Bars Group - Ensured clear height and display */}
                  <div className="flex items-end gap-1.5 sm:gap-2 h-full pb-1 relative z-20">
                     {/* Ventas Bar */}
                     <div className="flex flex-col items-center justify-end h-full relative">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${hVentas}%` }}
                         transition={{ duration: 1, delay: weekIdx * 0.1 }}
                         style={{ minHeight: weekData.ventas > 0 ? '4px' : '0' }}
                         className={`w-4 sm:w-10 rounded-t-sm bg-blue-600 transition-all duration-500 relative z-30 ${highlightMetric && !isSelectedMetricVentas ? 'opacity-20 grayscale' : 'opacity-100 shadow-md'}`}
                       />
                     </div>

                     {/* Conversion Bar */}
                     <div className="flex flex-col items-center justify-end h-full relative">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${hConv}%` }}
                         transition={{ duration: 1, delay: weekIdx * 0.15 }}
                         style={{ minHeight: weekData.conversion > 0 ? '4px' : '0' }}
                         className={`w-4 sm:w-10 rounded-t-sm bg-amber-500 transition-all duration-500 relative z-30 ${highlightMetric && !isSelectedMetricConv ? 'opacity-20 grayscale' : 'opacity-100 shadow-md'}`}
                       />
                     </div>

                     {/* Altas Bar */}
                     <div className="flex flex-col items-center justify-end h-full relative">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: `${hAltas}%` }}
                         transition={{ duration: 1, delay: weekIdx * 0.2 }}
                         style={{ minHeight: weekData.altas > 0 ? '4px' : '0' }}
                         className={`w-4 sm:w-10 rounded-t-sm bg-emerald-500 transition-all duration-500 relative z-30 ${highlightMetric && !isSelectedMetricAltas ? 'opacity-20 grayscale' : 'opacity-100 shadow-md'}`}
                       />
                     </div>
                  </div>
                </div>
              )
            })}




            {/* Trend Line Overlay - Moved back in z-axis slightly relative to tooltips but over bars */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30" 

              viewBox={`0 0 100 100`}
              preserveAspectRatio="none"
              style={{ paddingBottom: '3rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
            >
              {data.length > 1 && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  key={highlightMetric + selectedSellers.join(',')}

                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={data.map((d, i) => {
                    const metricVal = highlightMetric === 'ventas' ? d.ventas : highlightMetric === 'altas' ? d.altas : d.conversion
                    const x = (i / (data.length - 1)) * 100
                    const y = 100 - (metricVal / maxVal) * 100
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke={METRICS.find(m => m.id === highlightMetric)?.color || '#3b82f6'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Legend & Footer Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border border-slate-200 rounded-3xl p-6 gap-6">
        <div className="flex flex-wrap items-center gap-6">
          {METRICS.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${m.bg} shadow-sm shadow-black/10`} />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{m.label}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
          <Info size={14} />
          <span className="text-[10px] font-black uppercase tracking-wider">Mostrando últimas 3 semanas con datos</span>
        </div>
      </div>
    </div>
  )
}
