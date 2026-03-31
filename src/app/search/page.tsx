'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Search, Loader2, Database, User, Calendar, AlertCircle, 
  FileText, Smartphone, Palette, Shield, Layout, Headphones, CheckCircle2, 
  Hash, CreditCard, BadgePercent 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface SearchResult {
  sheetId: string;
  sellerName: string;
  sheetDisplayName: string;
  row: Record<string, string>;
}

const EJECUTIVOS = [
  { id: 1, nombre: "Alejandro", apellido: "Martínez" },
  { id: 2, nombre: "Valeria", apellido: "Rodríguez" },
  { id: 3, nombre: "Carlos", apellido: "Hernández" },
  { id: 4, nombre: "Sofía", apellido: "López" },
  { id: 5, nombre: "Miguel", apellido: "González" },
  { id: 6, nombre: "Isabella", apellido: "Pérez" },
  { id: 7, nombre: "Andrés", apellido: "Sánchez" },
  { id: 8, nombre: "Gabriela", apellido: "Ramírez" },
  { id: 9, nombre: "Luis", apellido: "Torres" },
  { id: 10, nombre: "Camila", apellido: "Flores" },
  { id: 11, nombre: "José", apellido: "Rivera" },
  { id: 12, nombre: "Daniela", apellido: "Morales" },
  { id: 13, nombre: "Ricardo", apellido: "Jiménez" },
  { id: 14, nombre: "Natalia", apellido: "Álvarez" },
  { id: 15, nombre: "Fernando", apellido: "Vargas" },
  { id: 16, nombre: "Paola", apellido: "Castro" },
  { id: 17, nombre: "Eduardo", apellido: "Rojas" },
  { id: 18, nombre: "María", apellido: "Herrera" },
  { id: 19, nombre: "Jorge", apellido: "Medina" },
  { id: 20, nombre: "Lucía", apellido: "Gutiérrez" },
  { id: 21, nombre: "Pablo", apellido: "Núñez" },
  { id: 22, nombre: "Valentina", apellido: "Mendoza" },
  { id: 23, nombre: "Sergio", apellido: "Reyes" },
  { id: 24, nombre: "Andrea", apellido: "Cruz" },
  { id: 25, nombre: "Diego", apellido: "Ortega" },
  { id: 26, nombre: "Mónica", apellido: "Ruiz" },
  { id: 27, nombre: "Roberto", apellido: "Aguilar" },
  { id: 28, nombre: "Claudia", apellido: "Molina" },
  { id: 29, nombre: "Héctor", apellido: "Silva" },
  { id: 30, nombre: "Mariana", apellido: "Romero" },
  { id: 31, nombre: "Óscar", apellido: "Fuentes" },
  { id: 32, nombre: "Laura", apellido: "Vega" },
  { id: 33, nombre: "Ramón", apellido: "Cabrera" },
  { id: 34, nombre: "Patricia", apellido: "Ramos" },
  { id: 35, nombre: "Víctor", apellido: "Delgado" },
  { id: 36, nombre: "Carolina", apellido: "Suárez" },
  { id: 37, nombre: "Gustavo", apellido: "Parra" },
  { id: 38, nombre: "Ana", apellido: "Contreras" },
  { id: 39, nombre: "Manuel", apellido: "Espinoza" },
  { id: 40, nombre: "Diana", apellido: "Guerrero" },
  { id: 41, nombre: "Rafael", apellido: "Lozano" },
  { id: 42, nombre: "Stephanie", apellido: "Acosta" },
  { id: 43, nombre: "Arturo", apellido: "Carrillo" },
  { id: 44, nombre: "Verónica", apellido: "Domínguez" },
  { id: 45, nombre: "Ernesto", apellido: "Salinas" },
  { id: 46, nombre: "Juliana", apellido: "Ríos" },
  { id: 47, nombre: "César", apellido: "Ibarra" },
  { id: 48, nombre: "Roxana", apellido: "Serrano" },
  { id: 49, nombre: "Iván", apellido: "Peña" },
  { id: 50, nombre: "Beatriz", apellido: "Montes" }
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-[#3b82f6]" size={40} /></div>}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('dn') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [showEquipModal, setShowEquipModal] = useState(false)

  const handleSearch = useCallback(async (code: string) => {
    if (code.length < 2) return
    
    setLoading(true)
    setError('')
    setSearched(true)
    
    try {
      const res = await fetch(`/api/dn/search?dn=${code}`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al buscar')
        setResults([])
      } else {
        const searchResults = data.results || []
        
        // Randomization logic for assigned executive
        const lastIndexStr = typeof window !== 'undefined' ? localStorage.getItem('last_exec_index') : null
        let currentIndex = lastIndexStr ? parseInt(lastIndexStr) : Math.floor(Math.random() * 50)
        
        const updatedResults = searchResults.map((r: SearchResult) => {
          currentIndex = (currentIndex + 1) % 50
          const exec = EJECUTIVOS[currentIndex]
          return {
            ...r,
            sellerName: `${exec.nombre} ${exec.apellido}`
          }
        })
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_exec_index', currentIndex.toString())
        }
        
        setResults(updatedResults)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const dn = searchParams.get('dn')
    if (dn) {
      handleSearch(dn)
    }
  }, [searchParams, handleSearch])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?dn=${query.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1a2744] selection:bg-[#bfdbfe] pb-20 lg:pb-0">
      {/* Hero Header Section */}
      <div className="bg-[#0f172a] relative overflow-hidden border-b border-[#1e293b]">
        {/* Abstract Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 blur-[120px] rounded-full -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600 blur-[120px] rounded-full -ml-64 -mb-64" />
        </div>

        {/* Top Navigation */}
        <nav className="relative z-20 h-16 lg:h-20 flex items-center justify-between px-4 lg:px-12 max-w-7xl mx-auto">
          <Link href="/" className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 bg-[#3b82f6] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Search size={18} className="text-white" />
            </div>
            <span className="hidden sm:inline tracking-tight">DN Control Center</span>
            <span className="sm:hidden tracking-tight">DN Control</span>
          </Link>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-5xl px-6 pt-12 pb-16 lg:pt-24 lg:pb-32 mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl lg:text-7xl font-black text-white mb-4 lg:mb-6 tracking-tight leading-tight">
              Consulta de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Crédito</span>
            </h1>
            <p className="text-sm lg:text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 lg:mb-14 px-2">
              Verifica el estatus de crédito y asignación de vendedor en tiempo real a través de nuestra pasarela institucional.
            </p>

            <form onSubmit={onSubmit} className="relative max-w-2xl mx-auto w-full group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center">
                <Search className="absolute left-4 lg:left-6 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Ingresar número de trámite..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 text-white rounded-xl pl-11 lg:pl-16 pr-24 lg:pr-36 py-4 lg:py-6 text-[15px] lg:text-2xl focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 placeholder:text-[13px] lg:placeholder:text-lg shadow-2xl"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 lg:right-3 bg-blue-600 hover:bg-blue-500 text-white px-4 lg:px-8 py-2.5 lg:py-4 rounded-lg font-bold uppercase tracking-widest text-[10px] lg:text-[13px] transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Buscar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Results Section */}
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-16">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 py-20 lg:py-32"
            >
              <div className="relative">
                <div className="h-16 w-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={20} />
              </div>
              <p className="text-slate-500 font-bold text-[10px] lg:text-[12px] uppercase tracking-[0.3em] text-center">Sincronizando Directorio de Red...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-5 rounded-xl flex items-center gap-4 text-red-700 max-w-xl mx-auto"
            >
              <AlertCircle size={20} className="shrink-0" />
              <p className="font-bold text-[13px] lg:text-[14px]">{error}</p>
            </motion.div>
          ) : searched && results.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 lg:py-32 bg-white rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-slate-300" />
              </div>
              <h3 className="text-[20px] lg:text-2xl font-bold text-slate-900 mb-2">Sin Resultados</h3>
              <p className="text-sm text-slate-500 px-6">No se localizó ninguna coincidencia activa para: <span className="font-bold text-slate-900">{searchParams.get('dn')}</span></p>
            </motion.div>
          ) : searched ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-6 lg:space-y-10"
            >
              <div className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                <CheckCircle2 className="text-emerald-500" size={18} />
                <p className="text-[12px] lg:text-[14px] font-bold text-emerald-900">Se localizó {results.length} registro(s) verificado(s)</p>
              </div>

              {results.map((result, idx) => (
                <SearchResultCard 
                  key={`${result.sheetId}-${idx}`} 
                  result={result} 
                  index={idx} 
                  onEquipClick={() => setShowEquipModal(true)}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Modal Interactivo "Recibir Equipo" */}
        <AnimatePresence>
          {showEquipModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowEquipModal(false)}
                className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-8 lg:p-12 max-w-xl w-full shadow-2xl border border-white/20 select-none overflow-hidden"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

                <div className="relative">
                  <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8 mx-auto shadow-lg shadow-blue-500/10">
                    <Smartphone size={32} />
                  </div>
                  
                  <h3 className="text-2xl lg:text-3xl font-[950] text-[#0f172a] text-center mb-6 tracking-tight leading-tight uppercase italic text-balance">
                    Instrucciones Para <span className="text-blue-600">Recibir El Equipo</span>
                  </h3>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 lg:p-8 mb-8 text-center">
                    <p className="text-[14px] lg:text-[18px] text-slate-700 font-bold leading-relaxed px-2">
                      Debe asistir a la sucursal, retirar el chip, activarlo y completar la vinculación para aprobar la entrega de tu equipo.
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowEquipModal(false)}
                    className="w-full py-4 bg-[#0f172a] hover:bg-slate-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[12px] transition-all active:scale-[0.98] shadow-xl shadow-slate-900/20"
                  >
                    Entendido, continuar
                  </button>
                  
                  <p className="text-[10px] text-slate-400 font-bold text-center mt-6 uppercase tracking-widest opacity-60">
                    Protocolo Institucional de Entrega de Dispositivos
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 px-6 text-center border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">&copy; {new Date().getFullYear()} DN Portabilidad Network • Pasarela de Datos</p>
      </footer>
    </div>
  )
}

function SearchResultCard({ result, index, onEquipClick }: { result: SearchResult, index: number, onEquipClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border border-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Card Header */}
      <div className="bg-slate-50 px-5 lg:px-10 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 lg:h-12 w-10 lg:w-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
            <User size={22} />
          </div>
          <div>
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Ejecutivo Asignado</p>
            <h4 className="text-[15px] lg:text-[18px] font-black text-slate-900">{result.sellerName}</h4>
          </div>
        </div>
        <div className="hidden sm:block">
           <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2">
             <Database size={10} /> {result.sheetDisplayName}
           </span>
        </div>
      </div>

      <div className="p-5 lg:p-10 space-y-8 lg:space-y-12">
        {/* Basic Info */}
        <section>
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <FileText size={14} />
            <h5 className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em]">Estatus de Portabilidad</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0.5 lg:gap-y-1">
            <DetailRow label="FECHA DE CITA" value={result.row['FECHA DE LA CITA']} icon={<Calendar size={14} />} />
            <DetailRow label="NÚMERO DE TRÁMITE" value={result.row['DN']} icon={<Hash size={14} />} highlight />
            <DetailRow label="TITULAR" value={result.row['NOMBRE']} icon={<User size={14} />} />
            <DetailRow label="CURP OFICIAL" value={result.row['CURP']} icon={<Shield size={14} />} mono />
            <DetailRow label="TIPO CRÉDITO" value={result.row['TIPO DE CREDITO']} icon={<CreditCard size={14} />} />
            <DetailRow label="PAGO x MES" value={result.row['PAGO X MES']} icon={<BadgePercent size={14} />} highlight />
            <DetailRow label="CUOTAS" value={result.row['CUOTAS']} icon={<Hash size={14} />} />
          </div>
        </section>

        {/* Equipment Details - Compact on mobile */}
        <section className="bg-slate-50/50 p-5 lg:p-8 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <Smartphone size={14} />
            <h5 className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em]">Detalles de Equipamiento</h5>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <SmallInfo label="MODELO" value={result.row['MODELO']} icon={<Smartphone size={12} />} />
            <SmallInfo label="COLOR" value={result.row['COLOR']} icon={<Palette size={12} />} />
            <SmallInfo label="PROTECCIÓN" value={result.row['FUNDA']} icon={<Shield size={12} />} />
            <SmallInfo label="CRISTAL" value={result.row['PROTECTOR DE PANTALLA']} icon={<Layout size={12} />} />
            <SmallInfo label="PERIFÉRICOS" value={result.row['COLOR AUDIFONOS']} icon={<Headphones size={12} />} />
          </div>
        </section>

        {/* Status Section */}
        <section className="pt-8 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
            <div className="space-y-6 lg:space-y-8 flex-1">
              <div className="flex items-center gap-4">
                <StatusIcon status={result.row['ESTATUS ENTREGA DE EQUIPO']} type="delivery" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estatus Entrega</p>
                  <p className={cn("text-base lg:text-xl font-black", 
                    result.row['ESTATUS ENTREGA DE EQUIPO']?.toUpperCase().includes('APROBADA') ? 'text-emerald-600' : 'text-amber-500'
                  )}>
                    {result.row['ESTATUS ENTREGA DE EQUIPO'] || 'SOLICITUD EN TRÁMITE'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusIcon status={result.row['ESTATUS DE FINANCIAMIENTO']} type="finance" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estatus Financiamiento</p>
                  <p className={cn("text-base lg:text-xl font-black", 
                    result.row['ESTATUS DE FINANCIAMIENTO']?.toUpperCase().includes('ACTIVADO') ? 'text-blue-600' : 'text-rose-700'
                  )}>
                    {result.row['ESTATUS DE FINANCIAMIENTO'] || 'PENDIENTE DE VALIDACIÓN'}
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-4">
               <div className="bg-blue-600 px-6 py-4 rounded-xl lg:rounded-2xl shadow-xl shadow-blue-600/10 text-white flex items-center gap-4">
                 <Calendar size={24} className="opacity-50" />
                 <div>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Fecha Primer Pago</p>
                    <p className="text-sm lg:text-base font-black">{result.row['FECHA DE PRIMER PAGO DEL EQUIPO'] || 'Por definir'}</p>
                 </div>
               </div>

               <button 
                 onClick={onEquipClick}
                 className="w-full group bg-white hover:bg-emerald-50 text-emerald-600 border-2 border-emerald-500 px-6 py-3 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[11px] lg:text-[13px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 active:scale-95"
               >
                 <Smartphone className="group-hover:scale-110 transition-transform" size={18} />
                 Recibir equipo
               </button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  )
}

function StatusIcon({ status, type }: { status: string, type: 'delivery' | 'finance' }) {
  const isAproved = status?.toUpperCase().includes(type === 'delivery' ? 'APROBADA' : 'ACTIVADO')
  const baseClass = "h-12 w-12 rounded-full flex items-center justify-center shrink-0"
  
  if (type === 'delivery') {
    return (
      <div className={cn(baseClass, isAproved ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500')}>
        <CheckCircle2 size={24} strokeWidth={2.5} />
      </div>
    )
  }
  return (
    <div className={cn(baseClass, isAproved ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500')}>
      <Shield size={24} strokeWidth={2.5} />
    </div>
  )
}

function DetailRow({ label, value, icon, highlight = false, mono = false }: { label: string, value: string, icon?: React.ReactNode, highlight?: boolean, mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-300">{icon}</span>
        <span className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <p className={cn("font-bold text-right pl-4", 
        highlight ? 'text-sm lg:text-lg text-blue-600' : 
        mono ? 'text-xs lg:text-sm font-mono text-slate-700' : 
        'text-xs lg:text-sm text-slate-900'
      )}>
        {value}
      </p>
    </div>
  )
}

function SmallInfo({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-xs lg:text-sm font-bold text-slate-900 leading-tight">{value}</p>
    </div>
  )
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
