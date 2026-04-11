'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Phone, Mail, Loader2, Trash2, X, Eye, Edit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface Seller {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)
  
  const supabase = createClient()

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error cargando vendedores')
    } else {
      setSellers(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('¿Estás seguro de que deseas eliminar este vendedor? Esta acción no se puede deshacer.')) return

    const { error } = await supabase.from('sellers').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
    } else {
      toast.success('Vendedor eliminado correctamente')
      fetchSellers()
    }
  }

  const handleEdit = (seller: Seller, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingSeller(seller)
    setShowEditModal(true)
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
              placeholder="Buscar por nombre o DN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] text-[#374151] rounded-lg pl-10 pr-4 py-2 text-[13px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all"
            />
          </div>
        </div>

        <div className="hidden min-[1000px]:block overflow-x-auto">
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
                filteredSellers.map((seller) => (
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
                          onClick={(e) => handleEdit(seller, e)}
                          className="p-2 text-[#9ca3af] hover:text-[#1a56db] hover:bg-[#eff6ff] rounded-md transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(seller.id, e)}
                          className="p-2 text-[#9ca3af] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded-md transition-all"
                          title="Eliminar registro"
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

        <div className="min-[1000px]:hidden divide-y divide-[#e5e7eb]">
          {loading ? (
            <div className="p-12 text-center text-[#9ca3af]">
              <Loader2 className="animate-spin inline-block mb-3" size={24} />
              <p className="text-[13px]">Sincronizando vendedores...</p>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="p-12 text-center text-[#9ca3af] italic text-[13px]">
              No se han encontrado registros.
            </div>
          ) : (
            filteredSellers.map((seller) => (
              <div key={seller.id} className="p-5 flex flex-col gap-4 active:bg-[#f8fafc] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#eff6ff] rounded-full flex items-center justify-center text-[#1a56db] font-bold text-sm border border-[#bfdbfe]">
                      {seller.first_name[0]}{seller.last_name[0]}
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-[#1a2744]">{seller.first_name} {seller.last_name}</h4>
                      <p className="text-[11px] text-[#6b7280] font-mono leading-none mt-1">ID: {seller.id.split('-')[0]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => handleEdit(seller, e)}
                      className="p-2.5 text-[#1a56db] bg-[#eff6ff] rounded-lg active:scale-95 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(seller.id, e)}
                      className="p-2.5 text-[#991b1b] bg-[#fef2f2] rounded-lg active:scale-95 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <Link 
                      href={`/sellers/${seller.id}`}
                      className="p-2.5 text-slate-600 bg-slate-100 rounded-lg active:scale-95 transition-all"
                    >
                      <Eye size={18} />
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Email</p>
                    <p className="text-[12px] text-[#374151] truncate">{seller.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Teléfono</p>
                    <p className="text-[12px] text-[#374151]">{seller.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddSellerModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => { fetchSellers(); setShowAddModal(false); }} 
          />
        )}
        {showEditModal && editingSeller && (
          <EditSellerModal 
            seller={editingSeller}
            onClose={() => { setShowEditModal(false); setEditingSeller(null); }} 
            onSuccess={() => { fetchSellers(); setShowEditModal(false); setEditingSeller(null); }} 
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
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null,
      password: 'DN2026*',
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
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
                placeholder="Ej: Daniel"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Apellido</label>
              <input
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
                placeholder="Ej: Mejias"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Email (Opcional)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af] group-focus-within:text-[#1a56db] transition-colors">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Teléfono (Opcional)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af] group-focus-within:text-[#1a56db] transition-colors">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
                placeholder="Ej: 04121234567"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#e5e7eb] text-[#64748b] text-[13px] font-bold rounded-lg hover:bg-[#f8fafc] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 px-6 py-3 bg-gradient-to-r from-[#1a56db] to-[#2563eb] text-white text-[13px] font-bold rounded-lg hover:shadow-lg hover:shadow-[#1a56db]/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Registrar Vendedor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function EditSellerModal({ seller, onClose, onSuccess }: { seller: Seller, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    first_name: seller.first_name || '',
    last_name: seller.last_name || '',
    email: seller.email || '',
    phone: seller.phone || '',
    password: seller.password || 'DN2026*', // Persistir o resetar contraseña
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('sellers')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
      })
      .eq('id', seller.id)

    if (error) {
      toast.error('Error al actualizar: ' + error.message)
    } else {
      toast.success('Vendedor actualizado exitosamente')
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
          <h2 className="text-[18px] font-bold text-[#1a2744]">Editar Datos de Vendedor</h2>
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
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Apellido</label>
              <input
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af] group-focus-within:text-[#1a56db] transition-colors">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#1a2744] ml-0.5">Teléfono</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af] group-focus-within:text-[#1a56db] transition-colors">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-[13px] focus:ring-2 focus:ring-[#1a56db]/20 focus:border-[#1a56db] transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#e5e7eb] text-[#64748b] text-[13px] font-bold rounded-lg hover:bg-[#f8fafc] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 px-6 py-3 bg-[#1a56db] text-white text-[13px] font-bold rounded-lg hover:shadow-lg hover:shadow-[#1a56db]/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Actualizar Vendedor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
