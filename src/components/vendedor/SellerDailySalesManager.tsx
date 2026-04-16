'use client'

import React, { useState, useMemo } from 'react'
import { 
  ShoppingBag, 
  Search, 
  Clock,
  Loader2,
  Calendar,
  Smartphone,
  Hash,
  User,
  TrendingUp,
  CheckCircle2,
  Zap,
  ArrowRight,
  Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getLocalTimeDate, getGoogleSheetsWeek } from '@/lib/sheets/scraper'

interface SellerDailySalesManagerProps {
  rows: any[]
  scriptUrl: string | null
  sheetId: string
}

type Period = 'HOY' | 'SEMANA' | 'MES'

const STATUS_LIST = [
  'ALTA',
  'FVC',
  'SIN STATUS',
  'AA',
  'RECHAZO',
  'CHARGE BACK',
  'PROMESA DE VISITA'
]

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]

export default function SellerDailySalesManager({ rows, scriptUrl, sheetId }: SellerDailySalesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activePeriod, setActivePeriod] = useState<Period>('HOY')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  const now = getLocalTimeDate()
  
  const normalize = (str: string) => {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  }

  const currentDayName = useMemo(() => {
    const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
    return DAYS[now.getDay()]
  }, [now])

  const currentMonthName = useMemo(() => MONTHS_ES[now.getMonth()], [now])
  const currentWeekNumber = useMemo(() => getGoogleSheetsWeek(now), [now])

  // Filtrar según el periodo seleccionado
  const filteredSales = useMemo(() => {
    const todayStr = normalize(currentDayName)
    const monthStr = normalize(currentMonthName)
    
    return rows.filter(row => {
      // 1. Filtro por Periodo
      let matchesPeriod = false
      
      if (activePeriod === 'HOY') {
        const diaVenta = normalize(String(row['DIA DE LA VENTA'] || row['DIA'] || ''))
        matchesPeriod = diaVenta === todayStr
      } else if (activePeriod === 'SEMANA') {
        const rowWeek = parseInt(String(row['SEMANA'] || '0'))
        matchesPeriod = rowWeek === currentWeekNumber
      } else if (activePeriod === 'MES') {
        const rowMonth = normalize(String(row['MES'] || ''))
        matchesPeriod = rowMonth === monthStr
      }

      if (!matchesPeriod) return false

      // 2. Filtro por búsqueda
      const dn = String(row['TELEFONO'] || row['NUMERO'] || row['DN'] || row['NÚMERO'] || '').toLowerCase()
      const name = String(row['NOMBRE'] || '').toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      
      return dn.includes(searchLower) || name.includes(searchLower)
    }).reverse() // Más recientes arriba
  }, [rows, activePeriod, currentDayName, currentMonthName, currentWeekNumber, searchTerm])

  // Estadísticas del periodo seleccionado
  const stats = useMemo(() => {
    const total = filteredSales.length
    const altas = filteredSales.filter(s => normalize(String(s['ESTATUS'] || '')) === 'alta').length
    const fvc = filteredSales.filter(s => normalize(String(s['ESTATUS'] || '')) === 'fvc').length
    return { total, altas, fvc }
  }, [filteredSales])

  const handleUpdateStatus = async (dn: string, newStatus: string) => {
    if (!scriptUrl) {
      toast.error('No hay Script URL configurado para esta hoja')
      return
    }
    setIsUpdating(dn)

    try {
      const res = await fetch('/api/seller/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptUrl, 
          spreadsheetId: sheetId,
          dn, 
          status: newStatus 
        })
      })

      const result = await res.json()
      if (res.ok && result.success) {
        toast.success(`DN ${dn} actualizado exitosamente`)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar status')
      }
    } catch (err) {
      toast.error('Error de conexión con el servidor')
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Ventas', value: stats.total, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Altas', value: stats.altas, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'FVC', value: stats.fvc, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <span className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</span>
            </div>
            <div className={cn("h-14 w-14 rounded-[1.75rem] flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Control Panel Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#1a2744] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#1a2744]/20">
                  <Filter size={18} />
                </div>
                <h2 className="text-xl font-black text-[#1a2744] uppercase tracking-tight">Filtrar Registros</h2>
             </div>
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-13">
               Visualizando: <span className="text-blue-600 font-black">{activePeriod}</span>
             </p>
          </div>

          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por DN o Nombre del cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-[2rem] pl-14 pr-8 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1.5 bg-slate-100/50 rounded-[1.5rem] w-full md:w-fit">
          {(['HOY', 'SEMANA', 'MES'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={cn(
                "flex-1 md:flex-none px-8 py-2.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all",
                activePeriod === p 
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200/50 scale-100" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {p === 'HOY' ? 'Hoy' : p === 'SEMANA' ? 'Esta Semana' : 'Este Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List */}
      <div className="grid grid-cols-1 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredSales.length > 0 ? (
            filteredSales.map((sale, idx) => {
              const dn = sale['TELEFONO'] || sale['NUMERO'] || sale['DN'] || sale['NÚMERO']
              const name = sale['NOMBRE'] || 'Sin nombre'
              const status = sale['ESTATUS'] || 'SIN STATUS'
              const plan = sale['PLAN'] || 'No especificado'
              const hora = sale['HORA'] || '--:--'
              const dia = sale['DIA DE LA VENTA'] || sale['DIA'] || ''

              return (
                <motion.div 
                  key={`${dn}-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[2.5rem] border border-slate-200/60 p-7 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative"
                >
                   {/* Gradient Accent */}
                   <div className={cn(
                     "absolute top-0 left-0 w-1.5 h-full",
                     status === 'ALTA' ? 'bg-emerald-500' : 
                     status === 'FVC' ? 'bg-blue-500' : 
                     status === 'RECHAZO' ? 'bg-red-500' : 'bg-slate-200'
                   )} />

                   <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    {/* Left: Client Info */}
                    <div className="flex items-center gap-6">
                       <div className="h-16 w-16 bg-[#f8fafc] border border-slate-100 rounded-[1.75rem] flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                          <Smartphone size={32} />
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-1.5">
                             <h3 className="text-xl font-black text-[#1a2744] tracking-tight">{dn}</h3>
                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase">
                                <Clock size={12} /> {hora}
                             </div>
                             {activePeriod !== 'HOY' && dia && (
                               <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase font-mono tracking-tighter">{dia}</span>
                             )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-500 font-bold uppercase tracking-wider">
                             <span className="flex items-center gap-2"><User size={14} className="text-slate-300" /> {name}</span>
                             <span className="flex items-center gap-2 font-mono"><Hash size={14} className="text-slate-300" /> {plan}</span>
                          </div>
                       </div>
                    </div>

                    {/* Middle: Current Status */}
                    <div className="flex flex-col lg:items-center px-6 border-slate-100 lg:border-x">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-3 lg:text-center w-full">Estatus Actual</p>
                        <div className={cn(
                          "inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-widest",
                          status === 'ALTA' ? "bg-emerald-50 text-emerald-600" :
                          status === 'RECHAZO' ? "bg-red-50 text-red-600" :
                          status === 'FVC' ? "bg-blue-50 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'ALTA' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                            status === 'RECHAZO' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                            status === 'FVC' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" :
                            "bg-slate-400"
                          )} />
                          {status}
                        </div>
                    </div>

                    {/* Right: Quick Action */}
                    <div className="min-w-[240px]">
                       <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cambiar a:</label>
                          <div className="relative group/select">
                            <select 
                                disabled={isUpdating === dn}
                                onChange={(e) => handleUpdateStatus(dn, e.target.value)}
                                value={status}
                                className="w-full appearance-none bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-[13px] font-black text-slate-800 focus:bg-white focus:ring-8 focus:ring-blue-500/5 outline-none cursor-pointer transition-all disabled:opacity-50 uppercase tracking-tight"
                              >
                                {STATUS_LIST.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-blue-600 transition-colors">
                              {isUpdating === dn ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <ArrowRight size={18} />
                              )}
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white py-32 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-8"
            >
               <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8">
                  <Clock size={48} className="text-slate-200" />
               </div>
               <h4 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Sin Ventas Registradas</h4>
               <p className="text-slate-400 max-w-sm font-medium leading-relaxed mb-8">
                 No hemos encontrado ventas para el periodo <span className="text-blue-600 font-bold">{activePeriod}</span>. Prueba cambiando el filtro o realizando otra búsqueda.
               </p>
               <button 
                 onClick={() => { setSearchTerm(''); setActivePeriod('MES'); }}
                 className="px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-blue-500/10"
               >
                 Ver todas este mes
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

