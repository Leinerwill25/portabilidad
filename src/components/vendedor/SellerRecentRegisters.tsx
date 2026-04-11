'use client'

import React, { useState, useMemo } from 'react'
import { 
  Layers, 
  ChevronRight, 
  Database, 
  Search, 
  Calendar,
  Clock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Loader2,
  Edit2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface SellerRecentRegistersProps {
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

export default function SellerRecentRegisters({ rows, scriptUrl, sheetId }: SellerRecentRegistersProps) {
  const [activeTab, setActiveTab] = useState<'seguimientos' | 'todos'>('seguimientos')
  const [currentPage, setCurrentPage] = useState(1)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  const ITEMS_PER_PAGE = 6
  const now = new Date()
  
  const currentWeek = useMemo(() => {
    const d = new Date(now.getTime())
    d.setHours(0, 0, 0, 0)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const diffDays = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
    return Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)
  }, [now])

  const currentDayName = useMemo(() => {
    const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
    return DAYS[now.getDay()]
  }, [now])

  const handleTabChange = (tab: 'seguimientos' | 'todos') => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  // 2. Filtrado de Datos
  const sortedRows = useMemo(() => {
    return [...rows].reverse() // Más recientes arriba
  }, [rows])

  const followUpRows = useMemo(() => {
    return sortedRows.filter(row => {
      const rowWeek = String(row['SEMANA FVC'] || '').trim()
      const rowDay = String(row['DIA FVC'] || '').trim().toUpperCase()
      
      const targetWeek = currentWeek < 10 ? `0${currentWeek}` : `${currentWeek}`
      
      return rowWeek === targetWeek && rowDay === currentDayName
    })
  }, [sortedRows, currentWeek, currentDayName])

  // 3. Lógica de Actualización
  const handleUpdateStatus = async (dn: string, newStatus: string) => {
    if (!scriptUrl) return
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
        toast.success(`DN ${dn} actualizado a ${newStatus}`)
        // Recargar la página para ver cambios (o actualizar estado local si fuera complejo)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar estatus')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setIsUpdating(null)
    }
  }

  const displayRows = activeTab === 'seguimientos' ? followUpRows : sortedRows
  const totalPages = Math.ceil(displayRows.length / ITEMS_PER_PAGE)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return displayRows.slice(start, start + ITEMS_PER_PAGE)
  }, [displayRows, currentPage])

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
      {/* Header & Tabs */}
      <div className="px-8 pt-8 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20">
               <Layers size={18} />
            </div>
            <h3 className="font-black text-slate-900 text-[13px] uppercase tracking-[0.2em]">Registros</h3>
          </div>
          
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
            <button 
              onClick={() => handleTabChange('seguimientos')}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'seguimientos' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Seguimientos Hoy ({followUpRows.length})
            </button>
            <button 
              onClick={() => handleTabChange('todos')}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'todos' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Historial ({rows.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {paginatedRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[30%]">DN / Cliente</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Estatus</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">FVC Citado</th>
                  <th className="px-5 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedRows.map((row, idx) => {
                  const dn = row['TELEFONO'] || row['NUMERO'] || row['DN'] || row['NÚMERO']
                  const name = row['NOMBRE'] || 'Sin nombre'
                  const status = row['ESTATUS'] || 'SIN STATUS'
                  const fvcDay = row['DIA FVC']
                  const fvcWeek = row['SEMANA FVC']

                  return (
                    <motion.tr 
                      key={`${dn}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                             <Phone size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 text-[13px] leading-tight">{dn}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase truncate max-w-[120px]">{name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                          status === 'ALTA' ? 'bg-emerald-50 text-emerald-600' :
                          status === 'RECHAZO' ? 'bg-red-50 text-red-600' :
                          status === 'FVC' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${
                            status === 'ALTA' ? 'bg-emerald-500' :
                            status === 'RECHAZO' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          {status}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                           <Calendar size={12} className="text-slate-400 shrink-0" />
                           <span className="text-[11px] font-bold">{fvcDay}</span>
                           <span className="text-[9px] text-slate-300 font-black px-1.5 py-0.5 bg-slate-50 rounded-md">W{fvcWeek}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select 
                            disabled={isUpdating === dn}
                            onChange={(e) => handleUpdateStatus(dn, e.target.value)}
                            value={status}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white transition-all disabled:opacity-50 uppercase tracking-tighter max-w-[110px] truncate"
                          >
                            <option value="" disabled>Status</option>
                            {STATUS_LIST.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          {isUpdating === dn && (
                            <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all uppercase tracking-widest"
                  >
                    Anterior
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all uppercase tracking-widest"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
               {activeTab === 'seguimientos' ? (
                 <CheckCircle2 size={40} className="text-emerald-200" />
               ) : (
                 <Database size={40} className="text-slate-200" />
               )}
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">
              {activeTab === 'seguimientos' ? '¡Todo al día!' : 'Sin registros aún'}
            </h4>
            <p className="text-slate-400 max-w-xs font-medium">
              {activeTab === 'seguimientos' 
                ? 'No tienes seguimientos programados para hoy según tu agenda FVC.' 
                : 'Tus ventas sincronizadas aparecerán aquí automáticamente.'}
            </p>
          </div>
        )}
      </div>

      <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
           {activeTab === 'seguimientos' ? `Hoy es ${currentDayName} (Semana ${currentWeek})` : `Mostrando últimos 50 registros`}
        </p>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500" />
           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Base de Datos Activa</span>
        </div>
      </div>
    </div>
  )
}
