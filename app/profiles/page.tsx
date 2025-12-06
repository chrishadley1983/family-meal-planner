'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FamilyProfile {
  id: string
  profileName: string
  age?: number
  activityLevel?: string
  foodLikes: string[]
  foodDislikes: string[]
  macroTrackingEnabled: boolean
}

export default function ProfilesPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProfiles(profiles.filter(p => p.id !== id))
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading profiles...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Family Profiles</h1>
            <p className="text-gray-600 mt-1">Manage your family member profiles and preferences</p>
          </div>
          <Link
            href="/profiles/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Profile
          </Link>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No profiles yet</h3>
            <p className="mt-1 text-gray-500">Get started by creating your first family profile.</p>
            <Link
              href="/profiles/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Profile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{profile.profileName}</h3>
                    {profile.age && (
                      <span className="text-sm text-gray-500">{profile.age} years</span>
                    )}
                  </div>

                  {profile.activityLevel && (
                    <p className="text-sm text-gray-600 mb-2">
                      Activity: {profile.activityLevel}
                    </p>
                  )}

                  {profile.foodLikes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Likes:</p>
                      <p className="text-sm text-gray-600">{profile.foodLikes.slice(0, 3).join(', ')}{profile.foodLikes.length > 3 && '...'}</p>
                    </div>
                  )}

                  {profile.foodDislikes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Dislikes:</p>
                      <p className="text-sm text-gray-600">{profile.foodDislikes.slice(0, 3).join(', ')}{profile.foodDislikes.length > 3 && '...'}</p>
                    </div>
                  )}

                  {profile.macroTrackingEnabled && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      Macro Tracking
                    </span>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <Link
                      href={`/profiles/${profile.id}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
                    >
                      Edit
                    </Link>
                    {deleteConfirm === profile.id ? (
                      <div className="flex-1 flex space-x-2">
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(profile.id)}
                        className="flex-1 px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
