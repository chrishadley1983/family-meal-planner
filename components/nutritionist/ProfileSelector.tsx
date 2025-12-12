'use client'

import { useState, useEffect, useRef } from 'react'

export interface Profile {
  id: string
  profileName: string
  avatarUrl?: string | null
  isMainUser?: boolean
}

interface ProfileSelectorProps {
  profiles: Profile[]
  selectedProfileId: string | null
  onSelect: (profileId: string) => void
  disabled?: boolean
}

export function ProfileSelector({
  profiles,
  selectedProfileId,
  onSelect,
  disabled = false,
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${disabled
            ? 'bg-zinc-800 border-zinc-700 cursor-not-allowed opacity-60'
            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 cursor-pointer'
          }
        `}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
          {selectedProfile?.avatarUrl ? (
            <img
              src={selectedProfile.avatarUrl}
              alt={selectedProfile.profileName}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(selectedProfile?.profileName || 'Select')
          )}
        </div>

        {/* Name */}
        <span className="text-sm text-zinc-200">
          {selectedProfile?.profileName || 'Select profile'}
        </span>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                onSelect(profile.id)
                setIsOpen(false)
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
                ${profile.id === selectedProfileId
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-zinc-200 hover:bg-zinc-700'
                }
              `}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.profileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(profile.profileName)
                )}
              </div>

              {/* Name */}
              <span className="text-sm">{profile.profileName}</span>

              {/* Main user badge */}
              {profile.isMainUser && (
                <span className="ml-auto text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                  You
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
