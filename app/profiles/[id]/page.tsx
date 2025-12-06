'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import ProfileForm from '@/components/profiles/ProfileForm'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export default function EditProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${id}`)
      if (!response.ok) {
        setError('Profile not found')
        setLoading(false)
        return
      }
      const data = await response.json()
      setProfile(data.profile)
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
          <Link href="/profiles" className="text-blue-600 hover:text-blue-800">
            Back to Profiles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/profiles" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Profiles
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>
        <ProfileForm mode="edit" profileId={id} initialData={profile} />
      </div>
    </div>
  )
}
