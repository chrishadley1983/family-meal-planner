'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import ProfileForm from '@/components/profiles/ProfileForm'
import { AppLayout, PageContainer } from '@/components/layout'
import { useSession } from 'next-auth/react'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export default function EditProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    try {
      console.log('📥 Fetching profile:', id)
      const response = await fetch(`/api/profiles/${id}`)
      console.log('📥 Profile response status:', response.status)
      if (!response.ok) {
        setError('Profile not found')
        setLoading(false)
        return
      }
      const data = await response.json()
      console.log('📥 Profile data received:', data.profile)
      setProfile(data.profile)
    } catch (err) {
      console.error('❌ Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading profile...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  if (error || !profile) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error || 'Profile not found'}</p>
              <Link href="/profiles" className="text-purple-400 hover:text-purple-300">
                ← Back to Profiles
              </Link>
            </div>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="4xl">
        <Link href="/profiles" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
          ← Back to Profiles
        </Link>
        <h1 className="text-3xl font-bold text-white mb-8">Edit Profile</h1>
        <ProfileForm mode="edit" profileId={id} initialData={profile} />
      </PageContainer>
    </AppLayout>
  )
}
