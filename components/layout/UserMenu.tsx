'use client'

import Link from 'next/link'
import { Settings, LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface UserMenuProps {
  firstName: string
  familyName: string
  initials: string
  email?: string
}

export function UserMenu({ firstName, familyName, initials, email }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-3 border-l border-zinc-700 hover:opacity-80 transition-opacity"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
          {initials}
        </div>
        {/* Name (hidden on smaller screens) */}
        <div className="hidden lg:block text-left">
          <div className="text-sm font-medium text-white">{firstName}</div>
          <div className="text-xs text-zinc-500">{familyName}</div>
        </div>
        {/* Settings icon */}
        <Settings className="w-4 h-4 text-zinc-500 ml-1 hover:text-zinc-300" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg py-1 z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{firstName}</div>
                <div className="text-xs text-zinc-500">{familyName}</div>
              </div>
            </div>
            {email && (
              <div className="text-xs text-zinc-500 mt-2 truncate">{email}</div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/profiles"
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              Family Profiles
            </Link>
            <Link
              href="/settings/meal-planning"
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-zinc-800 py-1">
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
