'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ClipboardPaste, 
  Zap, 
  Calendar, 
  Clock,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseNotepadText } from '@/lib/utils/notepadParser'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DynamicRegistrationFormProps {
  headers: string[]
  scriptUrl: string | null
  sellerName: string
}

const MONTHS_LIST = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_LIST = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const LOCKED_FIELDS = ['mes', 'semana', 'dia de la venta', 'fecha']

const STATUS_LIST = [
  'ALTA',
  'FVC',
  'SIN STATUS',
  'AA',
  'RECHAZO',
  'CHARGE BACK',
  'PROMESA DE VISITA'
]

const FVC_OPTIONS = ['NO', 'FVC']

const FINANCING_STATUS_LIST = [
  'CHIP SIN ACTIVAR',
  'CHIP ACTIVADO SIN RECARGA O SIN VINCULAR',
  'CHIP ACTIVADO CON RECARGA Y VINCULADO'
]

const DELIVERY_STATUS_LIST = [
  'EN ESPERA DE ACTIVACION DEL CHIP',
  'ENTREGA APROBADA'
]

export default function DynamicRegistrationForm({ headers, scriptUrl, sellerName }: DynamicRegistrationFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [notepadText, setNotepadText] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [parsedFields, setParsedFields] = useState<string[]>([])
  const router = useRouter()

  // 1. Cálculos de Fechas Automáticos
  const now = useMemo(() => new Date(), [])
  
  // Lista de semanas (01 hasta actual)
  const currentWeek = useMemo(() => {
    const d = new Date(now.getTime())
    d.setHours(0, 0, 0, 0)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const diffDays = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
    return Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)
  }, [now])

  const weeksList = useMemo(() => {
    return Array.from({ length: currentWeek }, (_, i) => {
      const num = i + 1
      const numStr = num < 10 ? `0${num}` : `${num}`
      return `SEMANA ${numStr}`
    }).reverse() // Más reciente primero
  }, [currentWeek])

  // 2. Inicialización de campos automáticos
  useEffect(() => {
    const initialData: Record<string, string> = {}
    
    // Buscar cabeceras que coincidan con los campos automáticos
    headers.forEach(h => {
      const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (norm.includes('semana')) initialData[h] = weeksList[0]
      if (norm.includes('mes')) initialData[h] = MONTHS_LIST[now.getMonth()].toUpperCase()
      if (norm.includes('dia') && !norm.includes('fvc')) {
        const d = now.getDay() // 0=Sun, 1=Mon...
        const dayIdx = d === 0 ? 5 : d - 1 // Mapear a Lunes-Sábado (simplificado)
        initialData[h] = DAYS_LIST[Math.min(dayIdx, 5)].toUpperCase()
      }
      if (norm.includes('fecha')) {
        initialData[h] = format(now, 'd/M/yy')
      }
      if (norm.includes('dia fvc')) {
        // Por defecto, sugerir mañana
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const d = tomorrow.getDay()
        const dayIdx = d === 0 ? 0 : d - 1 // 0=Lunes
        initialData[h] = DAYS_LIST[Math.min(dayIdx, 5)].toUpperCase()
      }
    })

    setFormData(prev => ({ ...initialData, ...prev }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, weeksList, now]) // Solo depender de lo que realmente puede cambiar

  // 3. Lógica de Análisis Inteligente
  const handleSmartPaste = () => {
    if (!notepadText.trim()) {
      toast.error('Pega algún texto primero')
      return
    }

    const parsed = parseNotepadText(notepadText, headers)
    
    // Filtrar para NO sobrescribir campos bloqueados (Mes, Semana, Dia venta, Fecha)
    const filteredParsed: Record<string, string> = {}
    Object.entries(parsed).forEach(([key, val]) => {
      const normKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (!LOCKED_FIELDS.includes(normKey)) {
        filteredParsed[key] = val
      }
    })

    const foundKeys = Object.keys(filteredParsed)

    if (foundKeys.length > 0) {
      setFormData(prev => ({ ...prev, ...filteredParsed }))
      setParsedFields(foundKeys)
      toast.success(`¡Analizado! Se identificaron ${foundKeys.length} campos.`, {
        icon: <Sparkles size={16} className="text-blue-500" />
      })
    } else {
      toast.error('No se pudo identificar ningún campo. Verifica el formato.')
    }
  }

  const handleChange = (header: string, value: string) => {
    setFormData(prev => ({ ...prev, [header]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scriptUrl) {
      toast.error('Configuración de sincronización faltante.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/seller/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl, data: formData })
      })

      const result = await res.json()
      if (res.ok && result.success) {
        setSuccess(true)
        toast.success('¡Venta registrada exitosamente!')
        setTimeout(() => { router.push('/vendedor/dashboard'); router.refresh(); }, 2000)
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-20 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 size={56} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Sincronización Completada!</h2>
        <p className="text-slate-500 text-lg">Tu registro ya está en el sistema principal.</p>
      </motion.div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {/* SECCIÓN 1: SMART PASTE */}
      <section className="p-8 lg:p-12 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Zap size={20} />
           </div>
           <div>
              <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider">Llenado Inteligente (Smart Paste)</h3>
              <p className="text-[12px] text-slate-500 font-medium">Pega aquí el reporte del bloc de notas para auto-completar el formulario.</p>
           </div>
        </div>

        <div className="relative group">
           <textarea 
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            placeholder="Ejecutivo: Beatriz Reyes\nNumero: 5610490952\nNip: 8421\n..."
            className="w-full h-48 bg-white border-2 border-slate-200 border-dashed rounded-3xl p-6 text-[14px] text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300 resize-none font-mono"
           />
           <div className="absolute bottom-6 right-6 flex gap-3">
              <button 
                type="button"
                onClick={() => setNotepadText('')}
                className="px-4 py-2 text-[11px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors"
              >
                Limpiar
              </button>
              <button 
                type="button"
                onClick={handleSmartPaste}
                className="flex items-center gap-2 bg-[#1a2744] text-white px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-900/10 active:scale-95"
              >
                <Sparkles size={16} />
                Analizar Reporte
              </button>
           </div>
        </div>
      </section>

      {/* SECCIÓN 2: FORMULARIO DINÁMICO */}
      <form onSubmit={handleSubmit}>
        <div className="p-8 lg:p-12 space-y-12">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {headers.filter(h => h.trim() !== '').map((header) => {
                const isParsed = parsedFields.includes(header)
                const norm = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                
                // Mapear tipos de input
                let inputType = 'text'
                if ((norm.includes('fecha') || norm.includes('fvc')) && !norm.includes('alta')) {
                  inputType = 'date'
                }
                
                // 1. SEMANA (Global)
                if (norm === 'semana') {
                  return (
                    <div key={header} className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                        <Calendar size={12} className="text-blue-500" />
                        {header}
                      </label>
                      <select 
                        disabled
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-500 cursor-not-allowed appearance-none"
                      >
                        {weeksList.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  )
                }

                // 2. MES (Global)
                if (norm === 'mes') {
                  return (
                    <div key={header} className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                      <select 
                        disabled
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-500 cursor-not-allowed appearance-none"
                      >
                        {MONTHS_LIST.map(m => <option key={m} value={m.toUpperCase()}>{m}</option>)}
                      </select>
                    </div>
                  )
                }

                // 3. DIA DE LA VENTA (Global)
                if (norm === 'dia de la venta') {
                  return (
                    <div key={header} className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                      <select 
                        disabled
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-500 cursor-not-allowed appearance-none"
                      >
                        {DAYS_LIST.map(d => <option key={d} value={d.toUpperCase()}>{d}</option>)}
                      </select>
                    </div>
                  )
                }

                // 4. SEMANA FVC (Especial)
                if (norm === 'semana fvc') {
                  const currentNum = parseInt(weeksList[0].replace('SEMANA ', ''))
                  const nextWeekVal = `SEMANA ${String(currentNum + 1).padStart(2, '0')}`
                  return (
                    <div key={header} className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                       <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                       >
                         <option value={weeksList[0]}>{weeksList[0]} (Actual)</option>
                         <option value={nextWeekVal}>{nextWeekVal} (Siguiente)</option>
                       </select>
                    </div>
                  )
                }

                // 5. DIA FVC (Especial)
                if (norm === 'dia fvc') {
                  return (
                    <div key={header} className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                      <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="">Selecciona Día</option>
                        {DAYS_LIST.map(d => <option key={d} value={d.toUpperCase()}>{d}</option>)}
                      </select>
                    </div>
                  )
                }

                // 6. FVC (Especial)
                if (norm === 'fvc' || norm === 'dia fvc (fvc o no)') { // Agregamos variantes comunes
                  return (
                    <div key={header} className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                       <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                       >
                         {FVC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                    </div>
                  )
                }

                // 7. ESTATUS (Especial - Según imagen)
                if (norm === 'estatus' || norm === 'status') {
                  return (
                    <div key={header} className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                      <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="">Selecciona Estatus</option>
                        {STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                  )
                }

                // 8. ESTATUS DE FINANCIAMIENTO (Especial - Según imagen)
                if (norm === 'estatus de financiamiento' || norm === 'status financiamiento') {
                  return (
                    <div key={header} className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                       <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                       >
                         <option value="">Selecciona Estatus</option>
                         {FINANCING_STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                       </select>
                    </div>
                  )
                }

                // 9. ESTATUS ENTREGA DE EQUIPO (Especial - Según imagen)
                if (norm === 'estatus entrega de equipo' || norm === 'status entrega') {
                  return (
                    <div key={header} className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">{header}</label>
                       <select 
                        value={formData[header] || ''}
                        onChange={(e) => handleChange(header, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[14px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                       >
                         <option value="">Selecciona Estatus</option>
                         {DELIVERY_STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                       </select>
                    </div>
                  )
                }

                const isPhone = norm.includes('tel') || norm.includes('num') || norm.includes('dn')
                const isLocked = LOCKED_FIELDS.includes(norm)

                return (
                  <div key={header} className="space-y-2 group">
                    <label className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                      {header}
                      {isParsed && (
                        <span className="flex items-center gap-1 text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-black animate-in fade-in slide-in-from-right-2">
                           AUTODETECTADO
                        </span>
                      )}
                    </label>
                    <input
                      type={isPhone ? 'tel' : inputType}
                      disabled={isLocked}
                      maxLength={isPhone ? 10 : undefined}
                      placeholder={`Ingresa ${header.toLowerCase()}`}
                      value={formData[header] || ''}
                      onChange={(e) => {
                        let val = e.target.value
                        if (isPhone) val = val.replace(/\D/g, '').substring(0, 10)
                        handleChange(header, val)
                      }}
                      className={`w-full border-2 rounded-2xl px-5 py-4 text-[14px] font-medium transition-all outline-none
                        ${isLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 
                          isParsed 
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-[0_0_15px_rgba(59,130,246,0.1)] ring-4 ring-blue-500/10' 
                          : 'bg-white border-slate-200 text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500'
                        }
                      `}
                    />
                  </div>
                )
              })}
           </div>

           <div className="bg-slate-50 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                    <ClipboardPaste size={24} />
                 </div>
                 <div>
                    <h4 className="text-[14px] font-black text-slate-900 mb-0.5 uppercase tracking-wide">¿Todo Listo?</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Revisa que los campos autodetectados sean correctos.</p>
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[2rem] font-black text-[14px] uppercase tracking-[0.15em] transition-all shadow-2xl shadow-blue-600/30 active:scale-95 group"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Enviando a la Nube...
                  </>
                ) : (
                  <>
                    <Save size={20} className="group-hover:translate-y-[-2px] transition-transform" />
                    Sincronizar Registro
                  </>
                )}
              </button>
           </div>
        </div>
      </form>
    </div>
  )
}
