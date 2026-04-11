import React from 'react'

export default function NewRegistrationLoading() {
  return (
    <div className="space-y-10 pb-20 animate-pulse">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-200 p-10 lg:p-14 h-[240px]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
      </div>

      {/* Form Skeleton */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                   <div className="w-20 h-3 bg-slate-100 rounded ml-1" />
                   <div className="w-full h-12 bg-slate-50 rounded-2xl" />
                </div>
              ))}
           </div>
           <div className="mt-12 flex justify-end">
              <div className="w-48 h-14 bg-slate-200 rounded-[2rem]" />
           </div>
        </div>
      </div>
    </div>
  )
}
