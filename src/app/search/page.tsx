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
        setResults(data.results || [])
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
          <Link href="/login" className="text-[11px] lg:text-[12px] font-bold text-blue-400 hover:text-white transition-colors uppercase tracking-widest border border-blue-500/20 px-3 py-1.5 rounded-md backdrop-blur-md">
            Acceso <span className="hidden sm:inline">Corporativo</span>
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
              Consulta de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Portabilidad</span>
            </h1>
            <p className="text-sm lg:text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 lg:mb-14 px-2">
              Verifica el estatus de portabilidad y asignación de vendedor en tiempo real a través de nuestra pasarela institucional.
            </p>

            <form onSubmit={onSubmit} className="relative max-w-2xl mx-auto w-full group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center">
                <Search className="absolute left-4 lg:left-6 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Ingresar Código DN..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 text-white rounded-xl pl-12 lg:pl-16 pr-28 lg:pr-36 py-4 lg:py-6 text-lg lg:text-2xl focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 shadow-2xl"
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
                <SearchResultCard key={`${result.sheetId}-${idx}`} result={result} index={idx} />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="py-12 px-6 text-center border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">&copy; {new Date().getFullYear()} DN Portabilidad Network • Pasarela de Datos</p>
      </footer>
    </div>
  )
}

function SearchResultCard({ result, index }: { result: SearchResult, index: number }) {
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
            <DetailRow label="CÓDIGO DN" value={result.row['DN']} icon={<Hash size={14} />} highlight />
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

            <div className="shrink-0">
               <div className="bg-blue-600 px-6 py-4 rounded-xl lg:rounded-2xl shadow-xl shadow-blue-600/10 text-white flex items-center gap-4">
                 <Calendar size={24} className="opacity-50" />
                 <div>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Fecha Primer Pago</p>
                    <p className="text-sm lg:text-base font-black">{result.row['FECHA DE PRIMER PAGO DEL EQUIPO'] || 'Por definir'}</p>
                 </div>
               </div>
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
