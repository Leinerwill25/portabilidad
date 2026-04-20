'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Si falla la auth normal, intentamos login de vendedor
      try {
        const sellerRes = await fetch('/api/auth/seller/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        
        const sellerData = await sellerRes.json()
        
        if (sellerRes.ok && sellerData.success) {
          toast.success(`¡Bienvenido, ${sellerData.user.name}!`)
          router.push(sellerData.redirect)
          router.refresh()
        } else {
          toast.error(sellerData.error || error.message)
        }
      } catch (err) {
        toast.error('Error al conectar con el servidor de autenticación')
      } finally {
        setLoading(false)
      }
    } else {
      // 2. Si la auth fue exitosa, verificar el estado del perfil
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', user.id)
          .single()

        if (profileError || profile?.is_active === false) {
          await supabase.auth.signOut()
          toast.error('Su cuenta está desactivada. Por favor, contacte al administrador.')
          setLoading(false)
          return
        }
      }

      toast.success('¡Bienvenido de nuevo!')
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left Column (40%) - Navy */}
      <div className="hidden lg:flex w-[40%] bg-[#1a2744] flex-col items-center justify-center p-12 text-center">
        <div className="h-16 w-16 bg-[#1a56db] rounded-xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
          <Search size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">DN Control Center</h1>
        <p className="text-[#94a3b8] text-lg max-w-sm font-medium">
          Sistema Institucional de Gestión y Monitoreo de Portabilidad Numérica.
        </p>
        <div className="mt-24 pt-12 border-t border-white/10 w-full max-w-xs text-[#64748b] text-sm uppercase tracking-[0.2em] font-bold">
          Acceso Restringido
        </div>
      </div>

      {/* Right Column (60%) - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[420px] bg-white p-10 rounded-xl border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-[22px] font-bold text-[#1a2744] mb-1">Iniciar sesión</h2>
            <p className="text-[13px] text-[#6b7280]">Ingresa tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[13px] font-semibold text-[#1a2744] mb-1.5 px-0.5">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#e5e7eb] text-[#374151] rounded-md px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all placeholder:text-[#9ca3af]"
                placeholder="nombre@empresa.com"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <label className="text-[13px] font-semibold text-[#1a2744]">Contraseña</label>
                <Link href="#" className="text-[12px] font-bold text-[#1a56db] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#e5e7eb] text-[#374151] rounded-md px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/5 transition-all placeholder:text-[#9ca3af] pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[10px] text-[#94a3b8] hover:text-[#1a56db] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a56db] hover:bg-[#1649c0] text-white text-[14px] font-bold py-3 rounded-md transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 mt-4 uppercase tracking-wide"
            >
              {loading ? 'Validando...' : 'Acceder al Sistema'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#e5e7eb] text-center">
            <p className="text-[14px] text-[#6b7280]">
              ¿No tienes cuenta?{' '}
              <a 
                href="https://wa.me/584242070878?text=Hola,%20solicito%20acceso%20al%20sistema%20DN%20Portabilidad" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a56db] font-bold hover:underline"
              >
                Contáctanos aquí
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
