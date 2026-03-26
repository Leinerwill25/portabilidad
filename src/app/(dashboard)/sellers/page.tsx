'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, User, Phone, Mail, ChevronRight, Loader2, Trash2, X, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

export default function SellersPage() {
  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchSellers()
  }, [])

  const fetchSellers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error cargando vendedores')
    } else {
      setSellers(data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('¿Estás seguro de eliminar este vendedor?')) return

    const { error } = await supabase.from('sellers').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Vendedor eliminado')
      fetchSellers()
    }
  }

  const filteredSellers = sellers.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a2744] mb-1">Directorio de Vendedores</h1>
          <p className="text-[13px] text-[#6b7280]">Administración de afiliados y bases de datos asignadas</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#1a56db] hover:bg-[#1649c0] text-white text-[13px] font-bold px-6 py-2.5 rounded-md transition-all shadow-sm flex items-center gap-2 active:scale-95"
        >
          <Plus size={16} />
          Nuevo Registro
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] text-[#374151] rounded-lg pl-10 pr-4 py-2 text-[13px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Vendedor</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest text-center">Contacto</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest text-center">Alta</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#9ca3af]">
                    <Loader2 className="animate-spin inline-block mr-2" size={18} />
                    Sincronizando registros...
                  </td>
                </tr>
              ) : filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#9ca3af] italic">
                    No se han encontrado registros que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller, index) => (
                  <tr key={seller.id} className="hover:bg-[#f8fafc] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-[#eff6ff] rounded-full flex items-center justify-center text-[#1a56db] font-bold text-xs border border-[#bfdbfe]">
                          {seller.first_name[0]}{seller.last_name[0]}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#1a2744] truncate max-w-[200px]">
                            {seller.first_name} {seller.last_name}
                          </p>
                          <p className="text-[11px] text-[#6b7280] font-mono">{seller.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[12px] text-[#374151] flex items-center gap-1.5">
                          <Mail size={12} className="text-[#6b7280]" /> {seller.email || 'N/A'}
                        </span>
                        <span className="text-[12px] text-[#6b7280] flex items-center gap-1.5">
                          <Phone size={12} className="text-[#9ca3af]" /> {seller.phone || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-[12px] text-[#6b7280]">
                      {new Date(seller.created_at).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/sellers/${seller.id}`}
                          className="p-2 text-[#9ca3af] hover:text-[#1a56db] hover:bg-[#eff6ff] rounded-md transition-all"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </Link>
                        <button 
                          onClick={(e) => handleDelete(seller.id, e)}
                          className="p-2 text-[#9ca3af] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded-md transition-all"
                          title="ELiminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddSellerModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => { fetchSellers(); setShowAddModal(false); }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AddSellerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('sellers').insert({
      ...formData,
      created_by: user?.id
    })

    if (error) {
      toast.error('Error al crear vendedor: ' + error.message)
    } else {
      toast.success('Vendedor creado exitosamente')
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
          <h2 className="text-[18px] font-bold text-[#1a2744]">Nuevo Registro de Vendedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-md text-[#6b7280]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Nombre</label>
              <input
                required
                className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
                placeholder="Juan"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Apellido</label>
              <input
                required
                className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
                placeholder="Pérez"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Correo Institucional</label>
            <input
              type="email"
              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
              placeholder="juan.perez@empresa.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Teléfono de Contacto</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={14} />
              <input
                className="w-full bg-white border border-[#e5e7eb] rounded-md pl-10 pr-4 py-2.5 text-[14px] text-[#374151] focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 outline-none transition-all placeholder:text-[#9ca3af]"
                placeholder="0414 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
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
              {submitting ? 'Confirmando...' : 'Guardar Vendedor'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
