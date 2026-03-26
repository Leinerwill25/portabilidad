'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Supervisor {
  id: string
  name: string
}

interface SupervisorSelectorProps {
  supervisors: Supervisor[]
}

export default function SupervisorSelector({ supervisors }: SupervisorSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSupervisorId = searchParams.get('supervisorId') || ''

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val) {
      router.push(`/dashboard?supervisorId=${val}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-[#e2e8f0] shadow-sm">
      <span className="text-[11px] font-black text-[#64748b] uppercase tracking-widest pl-2">Ver estadísticas de:</span>
      <select 
        className="bg-[#f8fafc] border border-[#e2e8f0] text-[12px] font-bold text-[#1e293b] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        value={currentSupervisorId}
        onChange={handleChange}
      >
        <option value="">Mi propio Dashboard</option>
        {supervisors.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}
