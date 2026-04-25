'use client'

import React from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarContext'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DashboardContentProps {
  children: React.ReactNode
  header: React.ReactNode
  bottomNav: React.ReactNode
  floatingWidget: React.ReactNode
}

function DashboardContent({ 
  children, 
  header,
  bottomNav,
  floatingWidget
}: DashboardContentProps) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      <Sidebar />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:ml-[80px]" : "lg:ml-[240px]"
      )}>
        {header}
        <main className="p-4 sm:p-6 lg:p-8 pb-32 lg:pb-16 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
        {floatingWidget}
        {bottomNav}
      </div>
    </div>
  )
}

export default function DashboardShell({ 
  children, 
  header,
  bottomNav,
  floatingWidget
}: DashboardContentProps) {
  return (
    <SidebarProvider>
      <DashboardContent 
        header={header} 
        bottomNav={bottomNav} 
        floatingWidget={floatingWidget}
      >
        {children}
      </DashboardContent>
    </SidebarProvider>
  )
}
