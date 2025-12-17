'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Calendar, ChefHat, Sparkles, ShoppingCart, Package, Bell, Menu, X, Home, Tag } from 'lucide-react'
import { UserMenu } from './UserMenu'

interface NavigationProps {
  userEmail?: string
  userName?: string
  familyName?: string
  initials?: string
  shoppingCount?: number
}

// Primary nav items (7 items: Dashboard + 6 core pages)
const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/meal-plans', label: 'Meal Plan', Icon: Calendar },
  { href: '/recipes', label: 'Recipes', Icon: ChefHat },
  { href: '/products', label: 'Products', Icon: Tag },
  { href: '/discover', label: 'Discover', Icon: Sparkles },
  { href: '/shopping-lists', label: 'Shopping', Icon: ShoppingCart, showBadge: true },
  { href: '/inventory', label: 'Inventory', Icon: Package },
]

export function Navigation({
  userEmail,
  userName,
  familyName,
  initials,
  shoppingCount = 0,
}: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<{
    firstName: string
    familyName: string
    initials: string
    shoppingTotal: number
  } | null>(null)

  // Fetch dashboard data for user info and shopping count
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          setDashboardData({
            firstName: data.user.firstName,
            familyName: data.user.familyName,
            initials: data.user.initials,
            shoppingTotal: data.shoppingList.total,
          })
        }
      } catch (error) {
        console.error('🔴 Error fetching dashboard data for nav:', error)
      }
    }
    fetchData()
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  // Use fetched data or props
  const displayName = dashboardData?.firstName || userName || userEmail?.split('@')[0] || 'User'
  const displayFamily = dashboardData?.familyName || familyName || 'Family'
  const displayInitials = dashboardData?.initials || initials || displayName.charAt(0).toUpperCase()
  const displayShoppingCount = dashboardData?.shoppingTotal ?? shoppingCount

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Primary Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-transform hover:scale-105"
          >
            <Image
              src="/logo.png"
              alt="familyFuel"
              width={200}
              height={70}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Primary Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.Icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors relative ${
                    active
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.showBadge && displayShoppingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full">
                      {displayShoppingCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Side - Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Notifications - Desktop */}
          <button className="hidden md:block relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <Bell className="w-5 h-5 text-zinc-400" />
            {/* Notification dot - placeholder for future */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
          </button>

          {/* User Menu - Desktop */}
          <div className="hidden md:block">
            <UserMenu
              firstName={displayName}
              familyName={displayFamily}
              initials={displayInitials}
              email={userEmail}
            />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 mt-2">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {item.showBadge && displayShoppingCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full">
                      {displayShoppingCount}
                    </span>
                  )}
                </Link>
              )
            })}
            {/* Additional mobile links */}
            <Link
              href="/staples"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                isActive('/staples')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <Package className="w-5 h-5" />
              Staples
            </Link>
            <Link
              href="/nutritionist"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                isActive('/nutritionist')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              Nutritionist
            </Link>
          </div>

          {/* Mobile user section */}
          <div className="pt-4 pb-3 border-t border-zinc-800">
            <div className="px-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                {displayInitials}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{displayName}</div>
                <div className="text-xs text-zinc-500">{displayFamily}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link
                href="/profiles"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                Family Profiles
              </Link>
              <Link
                href="/api/auth/signout"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-red-400 hover:bg-zinc-800/50"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
