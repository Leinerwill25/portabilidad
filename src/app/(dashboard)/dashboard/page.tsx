import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Check,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import SupervisorSelector from '@/components/dashboard/SupervisorSelector'
import CoordinatorDashboardContainer from '@/components/dashboard/CoordinatorDashboardContainer'

import SupervisorDashboardContainer from '@/components/dashboard/SupervisorDashboardContainer'

interface SearchAudit {
  id: string
  dn_code: string
  results: unknown
  searched_at: string
  ip_address: string
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ supervisorId?: string, tab?: string }> }) {
  const params = await searchParams
  const selectedSupervisorId = params.supervisorId
  const initialTab = params.tab
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  // 1. Obtener Rol del Usuario Actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  const isCoordinator = profile?.role === 'superadmin' || profile?.role === 'coordinator'

  // 2. Si es coordinador, obtener sus supervisores asignados para el filtro
  let assignedSupervisors: { id: string, name: string }[] = []
  if (isCoordinator) {
    const { data: assignments } = await supabase
      .from('coordinator_supervisors')
      .select('supervisor_id, profiles!inner(full_name, email)')
      .eq('coordinator_id', userId)
    
    assignedSupervisors = (assignments || []).map((a: { supervisor_id: string, profiles: { full_name: string | null, email: string | null } | null }) => ({
      id: a.supervisor_id,
      name: a.profiles?.full_name || a.profiles?.email || 'Site'
    }))
  }

  // 3. Determinar el dueño del contenido a visualizar (Contexto de Supervisión)
  const contextSupervisorId = selectedSupervisorId || userId

  // Fetch metrics filtered by the current user
  const [
    { count: sellersCount },
    { count: sheetsCount },
    { data: recentSearches },
    { count: todaySearchesCount },
    { count: totalSearchesOverall }
  ] = await Promise.all([
    supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('created_by', contextSupervisorId),
    supabase.from('seller_sheets')
      .select('*, sellers!inner(*)', { count: 'exact', head: true })
      .eq('sellers.created_by', contextSupervisorId),
    supabase.from('dn_searches')
      .select('*')
      .order('searched_at', { ascending: false })
      .limit(7), // User requested max 7
    supabase.from('dn_searches')
      .select('*', { count: 'exact', head: true })
      .gte('searched_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('dn_searches')
      .select('*', { count: 'exact', head: true })
  ])

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a2744] mb-1">
            {isCoordinator ? 'Panel de Coordinación' : 'Dashboard Administrativo'}
          </h1>
          <p className="text-[13px] text-[#6b7280]">
            {isCoordinator 
              ? 'Gestión jerárquica de supervisores y rendimiento global' 
              : 'Gestión institucional de la red de portabilidad'}
          </p>
        </div>
        
        {isCoordinator && assignedSupervisors.length > 0 && (
          <SupervisorSelector supervisors={assignedSupervisors} />
        )}

        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg shadow-sm self-start sm:self-center">
          <div className="h-2 w-2 rounded-full bg-[#166534] animate-pulse" />
          <span className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider">Sistema Operativo</span>
        </div>
      </div>

      {isCoordinator ? (
        <CoordinatorDashboardContainer 
          initialTab={initialTab || 'global'}
          recentSearches={(recentSearches || []) as unknown as SearchAudit[]}
          totalSearchesOverall={totalSearchesOverall || 0}
        />
      ) : (
        <SupervisorDashboardContainer 
          initialTab={initialTab || 'daily'}
          supervisorId={userId}
          stats={{
            sellersCount: sellersCount || 0,
            sheetsCount: sheetsCount || 0,
            todaySearchesCount: todaySearchesCount || 0
          }}
        />
      )}


      {/* Búsquedas Recientes - OCULTAR PARA COORDINADOR (Ya incluido en sus pestañas si se desea, o simplemente ocultar para limpiar) */}
      {!isCoordinator && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
            <h3 className="text-[15px] font-bold text-[#1a2744] flex items-center gap-2">
              <Clock className="text-[#3b82f6]" size={16} />
              Búsquedas Recientes
            </h3>
            <Link href="/search" className="text-[13px] text-[#1a56db] font-bold hover:underline flex items-center gap-1 group">
              Ejecutar nueva consulta
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                  <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Código DN</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest text-right">Origen IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {recentSearches?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#9ca3af] text-[13px]">
                      No se registran actividades de búsqueda recientes en el sistema.
                    </td>
                  </tr>
                ) : (
                  (recentSearches as unknown as SearchAudit[])?.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f1f5f9] transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-[#1a2744] font-bold font-mono tracking-tight">{s.dn_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          s.results && Array.isArray(s.results) && s.results.length > 0 
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' 
                            : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb]'
                        }`}>
                          {s.results && Array.isArray(s.results) && s.results.length > 0 ? (
                            <><Check size={10} /> {s.results.length} Hallazgos</>
                          ) : 'Sin registros'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-[#4b5563]">
                        {new Date(s.searched_at).toLocaleString('es-VE', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#6b7280] text-right font-mono">
                        {s.ip_address}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-[#e5e7eb] border-b border-[#e5e7eb]">
            {recentSearches?.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#9ca3af] text-[13px]">
                No se registran actividades recientes.
              </div>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (recentSearches as any[])?.map((s: any) => (
                <div key={s.id} className="p-4 flex flex-col gap-3 active:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-[#1a2744] font-mono">{s.dn_code || s.dn_code}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      s.results?.length > 0 
                        ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' 
                        : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb]'
                    }`}>
                      {s.results?.length > 0 ? `${s.results.length} Hallazgos` : 'Sin registros'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6b7280]">
                    <span>{new Date(s.searched_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono text-[10px] opacity-70">IP: {s.ip_address}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total Summary Footer */}
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e5e7eb] flex items-center justify-between">
             <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#64748b] uppercase tracking-widest">Total histórico de consultas</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-[#e2e8f0] shadow-sm">
                <span className="text-[14px] font-black text-[#1e293b]">{totalSearchesOverall || 0}</span>
                <span className="text-[10px] font-bold text-[#64748b] uppercase">Vistas</span>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
