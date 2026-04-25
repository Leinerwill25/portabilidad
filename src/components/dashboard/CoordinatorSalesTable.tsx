'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Users,
  RefreshCw,
  TrendingUp,
  Camera,
  Calendar as CalendarIcon,
  UserCheck,
  X
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface SellerStats {
  id: string
  name: string
  totalVentas: number
}

interface SupervisorStats {
  id: string
  name: string
  sellers: SellerStats[]
  totalVentas: number
}

interface SalesHierarchyData {
  supervisors: SupervisorStats[]
  grandTotal: number
  selectedMonth: string
  selectedWeek: string
  selectedDay: string
  filterOptions: {
    months: string[]
    weeks: string[]
    days: string[]
  }
}

// --- Helper Sub-component for Date Range ---
function CustomDateRangePicker({ 
  startDate, 
  endDate, 
  onRangeSelect, 
  onClear 
}: { 
  startDate: string, 
  endDate: string, 
  onRangeSelect: (start: string, end: string) => void,
  onClear: () => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(new Date())
  const [tempStart, setTempStart] = React.useState<string | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const handleDateClick = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const dateStr = d.toISOString().split('T')[0]

    if (!tempStart) {
      setTempStart(dateStr)
    } else {
      const d1 = new Date(tempStart)
      const d2 = new Date(dateStr)
      if (d1 < d2) {
        onRangeSelect(tempStart, dateStr)
      } else {
        onRangeSelect(dateStr, tempStart)
      }
      setTempStart(null)
      setIsOpen(false)
    }
  }

  const renderCalendar = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const days = daysInMonth(year, month)
    const firstDay = firstDayOfMonth(year, month)
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(viewDate)

    const grid = []
    for (let i = 0; i < firstDay; i++) {
      grid.push(<div key={`empty-${i}`} className="w-8 h-8" />)
    }

    for (let d = 1; d <= days; d++) {
      const dateObj = new Date(year, month, d)
      const dateStr = dateObj.toISOString().split('T')[0]
      const isSelected = dateStr === startDate || dateStr === endDate || dateStr === tempStart
      const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate

      grid.push(
        <button
          key={d}
          onClick={() => handleDateClick(d)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-bold transition-all duration-300 relative ${
            isSelected 
              ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] z-10 scale-105' 
              : isInRange 
                ? 'bg-blue-500/10 text-blue-400' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          {isSelected && <div className="absolute inset-0 border-2 border-white/20 rounded-xl" />}
          {d}
        </button>
      )
    }

    return (
      <div className="p-6 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[300px] animate-in slide-in-from-top-2 duration-300 z-[200]">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Calendario</span>
            <span className="text-[14px] font-black text-white uppercase tracking-tighter">{monthName} {year}</span>
          </div>
          <button 
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center mb-2 px-1">
          {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(day => (
            <span key={day} className="text-[8px] font-black text-slate-500 tracking-widest">{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 p-1">
          {grid}
        </div>
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between px-2">
            <button 
              onClick={onClear} 
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors px-4 py-2 hover:bg-rose-500/5 rounded-full"
            >
              Resetear
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full transition-all shadow-lg active:scale-95"
            >
              Aplicar
            </button>
        </div>
      </div>
    )
  }

  const label = startDate && endDate 
    ? `${startDate.split('-').slice(1).reverse().join('/')} - ${endDate.split('-').slice(1).reverse().join('/')}`
    : 'Todo el Periodo'

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full transition-all duration-500 group relative overflow-hidden shrink-0"
      >
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
        <div className="p-1 bg-blue-500/20 text-blue-400 rounded-lg group-hover:scale-110 transition-transform duration-500">
           <CalendarIcon size={12} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-start leading-none relative z-10">
          <span className="text-[7px] font-black text-blue-200/60 uppercase tracking-widest mb-0.5">Rango</span>
          <span className="text-[10px] font-black text-white font-mono tracking-tighter tabular-nums">{label}</span>
        </div>
        <ChevronDown size={10} className={`text-white/30 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-3 right-0 z-[200]">
          {renderCalendar()}
        </div>
      )}
    </div>
  )
}

export default function CoordinatorSalesTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<SalesHierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeGraduated, setIncludeGraduated] = useState(false)

  const fetchData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      let url = '/api/admin/stats/sales-hierarchy?'
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (dayFilter) url += `&day=${dayFilter}`
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`
      if (includeGraduated) url += `&includeGraduated=true`
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
      console.error('Error fetching sales hierarchy stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [monthFilter, weekFilter, dayFilter, startDate, endDate, includeGraduated])

  const toggleExpand = (id: string) => {
    setExpandedSupervisors(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatNum = (n: number, isContrast: boolean = false) => {
     if (n === 0) return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>0</span>
     return <span className={isContrast ? "text-blue-900 font-black text-[18px]" : "text-black font-black text-[15px]"}>{n}</span>
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
          Asigne supervisores para visualizar el análisis de ventas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-200">
           <TrendingUp className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Total de Ventas Consolidadas</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Vista simplificada enfocada exclusivamente en el <strong>volumen de ventas ingresadas (Total de DN)</strong>. 
              <strong> Beneficio:</strong> Facilita visualizar rendimientos comerciales de forma rápida con filtros unificados.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl overflow-hidden mb-16" id="sales-table">
      {/* Navy Title Bar */}
      <div className="px-6 py-5 bg-[#0f172a] border-b-2 border-slate-900 flex items-center justify-between gap-8">
         <div className="flex items-center gap-4 shrink-0">
            <div className="w-1.5 h-6 bg-white rounded-full shadow-lg" />
            <h3 className="text-[15px] font-black text-white uppercase tracking-[0.1em] whitespace-nowrap">Total de Ventas x Site</h3>
         </div>
          <div className="flex items-center gap-3 shrink-0">
            
            <button
                onClick={() => setIncludeGraduated(!includeGraduated)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/20 ${
                  includeGraduated 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <UserCheck size={12} className={includeGraduated ? 'animate-pulse' : ''} />
                {includeGraduated ? 'Quitar Egresados' : 'Agregar Egresados'}
              </button>

            {/* Month Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-blue-200 uppercase tracking-widest opacity-70">Mes</span>
              <select 
                value={monthFilter || data?.selectedMonth || ''}
                onChange={(e) => {
                  setMonthFilter(e.target.value)
                  setWeekFilter('')
                  setDayFilter('')
                  setStartDate('')
                  setEndDate('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[10px] font-bold px-2 py-1 outline-none transition-all cursor-pointer w-[95px]"
              >
                <option value="" className="text-black">Mes Actual</option>
                {data?.filterOptions.months.map(m => (
                  <option key={m} value={m} className="text-black">{m}</option>
                ))}
              </select>
            </div>

            {/* Week Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-blue-200 uppercase tracking-widest opacity-70">Semana</span>
              <select 
                value={weekFilter || data?.selectedWeek || ''}
                onChange={(e) => {
                  setWeekFilter(e.target.value)
                  setDayFilter('')
                  setStartDate('')
                  setEndDate('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[10px] font-bold px-2 py-1 outline-none transition-all cursor-pointer w-[75px]"
              >
                <option value="" className="text-black">Todas</option>
                {data?.filterOptions.weeks.map(w => (
                  <option key={w} value={w} className="text-black">S. {w}</option>
                ))}
              </select>
            </div>

            {/* Day Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-blue-200 uppercase tracking-widest opacity-70">Día</span>
              <select 
                value={dayFilter || data?.selectedDay || ''}
                onChange={(e) => {
                   setDayFilter(e.target.value)
                   setStartDate('')
                   setEndDate('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[10px] font-bold px-2 py-1 outline-none transition-all cursor-pointer w-[80px]"
              >
                <option value="" className="text-black">Todos</option>
                {data?.filterOptions.days.map(d => (
                  <option key={d} value={d} className="text-black">{d}</option>
                ))}
              </select>
            </div>

            <div className="w-[1px] h-8 bg-white/20 mx-2" />

            <CustomDateRangePicker 
              startDate={startDate}
              endDate={endDate}
              onRangeSelect={(start, end) => {
                setStartDate(start)
                setEndDate(end)
                setMonthFilter('')
                setWeekFilter('')
                setDayFilter('')
              }}
              onClear={() => {
                setStartDate('')
                setEndDate('')
              }}
            />

            <div className="w-[1px] h-8 bg-white/20 mx-2" />

            <div className="flex items-center gap-2">
              <button 
                onClick={() => copyElementToClipboard('sales-table')}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90 border border-white/20"
                title="Capturar Reporte"
              >
                <Camera size={16} />
              </button>

              <button 
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/20 rounded-full transition-all active:scale-95 group/btn"
              >
                <RefreshCw size={12} className={`text-white ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
                <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                  {refreshing ? '...' : 'Actualizar'}
                </span>
              </button>
            </div>
          </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 text-black">
              <th className="border-r-2 border-slate-900 border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black pl-8 w-3/4">
                Site / Vendedor
              </th>
              <th className="border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black text-center w-1/4">
                Total Ventas
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {data.supervisors.map((supervisor) => (
              <React.Fragment key={supervisor.id}>
                {/* SITE HEADER */}
                <tr 
                  className="group cursor-pointer hover:bg-sky-300 transition-all border-b-2 border-slate-900 bg-[#e0f2fe]"
                  onClick={() => toggleExpand(supervisor.id)}
                >
                  <td className="border-r-2 border-slate-900 px-8 py-4 flex items-center gap-4 relative bg-sky-200/50">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-600" />
                    <div className="text-blue-900 shrink-0">
                      {expandedSupervisors[supervisor.id] ? <ChevronDown size={14} strokeWidth={4} /> : <ChevronRight size={14} strokeWidth={4} />}
                    </div>
                    <span className="text-[14px] font-black text-blue-900 uppercase tracking-tight">
                      SITE: {supervisor.name}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-center font-black bg-sky-300/50 tabular-nums">
                     {formatNum(supervisor.totalVentas, true)}
                  </td>
                </tr>

                {/* SELLER ROWS */}
                {expandedSupervisors[supervisor.id] && (
                  supervisor.sellers.length > 0 ? (
                    supervisor.sellers.map((seller) => (
                      <tr 
                        key={seller.id} 
                        className={`hover:bg-slate-100 transition-colors border-b-2 border-slate-900 bg-white`}
                      >
                        <td className="border-r-2 border-slate-900 pl-16 pr-4 py-3 text-[12px] text-black uppercase tracking-tight bg-black/5">
                          {seller.name}
                        </td>
                        <td className="px-2 py-3 text-center text-black font-black bg-black/5">
                          {formatNum(seller.totalVentas)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b-2 border-slate-900">
                      <td colSpan={2} className="px-16 py-4 text-[11px] text-slate-400 font-bold italic">
                        Sin actividad registrada en este SITE
                      </td>
                    </tr>
                  )
                )}
              </React.Fragment>
            ))}

            {/* GRAND TOTAL */}
            <tr className="bg-[#0f172a] text-white border-t-4 border-slate-900">
              <td className="border-r-2 border-slate-800 px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                TOTAL Ventas GLOBAL
              </td>
              <td className="px-2 py-4 text-center text-[26px] font-black tabular-nums bg-white/10 text-white border-l border-slate-800">
                {data.grandTotal ?? 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="px-8 py-3.5 bg-[#0f172a] border-t-2 border-slate-900 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex gap-8">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> 
            High Fidelity Analytics
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
            Node Status: Operational
          </span>
        </div>
        <div className="flex items-center gap-3">
           <div className="h-1 w-1 bg-slate-700 rounded-full" />
           <span className="text-slate-500">v1.1.0 Sales Module</span>
        </div>
      </div>
    </div>
    </div>
  )
}
