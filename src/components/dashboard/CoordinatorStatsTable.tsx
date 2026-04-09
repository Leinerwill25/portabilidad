'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'

import { 
  ChevronDown, 
  ChevronRight, 
  ChevronUp,
  Users,
  UserCheck,
  RefreshCw,
  BarChart3,
  Camera,
  GripVertical,
  Activity
} from 'lucide-react'

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

export default function CoordinatorStatsTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')

  const initialColumns = [
    { label: 'Site / Vendedor', key: 'name', weight: 'w-[200px]' },
    { label: 'VENTAS', key: 'ventas', weight: 'w-[100px]' },
    { label: 'ACT. NO ALTA', key: 'ana', weight: 'w-[120px]' },
    { label: 'ALTA', key: 'alta', weight: 'w-[100px]' },
    { label: 'NO ENROLADO', key: 'ne', weight: 'w-[120px]' },
    { label: 'SIN ESTATUS', key: 'pend', weight: 'w-[120px]' },
    { label: 'CHBACK', key: 'cb', weight: 'w-[100px]' },
    { label: 'PROMESA', key: 'prom', weight: 'w-[100px]' },
    { label: 'TOTAL FVC', key: 'total', weight: 'w-[120px]' },
    { label: 'CONVERSION', key: 'conv', weight: 'w-[120px]' },
  ]

  const [columnOrder, setColumnOrder] = useState(initialColumns)

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

  const formatNum = (n: number) => {
     return <span className="font-black tabular-nums">{n}</span>
  }

  const renderCell = (col: any, supervisor: SupervisorStats, seller?: SellerStats) => {
    const stats = seller ? seller.stats : supervisor.totals
    const conv = seller ? seller.conv : supervisor.conv

    switch (col.key) {
      case 'name':
        if (seller) {
          return (
            <td className="px-10 py-3 text-[12px] font-bold text-slate-700 flex items-center gap-3 border-r-2 border-slate-50">
               <div className="p-1 rounded bg-slate-100">
                  <UserCheck size={12} className="text-slate-400" />
               </div>
               {seller.name}
            </td>
          )
        }
        return (
          <td className="px-10 py-5 text-[14px] font-black text-slate-900 border-r-2 border-slate-50 uppercase tracking-tight flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all" onClick={() => toggleExpand(supervisor.id)}>
            <div className="flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-sm transition-colors ${expandedSupervisors[supervisor.id] ? 'bg-blue-600' : 'bg-slate-900 group-hover:bg-blue-600'}`} />
              {supervisor.name}
            </div>
            {expandedSupervisors[supervisor.id] ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} className="text-slate-300 group-hover:text-blue-600" />}
          </td>
        )
      case 'ventas':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-slate-900 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.ventas)}</td>
      case 'ana':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-slate-600 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.activacion_no_alta)}</td>
      case 'alta':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-slate-400 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.alta)}</td>
      case 'ne':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-slate-700 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.alta_no_enrolada)}</td>
      case 'pend':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-slate-900 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.sin_status)}</td>
      case 'cb':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-red-700 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.chargeback)}</td>
      case 'prom':
        return <td className="px-6 py-5 text-[16px] text-center font-black text-amber-700 border-r-2 border-slate-50 tabular-nums">{formatNum(stats.promesa)}</td>
      case 'total':
        return (
          <td className="px-6 py-5 text-center font-black bg-blue-50/30 border-r-2 border-slate-50">
             <div className="text-[16px] font-black text-slate-900 tabular-nums">{stats.total}</div>
          </td>
        )
      case 'conv':
        return (
          <td className="px-10 py-5 text-center">
             <div className={`inline-block px-4 py-1.5 rounded-xl text-[14px] font-black shadow-sm transition-all ${getEfficacyStyle(conv)}`}>
               {conv}
             </div>
          </td>
        )
      default:
        return null
    }
  }

  const renderGrandTotalCell = (col: any) => {
    switch (col.key) {
      case 'name':
        return (
          <td className="px-10 py-4 text-[13px] border-r border-white/10 uppercase tracking-[0.2em] relative">
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]" />
            CONSOLIDADO GLOBAL
          </td>
        )
      case 'ventas':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums">{data?.grandTotal.ventas ?? 0}</td>
      case 'ana':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums">{data?.grandTotal.activacion_no_alta ?? 0}</td>
      case 'alta':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums">{data?.grandTotal.alta ?? 0}</td>
      case 'ne':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums">{data?.grandTotal.alta_no_enrolada ?? 0}</td>
      case 'pend':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums">{data?.grandTotal.sin_status ?? 0}</td>
      case 'cb':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums text-red-500">{data?.grandTotal.chargeback ?? 0}</td>
      case 'prom':
        return <td className="px-6 py-4 text-[18px] text-center border-r border-white/10 tabular-nums text-amber-500">{data?.grandTotal.promesa ?? 0}</td>
      case 'total':
        return (
          <td className="px-6 py-4 text-center border-r border-white/10 tabular-nums">
            <div className="text-[18px] font-black text-white">{data?.grandTotal.total ?? 0}</div>
          </td>
        )
      case 'conv':
        return (
          <td className="px-10 py-4 text-[22px] text-center bg-blue-600 shadow-inner tabular-nums font-[900]">
             {data?.grandTotal.conv}
          </td>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-[2rem] border border-slate-200 animate-pulse flex flex-col items-center justify-center gap-4">
        <RotateCw className="text-slate-300 animate-spin" size={32} />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando Site Analytics...</p>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-16 rounded-[2rem] border border-slate-200 text-center shadow-sm">
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
              Análisis de **calidad de carga** y resultados mensuales/semanales. 
              Visualiza el desglose completo desde ventas ingresadas hasta **Altas** efectivas y **Chargebacks**. 
              <strong> Función:</strong> Permite detectar de inmediato equipos con baja conversión antes del cierre.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden mb-20" id="stats-table">
        {/* Dynamic Header */}
        <div className="bg-slate-900 py-8 px-10 flex flex-col xl:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-6 w-full xl:w-auto">
             <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                <BarChart3 size={28} className="text-white" strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-[18px] font-black text-white uppercase tracking-tight">Dashboard Gerencial Site Analytics</h3>
                <div className="flex items-center gap-3 mt-1">
                   <Activity size={12} className="text-blue-400 animate-pulse" />
                   <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest italic">Visualización Consolidada 360</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8 w-full xl:w-auto">
             <div className="flex flex-col gap-2 min-w-[150px]">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Mes</span>
                <select 
                  value={monthFilter || data?.selectedMonth || ''}
                  onChange={(e) => {
                    setMonthFilter(e.target.value)
                    setWeekFilter('')
                  }}
                  className="w-full bg-slate-800 border-2 border-slate-700 text-white text-[13px] font-black rounded-xl px-4 py-3 appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">Mes Actual</option>
                  {data?.filterOptions.months.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
             </div>

             <div className="flex flex-col gap-2 min-w-[150px]">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Semana</span>
                <select 
                  value={weekFilter || data?.selectedWeek || ''}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-700 text-white text-[13px] font-black rounded-xl px-4 py-3 appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">Todas</option>
                  {data?.filterOptions.weeks.map(w => (
                    <option key={w} value={w}>Semana {w}</option>
                  ))}
                </select>
             </div>

             <div className="flex items-center gap-3 mt-5">
               <button 
                  onClick={() => copyElementToClipboard('stats-table')}
                  className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all shadow-xl"
                  title="Capturar"
               >
                  <Camera size={18} />
               </button>
               <button 
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 group disabled:opacity-50"
                  title="Actualizar"
                >
                  <RefreshCw size={18} strokeWidth={3} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                </button>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto p-1 bg-slate-900 no-scrollbar">
          <div className="bg-white rounded-t-[1.5rem] overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <Reorder.Group as="thead" axis="x" values={columnOrder} onReorder={setColumnOrder}>
                <tr className="bg-slate-50 text-black border-b border-slate-100">
                  {columnOrder.map((col, i) => (
                    <Reorder.Item
                      as="th"
                      key={col.key}
                      value={col}
                      whileDrag={{ 
                        scale: 1.05, 
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        backgroundColor: "#f8fafc",
                        zIndex: 99
                      }}
                      className={`px-6 py-6 text-[11px] font-black uppercase tracking-widest text-slate-500 cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors select-none group/col relative border-r border-slate-50 ${i > 0 || col.key !== 'name' ? 'text-center' : 'pl-10'}`}
                    >
                      <div className="flex items-center justify-center gap-2 relative">
                        {i > 0 && <GripVertical size={14} className="text-slate-400 opacity-0 group-hover/col:opacity-100 transition-all absolute -left-2" />}
                        {col.label}
                      </div>
                    </Reorder.Item>
                  ))}
                </tr>
              </Reorder.Group>
              <tbody className="divide-y-2 divide-slate-50">
                {data.supervisors.map((supervisor) => (
                  <React.Fragment key={supervisor.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      {columnOrder.map(col => (
                        <React.Fragment key={col.key}>
                          {renderCell(col, supervisor)}
                        </React.Fragment>
                      ))}
                    </tr>
                    {expandedSupervisors[supervisor.id] && (
                      supervisor.sellers.map((seller) => (
                        <tr key={seller.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                          {columnOrder.map(col => (
                            <React.Fragment key={col.key}>
                              {renderCell(col, supervisor, seller)}
                            </React.Fragment>
                          ))}
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                ))}
                {/* Consolidado Final */}
                <tr className="bg-slate-900 text-white font-black shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
                  {columnOrder.map(col => (
                    <React.Fragment key={col.key}>
                      {renderGrandTotalCell(col)}
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
