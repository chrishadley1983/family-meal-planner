'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
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
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading profiles...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Family Profiles"
        description="Manage your family member profiles and preferences"
        action={
          <Link href="/profiles/new">
            <Button variant="primary">Add Profile</Button>
          </Link>
        }
      >
        {profiles.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">No profiles yet</h3>
            <p className="mt-1 text-zinc-400">Get started by creating your first family profile.</p>
            <Link href="/profiles/new" className="mt-4 inline-block">
              <Button variant="primary">Add Profile</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div key={profile.id} className="card-interactive overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">{profile.profileName}</h3>
                    {profile.age && (
                      <span className="text-sm text-zinc-400">{profile.age} years</span>
                    )}
                  </div>

                  {profile.activityLevel && (
                    <p className="text-sm text-zinc-300 mb-2">
                      Activity: {profile.activityLevel}
                    </p>
                  )}

                  {profile.foodLikes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-zinc-300">Likes:</p>
                      <p className="text-sm text-zinc-400">{profile.foodLikes.slice(0, 3).join(', ')}{profile.foodLikes.length > 3 && '...'}</p>
                    </div>
                  )}

                  {profile.foodDislikes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-zinc-300">Dislikes:</p>
                      <p className="text-sm text-zinc-400">{profile.foodDislikes.slice(0, 3).join(', ')}{profile.foodDislikes.length > 3 && '...'}</p>
                    </div>
                  )}

                  {profile.macroTrackingEnabled && (
                    <Badge variant="success" size="sm" className="mt-2">
                      Macro Tracking
                    </Badge>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <Link href={`/profiles/${profile.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        Edit
                      </Button>
                    </Link>
                    {deleteConfirm === profile.id ? (
                      <div className="flex-1 flex space-x-2">
                        <Button
                          onClick={() => handleDelete(profile.id)}
                          variant="danger"
                          size="sm"
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(null)}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setDeleteConfirm(profile.id)}
                        variant="danger"
                        size="sm"
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}
