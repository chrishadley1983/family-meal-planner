'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { useSession } from 'next-auth/react'

export default function ShoppingListsPage() {
  const { data: session } = useSession()

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Shopping Lists"
        description="Automatically generated from your meal plans"
      >
        <div className="card p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Shopping Lists Coming Soon</h3>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            Shopping lists will be automatically generated from your meal plans, combining ingredients from all recipes and your weekly staples. You'll be able to check off items as you shop and track what's already in your inventory.
          </p>
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-6 max-w-2xl mx-auto text-left">
            <h4 className="font-semibold text-white mb-3">Planned Features:</h4>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Automatically consolidate ingredients from meal plan recipes</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Include weekly staples automatically</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Cross-reference with your inventory to avoid buying items you already have</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Organize items by category for efficient shopping</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Check off items as you shop</span>
              </li>
            </ul>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}
