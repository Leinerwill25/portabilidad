'use client'

import { useState, useEffect } from 'react'
import { Check, Save, Loader2, UserCheck, Shield } from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
}

export default function SupervisorManager() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profilesRes, assignedRes] = await Promise.all([
        fetch('/api/admin/profiles'),
        fetch('/api/admin/coordinator/supervisors')
      ])
      
      const profilesData = await profilesRes.json()
      const assignedData = await assignedRes.json()
      
      setProfiles(Array.isArray(profilesData) ? profilesData : [])
      // El API ahora retorna objetos {id, name}, extraemos solo los ID para el estado de selección
      setAssignedIds(Array.isArray(assignedData) ? assignedData.map((d: { id?: string } | string) => typeof d === 'string' ? d : d.id || '') : [])
    } catch (error) {
      console.error('Error fetching coordination data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggle = (id: string) => {
    setAssignedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/coordinator/supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorIds: assignedIds })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Asignaciones guardadas correctamente' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-8 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#3b82f6]" size={24} />
        <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-widest">Cargando Personal...</p>
      </div>
    )
  }

  // Filtrar para mostrar solo roles administrativos (supervisores/admin)
  const supervisors = profiles.filter(p => p.role === 'admin')

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-200">
           <UserCheck className="text-emerald-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Gestión de Site</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Administra la estructura jerárquica de tu red de ventas. 
              Vincule supervisores específicos a tu coordinación para que su producción y conversión se reflejen en tus dashboards ejecutivos. 
              <strong> Beneficio:</strong> Asegura un seguimiento preciso de cada equipo y facilita el crecimiento escalable de tu operación.
           </p>
        </div>
      </div>

      <div className="bg-white border border-[#334155] rounded-xl overflow-hidden shadow-xl mb-8 border-t-4 border-t-[#3b82f6]">
      <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-[#3b82f6]/10 rounded-lg">
              <Shield size={18} className="text-[#3b82f6]" />
           </div>
           <div>
              <h3 className="text-[14px] font-black text-[#1e293b] uppercase tracking-tight">Gestión de Usuarios bajo mi Cargo</h3>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-tighter">Selecciona los supervisores asignados a tu coordinación</p>
           </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 text-[11px] font-black uppercase tracking-wider"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar Asignación'}
        </button>
      </div>

      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-black">
                <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest border-r border-slate-200">Estado</th>
                <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest border-r border-slate-200">Nombre Completo</th>
                <th className="px-6 py-3 text-[11px] font-black uppercase tracking-widest">Email Corporativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#94a3b8] text-[12px] font-medium italic">
                    No se encontraron supervisores disponibles para asignar.
                  </td>
                </tr>
              ) : (
                supervisors.map((p) => {
                  const isAssigned = assignedIds.includes(p.id)
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => handleToggle(p.id)}
                      className={`cursor-pointer transition-colors ${isAssigned ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4 border-r border-[#f1f5f9]">
                        <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isAssigned ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-white border-[#cbd5e1]'
                        }`}>
                          {isAssigned && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-[#f1f5f9]">
                         <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full ${isAssigned ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'bg-slate-100 text-slate-400'}`}>
                               <UserCheck size={14} />
                            </div>
                            <span className={`text-[13px] font-bold ${isAssigned ? 'text-[#1e293b]' : 'text-[#64748b]'}`}>
                               {p.full_name || 'Sin Nombre'}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#64748b] font-medium">
                        {p.email}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {message && (
        <div className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest text-center ${
          message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {message.text}
        </div>
      )}
    </div>
    </div>
  )
}
