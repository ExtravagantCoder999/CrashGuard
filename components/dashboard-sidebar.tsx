'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  MapPin,
  Bell,
  ImageIcon,
  Settings,
  ChevronRight,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: 'Upload', href: '/dashboard/upload', icon: <Upload className="w-5 h-5" /> },
  { name: 'Live Map', href: '/dashboard/map', icon: <MapPin className="w-5 h-5" /> },
  { name: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="w-5 h-5" /> },
  { name: 'CCTV Samples', href: '/samples', icon: <ImageIcon className="w-5 h-5" /> },
  { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card border border-border"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-lg">CD</span>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-sidebar-primary">Crash Detect</h1>
              <p className="text-xs text-sidebar-accent-foreground">AI Monitor</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                isActive(item.href)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
              {isActive(item.href) && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* Backend status indicator */}
        <div className="absolute bottom-6 left-4 right-4 bg-card/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">Backend Ready</span>
          </div>
        </div>
      </aside>
    </>
  )
}

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-balance">Car Crash Detection</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Live</span>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>
    </header>
  )
}
