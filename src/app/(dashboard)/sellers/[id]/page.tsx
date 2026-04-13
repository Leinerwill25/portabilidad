'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, FileSpreadsheet, ChevronLeft, Loader2, Mail, Phone, Globe, X, ExternalLink, Edit2, BarChart3, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'
import { extractSheetId } from '@/lib/sheets/scraper'
import SellerPerformanceModule from '@/components/dashboard/SellerPerformanceModule'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface Seller {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface Sheet {
  id: string;
  seller_id: string;
  sheet_url: string;
  sheet_id: string;
  sheet_name: string;
  display_name: string;
  script_url: string | null;
  created_at: string;
}

export default function SellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sellerId } = use(params)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [editingSheet, setEditingSheet] = useState<Sheet | null>(null)
  const [activeTab, setActiveTab] = useState<'sheets' | 'performance'>('performance')
  
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const [sellerRes, sheetsRes] = await Promise.all([
      supabase.from('sellers').select('*').eq('id', sellerId).eq('created_by', user?.id).single(),
      supabase.from('seller_sheets')
        .select('*, sellers!inner(*)')
        .eq('seller_id', sellerId)
        .eq('sellers.created_by', user?.id)
        .order('created_at', { ascending: false })
    ])

    if (sellerRes.error) {
      toast.error('Error cargando vendedor')
    } else {
      setSeller(sellerRes.data)
      setSheets(sheetsRes.data || [])
    }
    setLoading(false)
  }, [sellerId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeleteSheet = async (id: string) => {
    if (!confirm('¿Eliminar este sheet?')) return

    const { error } = await supabase.from('seller_sheets').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Sheet eliminado')
      fetchData()
    }
  }

  const handleEditSheet = (sheet: Sheet) => {
    setEditingSheet(sheet)
    setShowEditSheet(true)
  }

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#1a56db]" size={40} />
    </div>
  )

  if (!seller) return (
    <div className="text-center py-20 bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
      <h2 className="text-xl font-bold text-[#1a2744]">Vendedor no encontrado</h2>
      <Link href="/sellers" className="text-[#1a56db] font-bold mt-4 inline-block hover:underline">Volver a la lista</Link>
    </div>
  )

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <Link 
          href="/sellers" 
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6b7280] hover:text-[#1a56db] transition-colors uppercase tracking-wider mb-4"
        >
          <ChevronLeft size={14} />
          Volver al Directorio
        </Link>
        <div className="bg-white border border-[#e5e7eb] p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#1a56db] shadow-sm">
                <span className="text-[20px] font-bold">{seller.first_name[0]}{seller.last_name[0]}</span>
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-[#1a2744] mb-1">{seller.first_name} {seller.last_name}</h1>
                <div className="flex items-center gap-4 text-[13px] text-[#6b7280]">
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-[#9ca3af]" /> {seller.email || 'Sin correo asociado'}</span>
                  <span className="flex items-center gap-1.5"><Phone size={14} className="text-[#9ca3af]" /> {seller.phone || 'Sin teléfono'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowAddSheet(true)}
              className="bg-[#1a56db] hover:bg-[#1649c0] text-white text-[13px] font-bold px-6 py-2.5 rounded-md transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              Vincular Google Sheet
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl w-fit border border-slate-200">
        <button 
          onClick={() => setActiveTab('performance')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all",
            activeTab === 'performance' ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <BarChart3 size={16} />
          Rendimiento Mensual
        </button>
        <button 
          onClick={() => setActiveTab('sheets')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all",
            activeTab === 'sheets' ? "bg-white text-[#1a56db] shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Settings size={16} />
          Configuración Excel
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'performance' ? (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SellerPerformanceModule sellerId={sellerId} />
          </motion.div>
        ) : (
          <motion.div
            key="sheets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-[14px] font-bold text-[#1a2744] flex items-center gap-2 uppercase tracking-widest px-1">
              <FileSpreadsheet className="text-[#10b981]" size={16} />
              Bases de Datos Vinculadas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {sheets.length === 0 ? (
                  <div className="col-span-full py-16 bg-[#f8fafc] border border-dashed border-[#e5e7eb] rounded-xl flex flex-col items-center justify-center text-[#9ca3af] gap-3">
                    <Globe size={32} className="opacity-40" />
                    <p className="text-[13px] font-medium">No se han vinculado hojas de cálculo para este vendedor.</p>
                  </div>
                ) : (
                  sheets.map((sheet) => (
                    <motion.div
                      key={sheet.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white border border-[#e5e7eb] p-5 rounded-xl group hover:border-[#bfdbfe] transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-[#f0fdf4] text-[#166534] p-2 rounded-md border border-[#bbf7d0]">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEditSheet(sheet)}
                            className="p-1.5 text-[#9ca3af] hover:text-[#1a56db] hover:bg-[#eff6ff] rounded-md transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSheet(sheet.id)}
                            className="p-1.5 text-[#9ca3af] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-[15px] font-bold text-[#1a2744] mb-1 truncate">{sheet.display_name}</h3>
                      <div className="flex items-center gap-2 mb-4">
                         <p className="text-[11px] text-[#6b7280]">Pestaña: <span className="font-mono text-[#374151]">{sheet.sheet_name}</span></p>
                         {sheet.script_url && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 uppercase tracking-tighter">
                              Sincronizable
                            </span>
                         )}
                      </div>
                      
                      <a 
                        href={sheet.sheet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-[#f9fafb] hover:bg-[#f1f5f9] border border-[#e5e7eb] text-[#374151] text-[12px] font-bold py-2.5 rounded-md transition-all group-hover:bg-white"
                      >
                        <ExternalLink size={14} className="text-[#1a56db]" />
                        Visualizar en Google Sheets
                      </a>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddSheet && (
          <AddSheetModal 
            sellerId={sellerId}
            onClose={() => setShowAddSheet(false)} 
            onSuccess={() => { fetchData(); setShowAddSheet(false); }} 
          />
        )}
        {showEditSheet && editingSheet && (
          <EditSheetModal 
            sheet={editingSheet}
            onClose={() => { setShowEditSheet(false); setEditingSheet(null); }} 
            onSuccess={() => { fetchData(); setShowEditSheet(false); setEditingSheet(null); }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EditSheetModal({ sheet, onClose, onSuccess }: { sheet: Sheet, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    sheet_url: sheet.sheet_url || '',
    display_name: sheet.display_name || '',
    sheet_name: sheet.sheet_name || 'Hoja1',
    script_url: sheet.script_url || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const sheetId = extractSheetId(formData.sheet_url) || sheet.sheet_id

    const { error } = await supabase.from('seller_sheets')
      .update({
        sheet_url: formData.sheet_url,
        sheet_id: sheetId,
        sheet_name: formData.sheet_name,
        display_name: formData.display_name,
        script_url: formData.script_url || null,
      })
      .eq('id', sheet.id)

    if (error) {
      toast.error('Error al actualizar: ' + error.message)
    } else {
      toast.success('Excel actualizado correctamente')
      onSuccess()
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white p-8 rounded-xl border border-[#e5e7eb] shadow-2xl text-left"
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e5e7eb]">
          <h2 className="text-[18px] font-bold text-[#1a2744]">Editar Configuración de Excel</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-md text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Nombre Descriptivo</label>
            <input
              required
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">URL del Google Sheet</label>
            <input
              required
              type="url"
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all"
              value={formData.sheet_url}
              onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Nombre de la Pestaña</label>
            <input
              required
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all"
              value={formData.sheet_name}
              onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5 flex items-center justify-between">
              URL Script Sincronización
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Activo</span>
            </label>
            <input
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-blue-50 border border-blue-200 rounded-md px-4 py-2.5 text-[13px] text-blue-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
              value={formData.script_url}
              onChange={(e) => setFormData({ ...formData, script_url: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-[#e5e7eb] text-[#374151] text-[13px] font-bold py-3 rounded-md hover:bg-[#f9fafb] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1a56db] hover:bg-[#1649c0] text-white text-[13px] font-bold py-3 rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Actualizar Configuración'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function AddSheetModal({ sellerId, onClose, onSuccess }: { sellerId: string, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    sheet_url: '',
    display_name: '',
    sheet_name: 'Hoja1',
    script_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const sheetId = extractSheetId(formData.sheet_url)
    if (!sheetId) {
      toast.error('URL de Google Sheet inválida')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('seller_sheets').insert({
      seller_id: sellerId,
      sheet_url: formData.sheet_url,
      sheet_id: sheetId,
      sheet_name: formData.sheet_name,
      display_name: formData.display_name,
      script_url: formData.script_url || null,
    })

    if (error) {
      toast.error('Error al vincular sheet: ' + error.message)
    } else {
      toast.success('Sheet vinculado correctamente')
      onSuccess()
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white p-8 rounded-xl border border-[#e5e7eb] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e5e7eb]">
          <h2 className="text-[18px] font-bold text-[#1a2744]">Vincular Nueva Base de Datos</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-md text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Nombre Descriptivo</label>
            <input
              required
              placeholder="Ej: Base Mensual - Marzo 2024"
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">URL de Google Sheets</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={14} />
              <input
                required
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-white border border-[#e5e7eb] rounded-md pl-10 pr-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
                value={formData.sheet_url}
                onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Nombre de la Pestaña</label>
            <input
              required
              placeholder="Ej: BDD o Hoja1"
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
              value={formData.sheet_name}
              onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5 flex items-center justify-between">
              URL Script Sincronización
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Opcional</span>
            </label>
            <input
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
              value={formData.script_url}
              onChange={(e) => setFormData({ ...formData, script_url: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 leading-tight">Para habilitar que el vendedor guarde datos directamente desde el dashboard.</p>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-[#e5e7eb] text-[#374151] text-[13px] font-bold py-3 rounded-md hover:bg-[#f9fafb] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1a56db] hover:bg-[#1649c0] text-white text-[13px] font-bold py-3 rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Confirmando...' : 'Vincular Base de Datos'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
