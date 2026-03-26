'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Search, ShieldAlert, Key, ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'

// Base64 of '25101025' = 'MjUxMDEwMjU='
const AUTH_KEY_OBFUSCATED = 'MjUxMDEwMjU='

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Security State
  const [accessCode, setAccessCode] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (btoa(accessCode) === AUTH_KEY_OBFUSCATED) {
      setIsAuthorized(true)
      toast.success('Código verificado. Acceso concedido.')
    } else {
      setAuthError(true)
      toast.error('Código de acceso inválido')
      setTimeout(() => setAuthError(false), 500)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Registro exitoso. Revisa tu email para confirmar.')
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left Column (40%) - Navy */}
      <div className="hidden lg:flex w-[40%] bg-[#1a2744] flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 blur-[100px] rounded-full -mr-32 -mt-32" />
        </div>
        
        <div className="relative z-10">
          <div className="h-16 w-16 bg-[#1a56db] rounded-xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20">
            <Search size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">Registro Oficial</h1>
          <p className="text-[#94a3b8] text-lg max-w-sm font-medium mx-auto">
            Crea tu cuenta institucional para acceder al panel de control de portabilidad.
          </p>
          <div className="mt-24 pt-12 border-t border-white/10 w-full max-w-xs mx-auto text-[#64748b] text-sm uppercase tracking-[0.2em] font-bold">
            Portal Administrativo
          </div>
        </div>
      </div>

      {/* Right Column (60%) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <AnimatePresence mode="wait">
          {!isAuthorized ? (
            <motion.div 
              key="auth-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-[420px] bg-white p-10 rounded-xl border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center"
            >
              <div className="h-14 w-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-[20px] font-bold text-[#1a2744] mb-2 uppercase tracking-wide">Acceso Restringido</h2>
              <p className="text-[13px] text-[#6b7280] mb-8">
                Este portal es de uso exclusivo interno. Introduce el código de autorización institucional para proceder.
              </p>

              <form onSubmit={verifyCode} className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
                  <input
                    type="password"
                    placeholder="Código de Acceso"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className={`w-full bg-white border ${authError ? 'border-red-500 ring-4 ring-red-500/5' : 'border-[#e5e7eb]'} text-[#1a2744] rounded-md pl-10 pr-4 py-3 text-[14px] font-mono focus:outline-none focus:border-[#1a56db] transition-all`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1a2744] hover:bg-[#0f172a] text-white text-[13px] font-bold py-3.5 rounded-md transition-all shadow-sm uppercase tracking-widest flex items-center justify-center gap-2 group"
                >
                  Verificar Identidad
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
                <p className="text-[12px] text-[#94a3b8]">
                  ¿No tienes el código? <Link href="/login" className="text-[#1a56db] font-bold">Volver al inicio</Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="register-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[480px] bg-white p-10 rounded-xl border border-[#e5e7eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-bold text-[#1a2744] mb-1">Crear cuenta</h2>
                  <p className="text-[13px] text-[#6b7280]">Portal de acceso verificado</p>
                </div>
                <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center border border-green-100">
                  <Lock size={18} />
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5 px-0.5">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-[#e5e7eb] text-[#374151] rounded-md px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5 px-0.5">Email Corporativo</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#e5e7eb] text-[#374151] rounded-md px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all"
                    placeholder="nombre@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5 px-0.5">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-[#e5e7eb] text-[#374151] rounded-md px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all"
                    placeholder="8+ caracteres"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a56db] hover:bg-[#1649c0] text-white text-[13px] font-bold py-3.5 rounded-md transition-all shadow-md active:scale-[0.99] disabled:opacity-50 mt-6 uppercase tracking-widest"
                >
                  {loading ? 'Procesando registro...' : 'Verificar y Registrar'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#e5e7eb] text-center">
                <p className="text-[14px] text-[#6b7280]">
                  ¿Ya tienes acceso?{' '}
                  <Link href="/login" className="text-[#1a56db] font-bold hover:underline">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
