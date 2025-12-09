'use client'

import Link from 'next/link'
import ProfileForm from '@/components/profiles/ProfileForm'
import { AppLayout, PageContainer } from '@/components/layout'
import { useSession } from 'next-auth/react'

export default function NewProfilePage() {
  const { data: session } = useSession()

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="4xl">
        <Link href="/profiles" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
          ← Back to Profiles
        </Link>
        <h1 className="text-3xl font-bold text-white mb-8">Create Family Profile</h1>
        <ProfileForm mode="create" />
      </PageContainer>
    </AppLayout>
  )
}
