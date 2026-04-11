import React from 'react'

export default function SellerDashboardLoading() {
  return (
    <div className="space-y-10 pb-10 animate-pulse">
      {/* Hero Skeleton */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-200 h-[320px] lg:h-[380px]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
      </section>

      {/* Grid de Estadísticas Skeleton */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 h-[180px]">
             <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-6" />
             <div className="w-24 h-8 bg-slate-100 rounded-lg mb-2" />
             <div className="w-16 h-4 bg-slate-50 rounded-lg" />
          </div>
        ))}
      </section>

      {/* Grid Inferior Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 h-[400px]" />
        <div className="space-y-6">
           <div className="bg-slate-200 rounded-[2rem] h-[220px]" />
           <div className="bg-white border border-slate-200 rounded-[2rem] h-[120px]" />
        </div>
      </div>
    </div>
  )
}
