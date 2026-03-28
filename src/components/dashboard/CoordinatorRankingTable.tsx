'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Trophy,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Camera,
  Medal,
  Star,
  Users,
  Target,
  BarChart3
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface SellerRank {
  id: string
  name: string
  site: string
  fvc: number
  ventas: number
  altas: number
  conversion: number
}

interface RankingData {
  periodType: string
  periodValue: string
  availableWeeks: string[]
  availableMonths: string[]
  availableDays: string[]
  ranking: SellerRank[]
}

export default function CoordinatorRankingTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month'>('week')
  const [periodValue, setPeriodValue] = useState('')
  const [selectedDay, setSelectedDay] = useState('') // Specific day filter (Lunes-Sabado)
  const [rankingMode, setRankingMode] = useState<'ventas' | 'altas' | 'conversion'>('ventas')
  
  const [sortBy, setSortBy] = useState<'ventas' | 'altas' | 'conversion'>('ventas')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (!data) setLoading(true)
    
    try {
      const url = new URL('/api/admin/stats/ranking', window.location.origin)
      url.searchParams.set('periodType', periodType)
      if (periodValue) url.searchParams.set('periodValue', periodValue)
      if (periodType === 'week' && selectedDay) url.searchParams.set('day', selectedDay)
      if (supervisorId) url.searchParams.set('supervisorId', supervisorId)
      if (isRefresh) url.searchParams.set('force', 'true')
      
      const res = await fetch(url.toString())
      const result = await res.json()
      setData(result)
      
      if (!periodValue) {
        if (periodType === 'week' && result.availableWeeks.length > 0) {
          setPeriodValue(result.availableWeeks[result.availableWeeks.length - 1])
        } else if (periodType === 'month' && result.availableMonths.length > 0) {
          setPeriodValue(result.availableMonths[result.availableMonths.length - 1])
        } else if (periodType === 'day' && result.availableDays.length > 0) {
          setPeriodValue(result.availableDays[result.availableDays.length - 1])
        }
      }
    } catch (error) {
      console.error('Error fetching ranking:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodType, periodValue, selectedDay, supervisorId, data])

  useEffect(() => {
    if (rankingMode === 'ventas') setSortBy('ventas')
    if (rankingMode === 'altas') setSortBy('altas')
    if (rankingMode === 'conversion') setSortBy('conversion')
    setSortOrder('desc')
  }, [rankingMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSort = (field: 'ventas' | 'altas' | 'conversion') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const sortedRanking = [...(data?.ranking || [])].sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1
    const valA = a[sortBy]
    const valB = b[sortBy]
    return (valA - valB) * factor
  })

  if (loading && !data) {
    return (
      <div className="bg-slate-900 rounded-[2rem] p-12 flex flex-col items-center justify-center border-2 border-slate-800 shadow-2xl min-h-[400px]">
        <div className="relative">
          <RotateCw className="text-blue-500 animate-spin mb-4" size={48} />
          <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse" />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Analizando métricas nacionales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header & Controls Section */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 lg:p-10 border-b border-slate-800/50 bg-gradient-to-br from-slate-900 to-slate-800/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative group/trophy">
                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 group-hover/trophy:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                  <Trophy className="text-amber-500" size={32} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
              </div>
              <div>
                <h1 className="text-[24px] font-black text-white uppercase tracking-tighter leading-none mb-2">Ranking de Vendedores</h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    Consolidado Global • {periodType === 'day' ? 'Diario' : periodType === 'week' ? 'Semanal' : 'Mensual'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
               {/* Period Type Switcher */}
               <div className="flex bg-slate-950/50 rounded-2xl p-1.5 border border-slate-800 shadow-inner">
                  {(['day', 'week', 'month'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setPeriodType(t)
                        setPeriodValue('')
                        setSelectedDay('')
                      }}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                        periodType === t 
                        ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] scale-105' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {t === 'day' ? 'Día' : t === 'week' ? 'Semana' : 'Mes'}
                    </button>
                  ))}
               </div>

               {/* Period Select Selector */}
               <div className="relative group/select min-w-[160px]">
                  <select 
                    value={periodValue}
                    onChange={(e) => setPeriodValue(e.target.value)}
                    className="appearance-none bg-slate-950/80 text-white text-[11px] font-black pl-5 pr-10 py-3 rounded-2xl outline-none cursor-pointer uppercase tracking-widest border border-slate-800 focus:border-blue-500 transition-colors w-full shadow-lg"
                  >
                    <option value="" className="bg-slate-900">Periodo...</option>
                    {periodType === 'week' && data?.availableWeeks.map(w => (
                      <option key={w} value={w} className="bg-slate-900">Semana {w}</option>
                    ))}
                    {periodType === 'month' && data?.availableMonths.map(m => (
                      <option key={m} value={m} className="bg-slate-900">{m}</option>
                    ))}
                    {periodType === 'day' && data?.availableDays.map(d => (
                      <option key={d} value={d} className="bg-slate-900">{d}</option>
                    ))}
                  </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover/select:text-blue-500 transition-colors" size={14} />
               </div>

               {/* Day Selector (Conditional for Week) */}
               {periodType === 'week' && (
                 <div className="relative group/select min-w-[140px] animate-in slide-in-from-left-4 duration-300">
                    <select 
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="appearance-none bg-blue-600/10 text-blue-400 text-[11px] font-black pl-5 pr-10 py-3 rounded-2xl outline-none cursor-pointer uppercase tracking-widest border border-blue-500/30 focus:border-blue-500 transition-all w-full shadow-lg"
                    >
                      <option value="" className="bg-slate-900">Todos los días</option>
                      {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(d => (
                        <option key={d} value={d} className="bg-slate-900">{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
                 </div>
               )}

               <div className="flex items-center gap-3">
                 <button 
                    onClick={() => copyElementToClipboard('ranking-table')}
                    className="p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl transition-all active:scale-90 shadow-xl shadow-sky-500/20 border-b-4 border-sky-700"
                    title="Capturar Tabla"
                 >
                    <Camera size={20} />
                 </button>

                 <button 
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all active:rotate-180 border border-slate-700 shadow-xl"
                 >
                    <RotateCw size={20} className={refreshing ? 'animate-spin' : ''} />
                 </button>
               </div>
            </div>
          </div>

          {/* Ranking Mode Selection Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {(['ventas', 'altas', 'conversion'] as const).map((mode) => {
              const isActive = rankingMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setRankingMode(mode)}
                  className={`flex items-center gap-5 p-5 rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden group/item ${
                    isActive 
                    ? 'bg-blue-600/5 border-blue-500/50 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.2)]' 
                    : 'bg-slate-950/20 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-4 rounded-[1.25rem] transition-all duration-500 ${
                    isActive 
                    ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                    : 'bg-slate-800/50 text-slate-500 group-hover/item:text-slate-300'
                  }`}>
                    {mode === 'ventas' ? <BarChart3 size={22} /> : mode === 'altas' ? <Target size={22} /> : <Star size={22} />}
                  </div>
                  <div className="text-left">
                    <span className={`block text-[12px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {mode === 'ventas' ? 'Total Ventas' : mode === 'altas' ? 'Total Altas' : 'Rendimiento'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500/60 uppercase tracking-tighter">
                      Criterio: {mode === 'ventas' ? 'Volumen DN' : mode === 'altas' ? 'Efectividad' : 'Ratio Altas/FVC'}
                    </span>
                  </div>
                  
                  {isActive && (
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Medal size={60} className="rotate-12" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* The Premium Table Content */}
        <div className="overflow-x-auto" id="ranking-table">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-900">
                <th className="px-10 py-6 text-[11px] font-[900] text-slate-900 uppercase tracking-widest border-r border-slate-200/60 w-24 text-center">Rank</th>
                <th className="px-10 py-6 text-[11px] font-[900] text-slate-900 uppercase tracking-widest border-r border-slate-200/60">Vendedor / Equipo / Site</th>
                <th 
                  className={`px-10 py-6 text-[11px] font-[900] uppercase tracking-widest border-r border-slate-200/60 cursor-pointer hover:bg-slate-200 transition-colors text-center ${rankingMode === 'ventas' ? 'bg-blue-100 text-blue-700' : 'text-slate-900'}`}
                  onClick={() => { setRankingMode('ventas'); handleSort('ventas'); }}
                >
                  <div className="flex items-center justify-center gap-2">
                    Total Ventas
                    {sortBy === 'ventas' && (sortOrder === 'desc' ? <ChevronDown size={14} className="animate-bounce" /> : <ChevronUp size={14} />)}
                  </div>
                </th>
                <th className="px-10 py-6 text-[11px] font-[900] text-slate-900 uppercase tracking-widest border-r border-slate-200/60 text-center">
                  Total FVC
                </th>
                <th 
                  className={`px-10 py-6 text-[11px] font-[900] uppercase tracking-widest border-r border-slate-200/60 cursor-pointer hover:bg-slate-200 transition-colors text-center ${rankingMode === 'altas' ? 'bg-amber-100 text-amber-700' : 'text-slate-900'}`}
                  onClick={() => { setRankingMode('altas'); handleSort('altas'); }}
                >
                  <div className="flex items-center justify-center gap-2">
                    Total Altas
                    {sortBy === 'altas' && (sortOrder === 'desc' ? <ChevronDown size={14} className="animate-bounce" /> : <ChevronUp size={14} />)}
                  </div>
                </th>
                <th 
                  className={`px-10 py-6 text-[11px] font-[900] uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors text-center ${rankingMode === 'conversion' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-900'}`}
                  onClick={() => { setRankingMode('conversion'); handleSort('conversion'); }}
                >
                  <div className="flex items-center justify-center gap-2">
                    Conversión %
                    {sortBy === 'conversion' && (sortOrder === 'desc' ? <ChevronDown size={14} className="animate-bounce" /> : <ChevronUp size={14} />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedRanking.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <div className="p-8 bg-slate-100 rounded-full">
                        <Users size={64} strokeWidth={1} />
                      </div>
                      <p className="text-[14px] font-[800] uppercase tracking-widest text-slate-400">Sin datos registrados para este periodo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRanking.map((s, idx) => {
                  const position = idx + 1
                  const isTop3 = position <= 3
                  return (
                    <tr key={s.id} className={`group hover:bg-slate-50 transition-all duration-300 border-b border-slate-100 ${isTop3 ? 'bg-slate-50/70' : ''}`}>
                      <td className="px-10 py-5 text-center border-r border-slate-100 relative overflow-hidden">
                        <div className="flex justify-center items-center relative z-10">
                          {position === 1 ? (
                            <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex flex-col items-center justify-center border-4 border-amber-200 shadow-[0_5px_15px_rgba(245,158,11,0.4)] relative">
                               <Medal size={20} />
                               <span className="text-[9px] font-black leading-none mt-1">1º</span>
                            </div>
                          ) : position === 2 ? (
                            <div className="w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex flex-col items-center justify-center border-2 border-white shadow-lg">
                               <Medal size={16} />
                               <span className="text-[8px] font-black leading-none mt-0.5">2º</span>
                            </div>
                          ) : position === 3 ? (
                            <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex flex-col items-center justify-center border-2 border-white shadow-lg">
                               <Medal size={16} />
                               <span className="text-[8px] font-black leading-none mt-0.5">3º</span>
                            </div>
                          ) : (
                            <div className="text-[14px] font-black text-slate-400 tabular-nums">#{position}</div>
                          )}
                        </div>
                        {isTop3 && (
                          <div className={`absolute top-0 right-0 w-1 h-full ${position === 1 ? 'bg-amber-500' : position === 2 ? 'bg-slate-400' : 'bg-orange-400'}`} />
                        )}
                      </td>
                      <td className="px-10 py-5 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[15px] font-[900] text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                             {s.name}
                             {isTop3 && <Star size={14} className="fill-amber-400 text-amber-400" />}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm">
                              {s.site}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Metric Columns */}
                      <td className={`px-10 py-5 text-center border-r border-slate-100 tabular-nums ${rankingMode === 'ventas' ? 'bg-blue-600/[0.03]' : ''}`}>
                        <span className={`text-[18px] font-black ${rankingMode === 'ventas' ? 'text-blue-700' : 'text-slate-500'}`}>{s.ventas}</span>
                      </td>

                      <td className="px-10 py-5 text-center border-r border-slate-100 tabular-nums">
                        <span className="text-[18px] font-black text-slate-400">{s.fvc}</span>
                      </td>
                      
                      <td className={`px-10 py-5 text-center border-r border-slate-100 tabular-nums ${rankingMode === 'altas' ? 'bg-amber-600/[0.03]' : ''}`}>
                        <div className={`inline-flex items-center px-5 py-2 rounded-2xl border-2 transition-all duration-500 ${
                          s.altas > 0 
                          ? (rankingMode === 'altas' ? 'bg-amber-500 border-amber-300 text-white shadow-lg scale-110' : 'bg-amber-50 border-amber-100 text-amber-700 shadow-sm') 
                          : 'bg-slate-50 border-slate-200 text-slate-300 opacity-50'
                        }`}>
                           <span className="text-[18px] font-black">{s.altas}</span>
                        </div>
                      </td>
                      
                      <td className={`px-10 py-5 text-center ${rankingMode === 'conversion' ? 'bg-emerald-600/[0.03]' : ''}`}>
                        <div className="flex flex-col items-center gap-2">
                          <span className={`text-[20px] font-black ${
                            s.conversion >= 65 ? 'text-emerald-600' : s.conversion >= 40 ? 'text-amber-500' : 'text-slate-400'
                          }`}>{s.conversion}%</span>
                          <div className={`w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-[1px] ${rankingMode === 'conversion' ? 'scale-110' : ''}`}>
                             <div 
                                className={`h-full transition-all duration-1000 rounded-full ${
                                   s.conversion >= 65 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : s.conversion >= 40 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(s.conversion, 100)}%` }}
                             />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
