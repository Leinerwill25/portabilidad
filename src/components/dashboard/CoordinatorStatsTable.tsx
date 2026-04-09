'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Users,
  RefreshCw,
  BarChart3,
  Camera,
  GripVertical
} from 'lucide-react'
import { Reorder } from 'framer-motion'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface SellerStats {
  id: string
  name: string
  stats: {
    ventas: number
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    promesa: number
    fvc: number
    total: number
  }
  conv: string
}

interface SupervisorStats {
  id: string
  name: string
  sellers: SellerStats[]
  totals: {
    ventas: number
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    promesa: number
    fvc: number
    total: number
  }
  conv: string
}

interface GrandTotal {
  ventas: number
  activacion_no_alta: number
  alta: number
  alta_no_enrolada: number
  sin_status: number
  chargeback: number
  promesa: number
  fvc: number
  total: number
  conv: string
}

interface HierarchyData {
  supervisors: SupervisorStats[]
  grandTotal: GrandTotal
  selectedMonth: string
  selectedWeek: string
  filterOptions: {
    months: string[]
    weeks: string[]
  }
}

const INITIAL_COLUMNS = [
  { label: 'Site / Vendedor', key: 'name', weight: 'w-[20%]' },
  { label: 'VENTAS', key: 'ventas', weight: 'w-[10%]' },
  { label: 'ACT. NO ALTA', key: 'ana', weight: 'w-[10%]' },
  { label: 'ALTA', key: 'alta', weight: 'w-[10%]' },
  { label: 'NO ENROLADO', key: 'ne', weight: 'w-[10%]' },
  { label: 'SIN ESTATUS', key: 'pend', weight: 'w-[10%]' },
  { label: 'CHBACK', key: 'cb', weight: 'w-[10%]' },
  { label: 'PROMESA', key: 'prom', weight: 'w-[10%]' },
  { label: 'TOTAL FVC', key: 'total', weight: 'w-[10%]' },
  { label: 'CONVERSION', key: 'conv', weight: 'w-[10%]' },
]

export default function CoordinatorStatsTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [columnOrder, setColumnOrder] = useState(INITIAL_COLUMNS)

  const fetchData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      let url = '/api/admin/stats/hierarchy?'
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`
      if (isManual) url += `&force=true`

      const res = await fetch(url)
      const json = await res.json()
      setData(json)
      
      // Auto-expand on first load
      if (!isManual) {
        const expanded: Record<string, boolean> = {}
        json.supervisors?.forEach((s: SupervisorStats) => {
          expanded[s.id] = true
        })
        setExpandedSupervisors(expanded)
      }
    } catch (err) {
      console.error('Error fetching hierarchy stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [monthFilter, weekFilter])

  const toggleExpand = (id: string) => {
    setExpandedSupervisors(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getEfficacyStyle = (convStr: string) => {
    const val = parseInt(convStr.replace('%', ''))
    if (isNaN(val)) return 'bg-slate-100 text-slate-400'
    if (val <= 55) return 'bg-[#fee2e2] text-red-700'
    if (val <= 60) return 'bg-[#fef9c3] text-yellow-700'
    return 'bg-[#d1fae5] text-emerald-700'
  }

  const formatNum = (n: number, isContrast: boolean = false) => {
     if (n === 0) return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>0</span>
     return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>{n}</span>
  }

  const renderCellContent = (colKey: string, stats: any, isSupervisor: boolean = false, supervisorName: string = '', isExpanded: boolean = false) => {
    switch (colKey) {
      case 'name':
        if (isSupervisor) {
          return (
            <div className="flex items-center gap-4 relative">
              <div className="absolute left-[-32px] top-0 bottom-0 w-2 bg-blue-600" />
              <div className="text-blue-900">
                {isExpanded ? <ChevronDown size={14} strokeWidth={4} /> : <ChevronRight size={14} strokeWidth={4} />}
              </div>
              <span className="text-[14px] font-black text-blue-900 uppercase tracking-tight">
                SITE: {supervisorName}
              </span>
            </div>
          )
        }
        return <span className="pl-8">{supervisorName}</span>
      case 'ventas': return formatNum(stats.ventas, isSupervisor)
      case 'ana': return formatNum(stats.activacion_no_alta, isSupervisor)
      case 'alta': return formatNum(stats.alta, isSupervisor)
      case 'ne': return formatNum(stats.alta_no_enrolada, isSupervisor)
      case 'pend': return formatNum(stats.sin_status, isSupervisor)
      case 'cb': 
        return <span className={isSupervisor ? "text-red-700 font-black" : "text-red-600 font-black"}>{formatNum(stats.chargeback, isSupervisor)}</span>
      case 'prom': 
        return <span className={isSupervisor ? "text-amber-600 font-black" : "text-amber-700 font-bold"}>{formatNum(stats.promesa, isSupervisor)}</span>
      case 'total': 
        return <div className={isSupervisor ? "bg-sky-300/50" : "bg-black/5"}>{formatNum(stats.total, isSupervisor)}</div>
      case 'conv':
        const convVal = isSupervisor ? stats.conv : stats.conv // stats in sellers actually has conv property outside the stats object
        // Wait, sellers have conv directly on the object, supervisors have conv on the object too.
        // But for this function, stats is passed as the entire object or stats object.
        // Let's adjust how we call it.
        return null // Handled outside for simpler logic
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
        <div className="h-10 bg-slate-50 rounded w-full mb-4" />
        <div className="space-y-px">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-slate-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-16 rounded-xl border border-slate-200 text-center shadow-sm">
        <Users className="text-slate-200 mx-auto mb-4" size={40} />
        <h3 className="text-[16px] font-bold text-slate-800">Pendiente de Asignación</h3>
        <p className="text-[13px] text-slate-500 max-w-xs mx-auto mt-2">
          Asigne supervisores para visualizar el análisis de red.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-200">
           <BarChart3 className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Resumen Mes/Semana</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Análisis profundo de la **calidad de carga** y resultados mensuales/semanales. 
              Visualiza el desglose completo desde ventas ingresadas hasta **Altas** efectivas y **Chargebacks** (bajas). 
              <strong> Beneficio:</strong> Permite detectar desviaciones críticas en el proceso de enrolamiento y asegurar el cumplimiento de metas por Site.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl overflow-hidden mb-16" id="stats-table">
        {/* Navy Title Bar */}
        <div className="px-6 py-5 bg-[#0f172a] border-b-2 border-slate-900 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-white rounded-full shadow-lg" />
              <h3 className="text-[15px] font-black text-white uppercase tracking-[0.1em]">Dashboard Gerencial Site Analytics</h3>
           </div>
            <div className="flex items-center gap-4">
              {/* Filters ... (Keep original logic) */}
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80">Mes</span>
                <select 
                  value={monthFilter || data?.selectedMonth || ''}
                  onChange={(e) => {
                    setMonthFilter(e.target.value)
                    setWeekFilter('')
                  }}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
                >
                  <option value="" className="text-black">Mes Actual</option>
                  {data?.filterOptions.months.map(m => (
                    <option key={m} value={m} className="text-black">{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80">Semana</span>
                <select 
                  value={weekFilter || data?.selectedWeek || ''}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
                >
                  <option value="" className="text-black">Todas</option>
                  {data?.filterOptions.weeks.map(w => (
                    <option key={w} value={w} className="text-black">Semana {w}</option>
                  ))}
                </select>
              </div>

              <div className="w-[1px] h-8 bg-white/20 mx-2" />

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => copyElementToClipboard('stats-table')}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90 border border-white/20 shadow-lg"
                  title="Capturar Reporte"
                >
                  <Camera size={18} />
                </button>

                <button 
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2.5 px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full transition-all active:scale-95 group/btn"
                >
                  <RefreshCw size={14} className={`text-white ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                  </span>
                </button>
              </div>
            </div>
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <Reorder.Group as="thead" axis="x" values={columnOrder} onReorder={setColumnOrder}>
              <tr className="bg-slate-50 text-black">
                {columnOrder.map((col, i) => (
                  <Reorder.Item 
                    as="th" 
                    key={col.key} 
                    value={col}
                    className={`border-r-2 border-slate-900 border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black cursor-grab active:cursor-grabbing hover:bg-slate-100 ${col.weight} ${i > 0 && col.key !== 'name' ? 'text-center' : 'pl-8'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                       {col.key !== 'name' && <GripVertical size={10} className="text-slate-400" />}
                       {col.label}
                    </div>
                  </Reorder.Item>
                ))}
              </tr>
            </Reorder.Group>
            
            <tbody className="text-[13px]">
              {data.supervisors.map((supervisor) => {
                const isExpanded = expandedSupervisors[supervisor.id]
                return (
                  <React.Fragment key={supervisor.id}>
                    {/* SITE HEADER */}
                    <tr 
                      className={`group cursor-pointer hover:bg-sky-300 transition-all border-b-2 border-slate-900 bg-[#e0f2fe] ${isExpanded ? 'bg-sky-200' : ''}`}
                      onClick={() => toggleExpand(supervisor.id)}
                    >
                      {columnOrder.map((col) => {
                        if (col.key === 'name') {
                          return (
                            <td key={col.key} className="border-r-2 border-slate-900 px-8 py-4 bg-sky-200/50">
                               <div className="flex items-center gap-4 relative">
                                  <div className="absolute left-[-32px] top-0 bottom-0 w-2 bg-blue-600" />
                                  <div className="text-blue-900">
                                    {isExpanded ? <ChevronDown size={14} strokeWidth={4} /> : <ChevronRight size={14} strokeWidth={4} />}
                                  </div>
                                  <span className="text-[14px] font-black text-blue-900 uppercase tracking-tight">
                                    SITE: {supervisor.name}
                                  </span>
                                </div>
                            </td>
                          )
                        }
                        
                        if (col.key === 'conv') {
                          return (
                            <td key={col.key} className="px-4 py-4 text-center bg-sky-100/30 border-r-2 border-slate-900 last:border-r-0">
                               <span className={`text-[12px] font-black shadow-sm px-3 py-1.5 rounded-lg border border-black/5 ${getEfficacyStyle(supervisor.conv)}`}>
                                 {supervisor.conv}
                               </span>
                            </td>
                          )
                        }

                        // Normal numeric cells for supervisors
                        let val = 0
                        switch(col.key) {
                          case 'ventas': val = supervisor.totals.ventas; break;
                          case 'ana': val = supervisor.totals.activacion_no_alta; break;
                          case 'alta': val = supervisor.totals.alta; break;
                          case 'ne': val = supervisor.totals.alta_no_enrolada; break;
                          case 'pend': val = supervisor.totals.sin_status; break;
                          case 'cb': val = supervisor.totals.chargeback; break;
                          case 'prom': val = supervisor.totals.promesa; break;
                          case 'total': val = supervisor.totals.total; break;
                        }

                        return (
                          <td key={col.key} className={`border-r-2 border-slate-900 px-2 py-4 text-center font-black ${col.key === 'cb' ? 'text-red-700' : col.key === 'prom' ? 'text-amber-600' : 'text-blue-900'} ${col.key === 'total' ? 'bg-sky-300/50' : col.key === 'ventas' ? 'bg-sky-200/30' : ''} last:border-r-0`}>
                            {formatNum(val, true)}
                          </td>
                        )
                      })}
                    </tr>

                    {/* SELLER ROWS */}
                    {isExpanded && supervisor.sellers.map((seller) => (
                      <tr key={seller.id} className="hover:bg-slate-100 transition-colors border-b-2 border-slate-900 bg-white">
                        {columnOrder.map((col) => {
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className="border-r-2 border-slate-900 pl-16 pr-4 py-3 text-[12px] text-black uppercase tracking-tight bg-black/5">
                                {seller.name}
                              </td>
                            )
                          }
                          
                          if (col.key === 'conv') {
                            return (
                              <td key={col.key} className="px-4 py-3 text-center bg-slate-50/30 border-r-2 border-slate-900 last:border-r-0">
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded border border-black/5 ${getEfficacyStyle(seller.conv)}`}>
                                  {seller.conv}
                                </span>
                              </td>
                            )
                          }

                          let val = 0
                          switch(col.key) {
                            case 'ventas': val = seller.stats.ventas; break;
                            case 'ana': val = seller.stats.activacion_no_alta; break;
                            case 'alta': val = seller.stats.alta; break;
                            case 'ne': val = seller.stats.alta_no_enrolada; break;
                            case 'pend': val = seller.stats.sin_status; break;
                            case 'cb': val = seller.stats.chargeback; break;
                            case 'prom': val = seller.stats.promesa; break;
                            case 'total': val = seller.stats.total; break;
                          }

                          return (
                            <td key={col.key} className={`border-r-2 border-slate-900 px-2 py-3 text-center font-black ${col.key === 'cb' ? 'text-red-600' : col.key === 'prom' ? 'text-amber-700' : 'text-slate-800'} ${col.key === 'total' || col.key === 'ventas' ? 'bg-black/5' : ''} last:border-r-0`}>
                              {formatNum(val)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}

              {/* GRAND TOTAL */}
              <tr className="bg-[#0f172a] text-white border-t-4 border-slate-900 shadow-inner">
                {columnOrder.map((col) => {
                  if (col.key === 'name') {
                    return (
                      <td key={col.key} className="border-r-2 border-slate-800 px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] relative">
                         <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                         CONSOLIDADO GLOBAL
                      </td>
                    )
                  }
                  
                  if (col.key === 'conv') {
                    return (
                      <td key={col.key} className="px-6 py-4 text-center bg-white/5 border-l border-slate-800">
                         <div className="flex flex-col items-center">
                            <span className={`text-[18px] font-black px-3 py-0.5 rounded-lg shadow-inner ${getEfficacyStyle(data.grandTotal.conv)}`}>
                              {data.grandTotal.conv}
                            </span>
                         </div>
                      </td>
                    )
                  }

                  let val = 0
                  switch(col.key) {
                    case 'ventas': val = data.grandTotal.ventas; break;
                    case 'ana': val = data.grandTotal.activacion_no_alta; break;
                    case 'alta': val = data.grandTotal.alta; break;
                    case 'ne': val = data.grandTotal.alta_no_enrolada; break;
                    case 'pend': val = data.grandTotal.sin_status; break;
                    case 'cb': val = data.grandTotal.chargeback; break;
                    case 'prom': val = data.grandTotal.promesa; break;
                    case 'total': val = data.grandTotal.total; break;
                  }

                  return (
                    <td key={col.key} className={`border-r-2 border-slate-800 px-2 py-4 text-center font-black tabular-nums ${col.key === 'cb' ? 'text-red-400' : col.key === 'prom' ? 'text-amber-400' : 'text-white'} ${col.key === 'total' ? 'text-[22px] bg-white/10' : col.key === 'ventas' ? 'bg-sky-900/50' : ''} last:border-r-0`}>
                      {val ?? 0}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
