'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'

interface MealPlanExportModalProps {
  isOpen: boolean
  onClose: () => void
  mealPlanId: string
  weekStartDate: string
  weekEndDate: string
  mealCount: number
}

type ViewMode = 'options' | 'email'

export default function MealPlanExportModal({
  isOpen,
  onClose,
  mealPlanId,
  weekStartDate,
  weekEndDate,
  mealCount,
}: MealPlanExportModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('options')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Email compose state
  const [emailTo, setEmailTo] = useState('')

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('options')
      setEmailTo('')
      setErrorMessage('')
      setIsLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const startDate = parseISO(weekStartDate)
  const endDate = parseISO(weekEndDate)
  const dateRange = `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`

  const handleDownloadWeeklyPDF = () => {
    window.open(`/api/meal-plans/${mealPlanId}/pdf`, '_blank')
  }

  const handleDownloadCookingPlanPDF = () => {
    window.open(`/api/meal-plans/${mealPlanId}/cooking-plan-pdf`, '_blank')
  }

  const handleWhatsAppShare = () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      // Create WhatsApp message with meal plan summary
      const message = `Here's my meal plan from FamilyFuel:

📅 Week of ${dateRange}
🍽️ ${mealCount} meals planned

View and download the full plan in the FamilyFuel app!

---
Sent from FamilyFuel - Family Meal Planning Made Easy`

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    } catch (error) {
      console.error('Failed to share via WhatsApp:', error)
      setErrorMessage('Failed to open WhatsApp')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowEmailCompose = () => {
    setViewMode('email')
  }

  const handleSendEmail = () => {
    if (!emailTo) return

    const subject = `Meal Plan: Week of ${dateRange}`
    const body = `Hi,

Here's my meal plan from FamilyFuel:

📅 Week of ${dateRange}
🍽️ ${mealCount} meals planned

Download the PDFs:
- Weekly Overview: ${window.location.origin}/api/meal-plans/${mealPlanId}/pdf
- Cooking Plan: ${window.location.origin}/api/meal-plans/${mealPlanId}/cooking-plan-pdf

---
Sent from FamilyFuel - Family Meal Planning Made Easy`

    // Use Gmail compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    window.open(gmailUrl, '_blank')
  }

  const handleClose = () => {
    setViewMode('options')
    setErrorMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-white">Export & Share</h2>
              <p className="text-sm text-gray-400 mt-1">
                Week of {dateRange}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Email Compose View */}
        {viewMode === 'email' && (
          <div className="p-4 border-b border-gray-700">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  readOnly
                  value={`Meal Plan: Week of ${dateRange}`}
                  className="w-full bg-gray-700 text-gray-400 px-3 py-2 rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Preview
                </label>
                <div className="bg-gray-900 rounded p-3 text-sm text-gray-300 max-h-32 overflow-y-auto">
                  <p>Hi,</p>
                  <p className="mt-2">Here&apos;s my meal plan from FamilyFuel:</p>
                  <p className="mt-2">📅 Week of {dateRange}</p>
                  <p>🍽️ {mealCount} meals planned</p>
                  <p className="mt-2 text-gray-400 text-xs">Download PDFs:</p>
                  <p className="text-purple-400 break-all text-xs">Weekly Overview & Cooking Plan links included</p>
                  <p className="mt-2 text-gray-500 text-xs">---</p>
                  <p className="text-gray-500 text-xs">Sent from FamilyFuel</p>
                </div>
              </div>

              <button
                onClick={handleSendEmail}
                disabled={!emailTo || isLoading}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Open Email Client
              </button>

              {errorMessage && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              <button
                onClick={() => setViewMode('options')}
                className="w-full px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* Options View */}
        {viewMode === 'options' && (
          <div className="p-4 space-y-3">
            {/* Weekly Plan PDF */}
            <button
              onClick={handleDownloadWeeklyPDF}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">📄</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Weekly Plan PDF</p>
                <p className="text-sm text-gray-400">
                  Landscape format, 1 page for printing
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Cooking Plan PDF */}
            <button
              onClick={handleDownloadCookingPlanPDF}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">🍳</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Cooking Plan PDF</p>
                <p className="text-sm text-gray-400">
                  Daily cooking schedule with times
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                {isLoading ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span className="text-white text-lg">💬</span>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Share via WhatsApp</p>
                <p className="text-sm text-gray-400">
                  Send meal plan summary
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            {/* Email */}
            <button
              onClick={handleShowEmailCompose}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">✉️</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Share via Email</p>
                <p className="text-sm text-gray-400">
                  Compose email with plan details
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
