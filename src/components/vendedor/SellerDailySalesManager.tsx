'use client'

import React, { useState, useMemo } from 'react'
import { 
  ShoppingBag, 
  ChevronRight, 
  Search, 
  Phone, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Smartphone,
  Hash,
  Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface SellerDailySalesManagerProps {
  rows: any[]
  scriptUrl: string | null
  sheetId: string
}

const STATUS_LIST = [
  'ALTA',
  'FVC',
  'SIN STATUS',
  'AA',
  'RECHAZO',
  'CHARGE BACK',
  'PROMESA DE VISITA'
]

export default function SellerDailySalesManager({ rows, scriptUrl, sheetId }: SellerDailySalesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  const now = new Date()
  
  const normalize = (str: string) => {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  }

  const currentDayName = useMemo(() => {
    const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
    return DAYS[now.getDay()]
  }, [now])

  // Filtrar solo las ventas del día de hoy
  const dailySales = useMemo(() => {
    const todayStr = normalize(currentDayName)
    
    return rows.filter(row => {
      const diaVenta = normalize(String(row['DIA DE LA VENTA'] || row['DIA'] || ''))
      const matchesDay = diaVenta === todayStr
      
      if (!matchesDay) return false
      
      const dn = String(row['TELEFONO'] || row['NUMERO'] || row['DN'] || '').toLowerCase()
      const name = String(row['NOMBRE'] || '').toLowerCase()
      return dn.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase())
    }).reverse() // Más recientes arriba
  }, [rows, currentDayName, searchTerm])

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
        // Recargar para sincronizar (Google Sheets es la fuente de verdad)
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
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-[#1a2744] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#1a2744]/20">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1a2744] uppercase tracking-tight">Gestión de Ventas</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} />
              Ventas de hoy: <span className="text-blue-600 font-black">{currentDayName}</span>
            </p>
          </div>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por DN o Nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
          />
        </div>
      </div>

      {/* Sales List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {dailySales.length > 0 ? (
            dailySales.map((sale, idx) => {
              const dn = sale['TELEFONO'] || sale['NUMERO'] || sale['DN'] || sale['NÚMERO']
              const name = sale['NOMBRE'] || 'Sin nombre'
              const status = sale['ESTATUS'] || 'SIN STATUS'
              const plan = sale['PLAN'] || 'No especificado'
              const hora = sale['HORA'] || '--:--'

              return (
                <motion.div 
                  key={`${dn}-${idx}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                >
                   {/* Background Glow */}
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Client Info */}
                    <div className="flex items-center gap-5">
                       <div className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                          <Smartphone size={28} />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="text-lg font-black text-[#1a2744] tracking-tight">{dn}</h3>
                             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase">{hora}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                             <span className="flex items-center gap-1.5"><User size={12} /> {name}</span>
                             <span className="flex items-center gap-1.5"><Hash size={12} /> {plan}</span>
                          </div>
                       </div>
                    </div>

                    {/* Middle: Current Status */}
                    <div className="flex flex-col lg:items-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 lg:text-center w-full">Estatus Actual</p>
                        <div className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest",
                          status === 'ALTA' ? "bg-emerald-50 text-emerald-600" :
                          status === 'RECHAZO' ? "bg-red-50 text-red-600" :
                          status === 'FVC' ? "bg-blue-50 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            status === 'ALTA' ? "bg-emerald-500" :
                            status === 'RECHAZO' ? "bg-red-500" :
                            "bg-blue-500"
                          )} />
                          {status}
                        </div>
                    </div>

                    {/* Right: Quick Action */}
                    <div className="flex items-center gap-3">
                       <div className="flex flex-col gap-1 w-full lg:w-auto">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cambiar a:</label>
                          <div className="flex items-center gap-2">
                            <select 
                                disabled={isUpdating === dn}
                                onChange={(e) => handleUpdateStatus(dn, e.target.value)}
                                value={status}
                                className="bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-[12px] font-black text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none cursor-pointer group-hover:border-blue-200 transition-all disabled:opacity-50 uppercase tracking-tighter w-full lg:w-48"
                              >
                                {STATUS_LIST.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                            {isUpdating === dn && (
                              <Loader2 size={18} className="animate-spin text-blue-600" />
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="bg-white py-24 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
               <div className="h-20 w-20 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6">
                  <Clock size={40} className="text-slate-200" />
               </div>
               <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sin Ventas Hoy</h4>
               <p className="text-slate-400 max-w-xs font-medium">Aún no has registrado ventas en el día de hoy o no coinciden con tu búsqueda.</p>
               <button 
                 onClick={() => setSearchTerm('')}
                 className="mt-6 text-blue-600 font-bold text-sm hover:underline"
               >
                 Limpiar filtros
               </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
