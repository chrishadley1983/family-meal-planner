import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-white sm:text-6xl md:text-7xl">
              <span className="block">Family Meal Planner</span>
              <span className="block text-purple-400 mt-2">Made Simple</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-zinc-400">
              Plan your family meals, manage recipes, track inventory, and generate smart shopping lists
              with AI-powered assistance.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border border-zinc-700 text-base font-medium rounded-md text-zinc-300 bg-zinc-900 hover:bg-zinc-800 md:py-4 md:text-lg md:px-10 shadow-md"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-md">
              <div className="text-purple-400 mb-4">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Meal Planning</h3>
              <p className="text-zinc-400">Let AI generate personalized weekly meal plans based on your family preferences</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-md">
              <div className="text-purple-400 mb-4">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Recipe Management</h3>
              <p className="text-zinc-400">Store, organize, and import recipes from URLs with automatic parsing</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-md">
              <div className="text-purple-400 mb-4">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Shopping Lists</h3>
              <p className="text-zinc-400">Auto-generate shopping lists from meal plans and track your inventory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
