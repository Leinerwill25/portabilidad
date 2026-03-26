'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Search, Loader2, Database, User, Calendar, Tag, AlertCircle, ChevronRight, 
  FileText, Smartphone, Palette, Shield, Layout, Headphones, CheckCircle2, 
  Hash, CreditCard, BadgePercent 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-[#1a56db]" size={40} /></div>}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('dn') || '')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dn = searchParams.get('dn')
    if (dn) {
      handleSearch(dn)
    }
  }, [searchParams])

  const handleSearch = async (code: string) => {
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
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?dn=${query.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1a2744] selection:bg-[#bfdbfe]">
      {/* Hero Header Section */}
      <div className="bg-[#1a2744] relative overflow-hidden py-16 lg:py-24 border-b border-[#0f172a]">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500 blur-[100px] rounded-full -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600 blur-[100px] rounded-full -ml-48 -mb-48" />
        </div>

        <nav className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-6 lg:px-12 max-w-7xl mx-auto">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 bg-[#1a56db] rounded-lg flex items-center justify-center">
              <Search size={18} className="text-white" />
            </div>
            DN Control Center
          </Link>
          <Link href="/login" className="text-[13px] font-bold text-[#94a3b8] hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-md">
            Acceso Corporativo
          </Link>
        </nav>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl lg:text-7xl font-extrabold text-white mb-6 tracking-tighter leading-[1.1]">
              Consulta de Portabilidad <span className="text-[#3b82f6]">DN</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#94a3b8] font-medium max-w-2xl mx-auto mb-12">
              Verifica el estatus de portabilidad y asignación de vendedor en tiempo real a través de nuestra pasarela institucional de datos.
            </p>

            <form onSubmit={onSubmit} className="relative max-w-2xl mx-auto group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors group-focus-within:text-[#3b82f6]" size={24} />
              <input
                type="text"
                placeholder="Ingresar Código DN (EJ: 7533...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-16 pr-40 py-5 lg:py-6 text-xl lg:text-2xl focus:outline-none focus:bg-white/10 focus:border-[#3b82f6] focus:ring-8 focus:ring-blue-500/10 transition-all placeholder:text-[#475569]"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-8 py-3 lg:py-4 rounded-lg font-bold uppercase tracking-widest text-[13px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Consultar'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-24"
            >
              <Loader2 className="animate-spin text-[#1a56db]" size={48} />
              <p className="text-[#64748b] font-bold text-[13px] uppercase tracking-[0.2em]">Consultando Directorio Institucional...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-center gap-4 text-red-700 max-w-xl mx-auto shadow-sm"
            >
              <AlertCircle size={24} />
              <p className="font-bold text-[14px]">{error}</p>
            </motion.div>
          ) : searched && results.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#e5e7eb]">
                <Search size={32} className="text-[#cbd5e1]" />
              </div>
              <h3 className="text-[20px] font-bold text-[#1a2744] mb-2">Sin Resultados Disponibles</h3>
              <p className="text-[14px] text-[#64748b]">No se localizó ninguna coincidencia activa para el código: <span className="font-bold text-[#1a2744]">{searchParams.get('dn')}</span></p>
            </motion.div>
          ) : searched ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-8 max-w-5xl mx-auto"
            >
              <div className="flex items-center gap-3 px-4 py-2 border-l-4 border-[#10b981] bg-white shadow-sm mb-6">
                <CheckCircle2 className="text-[#10b981]" size={18} />
                <p className="text-[13px] font-bold text-[#1a2744]">Se han localizado {results.length} registro(s) verificado(s)</p>
              </div>

              {results.map((result, idx) => (
                <motion.div
                  key={`${result.sheetId}-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
                >
                  <div className="bg-[#f8fafc] px-8 py-4 border-b border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-white border border-[#e5e7eb] rounded-lg flex items-center justify-center text-[#1a56db] shadow-sm">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest">Ejecutivo Asignado</p>
                        <h4 className="text-[16px] font-bold text-[#1a2744]">{result.sellerName}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[11px] font-bold text-[#10b981] bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                         <Database size={10} /> {result.sheetDisplayName}
                       </span>
                    </div>
                  </div>

                  <div className="p-8 space-y-10">
                    <section>
                      <h5 className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <FileText size={14} /> Información de Portabilidad
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                        <DetailRow label="FECHA DE CITA" value={result.row['FECHA DE LA CITA']} icon={<Calendar size={14} />} />
                        <DetailRow label="CÓDIGO DN" value={result.row['DN']} icon={<Hash size={14} />} highlight />
                        <DetailRow label="TITULAR" value={result.row['NOMBRE']} icon={<User size={14} />} />
                        <DetailRow label="CURP OFICIAL" value={result.row['CURP']} icon={<Shield size={14} />} mono />
                        <DetailRow label="TIPO CRÉDITO" value={result.row['TIPO DE CREDITO']} icon={<CreditCard size={14} />} />
                        <DetailRow label="PAGO x MES" value={result.row['PAGO X MES']} icon={<BadgePercent size={14} />} highlight />
                        <DetailRow label="CUOTAS" value={result.row['CUOTAS']} icon={<Hash size={14} />} />
                      </div>
                    </section>

                    <section className="bg-[#f9fafb] p-6 rounded-xl border border-[#e5e7eb]">
                      <h5 className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Smartphone size={14} /> Detalles de Equipamiento
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <SmallInfo label="MODELO" value={result.row['MODELO']} icon={<Smartphone size={12} />} />
                        <SmallInfo label="COLOR" value={result.row['COLOR']} icon={<Palette size={12} />} />
                        <SmallInfo label="PROTECCIÓN" value={result.row['FUNDA']} icon={<Shield size={12} />} />
                        <SmallInfo label="CRISTAL" value={result.row['PROTECTOR DE PANTALLA']} icon={<Layout size={12} />} />
                        <SmallInfo label="PERIFÉRICOS" value={result.row['COLOR AUDIFONOS']} icon={<Headphones size={12} />} />
                      </div>
                    </section>

                    <section className="pt-6 border-t border-[#e5e7eb]">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-6 flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                              result.row['ESTATUS ENTREGA DE EQUIPO']?.toUpperCase().includes('APROBADA') 
                              ? 'bg-[#10b981]/10 text-[#10b981]' 
                              : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                            }`}>
                              <CheckCircle2 size={24} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest leading-none mb-1">Estatus Entrega</p>
                              <p className={`text-[17px] font-extrabold ${
                                result.row['ESTATUS ENTREGA DE EQUIPO']?.toUpperCase().includes('APROBADA') 
                                ? 'text-[#10b981]' : 'text-[#f59e0b]'
                              }`}>
                                {result.row['ESTATUS ENTREGA DE EQUIPO'] || 'SOLICITUD EN TRÁMITE'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                              result.row['ESTATUS DE FINANCIAMIENTO']?.toUpperCase().includes('ACTIVADO') 
                              ? 'bg-[#3b82f6]/10 text-[#3b82f6]' 
                              : 'bg-red-50 text-red-600'
                            }`}>
                              <Shield size={24} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest leading-none mb-1">Estatus Financiamiento</p>
                              <p className={`text-[17px] font-extrabold ${
                                result.row['ESTATUS DE FINANCIAMIENTO']?.toUpperCase().includes('ACTIVADO') 
                                ? 'text-[#3b82f6]' : 'text-red-700'
                              }`}>
                                {result.row['ESTATUS DE FINANCIAMIENTO'] || 'PENDIENTE DE VALIDACIÓN'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[240px]">
                          <div className="bg-[#eff6ff] border border-[#bfdbfe] px-5 py-3 rounded-lg flex items-center gap-3">
                            <Calendar size={18} className="text-[#1a56db]" />
                            <div>
                               <p className="text-[10px] font-bold text-[#1e40af] uppercase tracking-wider">Fecha Primer Pago</p>
                               <p className="text-[14px] font-bold text-[#1a56db]">{result.row['FECHA DE PRIMER PAGO DEL EQUIPO'] || 'Por definir'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#e5e7eb] py-12 text-center">
        <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.3em]">&copy; {new Date().getFullYear()} DN Portabilidad Network • Pasarela Institucional</p>
      </footer>
    </div>
  )
}

function DetailRow({ label, value, icon, highlight = false, mono = false }: { label: string, value: string, icon?: React.ReactNode, highlight?: boolean, mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f1f5f9] last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[#94a3b8]">{icon}</span>
        <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${
        highlight ? 'text-[18px] text-[#1a56db]' : 
        mono ? 'text-[13px] font-mono text-[#374151]' :
        'text-[13px] text-[#1a2744]'
      } truncate max-w-[50%]`}>
        {value}
      </p>
    </div>
  )
}

function SmallInfo({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 opacity-50">
        {icon}
        <span className="text-[9px] font-extrabold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[13px] font-bold text-[#1a2744] truncate">{value}</p>
    </div>
  )
}
