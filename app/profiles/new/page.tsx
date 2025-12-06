import Link from 'next/link'
import ProfileForm from '@/components/profiles/ProfileForm'

export default function NewProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/profiles" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Profiles
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Family Profile</h1>
        <ProfileForm mode="create" />
      </div>
    </div>
  )
}
