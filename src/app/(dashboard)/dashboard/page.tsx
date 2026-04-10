import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Check,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { Suspense } from 'react'
import SupervisorSelector from '@/components/dashboard/SupervisorSelector'
import CoordinatorDashboardContainer from '@/components/dashboard/CoordinatorDashboardContainer'

import SupervisorDashboardContainer from '@/components/dashboard/SupervisorDashboardContainer'
import DashboardSearchAudit, { type SearchAudit } from '@/components/dashboard/DashboardSearchAudit'

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
      .limit(100), // Reduced from 1000 as stats are now fetched separately per week
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
          <Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-lg" />}>
            <SupervisorSelector supervisors={assignedSupervisors} />
          </Suspense>
        )}

        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg shadow-sm self-start sm:self-center">
          <div className="h-2 w-2 rounded-full bg-[#166534] animate-pulse" />
          <span className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider">Sistema Operativo</span>
        </div>
      </div>

      {isCoordinator ? (
        <Suspense fallback={<div className="h-[400px] w-full bg-white rounded-3xl animate-pulse" />}>
          <CoordinatorDashboardContainer 
            initialTab={initialTab || 'global'}
            recentSearches={(recentSearches || []) as unknown as SearchAudit[]}
            totalSearchesOverall={totalSearchesOverall || 0}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="h-[400px] w-full bg-white rounded-3xl animate-pulse" />}>
          <SupervisorDashboardContainer 
            initialTab={initialTab || 'daily'}
            supervisorId={userId}
            stats={{
              sellersCount: sellersCount || 0,
              sheetsCount: sheetsCount || 0,
              todaySearchesCount: todaySearchesCount || 0
            }}
          />
        </Suspense>
      )}



      {!isCoordinator && (
        <DashboardSearchAudit 
          initialSearches={(recentSearches || []) as unknown as SearchAudit[]}
          totalSearchesOverall={totalSearchesOverall || 0}
        />
      )}
    </div>
  )
}
