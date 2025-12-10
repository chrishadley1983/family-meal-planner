'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  generateShoppingListPDF,
  downloadPDF,
} from '@/lib/export/generatePDF'

interface ShoppingListItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  isPurchased: boolean
}

interface ShoppingListData {
  id: string
  name: string
  items: ShoppingListItem[]
}

interface ItemsByCategory {
  [category: string]: ShoppingListItem[]
}

interface ExportShareModalProps {
  isOpen: boolean
  onClose: () => void
  shoppingList: ShoppingListData
  itemsByCategory: ItemsByCategory
}

type ExportState = 'idle' | 'generating' | 'success' | 'error'

interface ShareLinkData {
  shareUrl: string
  expiresAt: string
  isNew?: boolean
}

export default function ExportShareModal({
  isOpen,
  onClose,
  shoppingList,
  itemsByCategory,
}: ExportShareModalProps) {
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // QR Code state
  const [shareLink, setShareLink] = useState<ShareLinkData | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowQrCode(false)
      setLinkCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDownloadPDF = async () => {
    setExportState('generating')
    setErrorMessage('')

    try {
      console.log('🔷 Starting PDF download...')
      const doc = await generateShoppingListPDF(shoppingList, itemsByCategory)
      downloadPDF(doc, shoppingList.name)
      setExportState('success')
      console.log('🟢 PDF download complete')

      setTimeout(() => {
        setExportState('idle')
      }, 2000)
    } catch (error) {
      console.error('❌ PDF generation failed:', error)
      setExportState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate PDF')
    }
  }

  const handleShowQrCode = async () => {
    setQrLoading(true)
    setShowQrCode(true)
    setErrorMessage('') // Clear any previous errors

    try {
      console.log('🔷 Fetching share link for list:', shoppingList.id)

      // First check if there's an existing share link
      let linkData: ShareLinkData

      const getResponse = await fetch(`/api/shopping-lists/${shoppingList.id}/share`)
      console.log('🔷 GET response status:', getResponse.status)
      const getData = await getResponse.json()
      console.log('🔷 GET response data:', getData)

      if (getData.shareUrl) {
        // Use existing link
        linkData = {
          shareUrl: getData.shareUrl,
          expiresAt: getData.expiresAt,
        }
        console.log('🔗 Using existing share link')
      } else {
        // Create new share link
        console.log('🔷 Creating new share link...')
        const postResponse = await fetch(`/api/shopping-lists/${shoppingList.id}/share`, {
          method: 'POST',
        })
        console.log('🔷 POST response status:', postResponse.status)

        if (!postResponse.ok) {
          const errorData = await postResponse.json()
          console.error('❌ POST error:', errorData)
          throw new Error(errorData.error || 'Failed to create share link')
        }

        const postData = await postResponse.json()
        console.log('🔷 POST response data:', postData)
        linkData = {
          shareUrl: postData.shareUrl,
          expiresAt: postData.expiresAt,
          isNew: true,
        }
        console.log('🔗 Created new share link')
      }

      setShareLink(linkData)

      // Generate QR code
      console.log('🔷 Generating QR code for URL:', linkData.shareUrl)
      const qrDataUrl = await QRCode.toDataURL(linkData.shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      console.log('🟢 QR code generated successfully')
      setQrCodeDataUrl(qrDataUrl)
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate share link')
    } finally {
      setQrLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink.shareUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleClose = () => {
    setExportState('idle')
    setErrorMessage('')
    setShowQrCode(false)
    onClose()
  }

  const formatExpiry = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalItems = shoppingList.items.length
  const purchasedItems = shoppingList.items.filter((i) => i.isPurchased).length
  const categoryCount = Object.keys(itemsByCategory).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-white">Export & Share</h2>
              <p className="text-sm text-gray-400 mt-1">
                {totalItems} items across {categoryCount} categories
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

          {/* Preview info */}
          <div className="mt-4 bg-gray-750 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{shoppingList.name}</p>
                <p className="text-xs text-gray-400">
                  {purchasedItems} of {totalItems} purchased
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        {showQrCode && (
          <div className="p-4 border-b border-gray-700">
            <div className="bg-white rounded-lg p-4 flex flex-col items-center">
              {qrLoading ? (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : qrCodeDataUrl ? (
                <>
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
                  <p className="text-gray-600 text-sm mt-2 text-center">
                    Scan to view shopping list
                  </p>
                </>
              ) : null}
            </div>

            {shareLink && (
              <div className="mt-3 space-y-2">
                {/* Share URL */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink.shareUrl}
                    className="flex-1 bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded border border-gray-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      linkCopied
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Expiry info */}
                <p className="text-xs text-gray-400 text-center">
                  Link expires: {formatExpiry(shareLink.expiresAt)}
                </p>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => setShowQrCode(false)}
              className="w-full mt-3 px-4 py-2 text-gray-400 hover:text-white text-sm"
            >
              ← Back to options
            </button>
          </div>
        )}

        {/* Export Options */}
        {!showQrCode && (
          <div className="p-4 space-y-3">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={exportState === 'generating'}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
                {exportState === 'generating' ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : exportState === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">
                  {exportState === 'generating'
                    ? 'Generating PDF...'
                    : exportState === 'success'
                    ? 'PDF Downloaded!'
                    : 'Download PDF'}
                </p>
                <p className="text-sm text-gray-400">
                  Print-friendly shopping list with checkboxes
                </p>
              </div>
              {exportState === 'idle' && (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>

            {/* QR Code */}
            <button
              onClick={handleShowQrCode}
              className="w-full flex items-center gap-4 p-4 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Show QR Code</p>
                <p className="text-sm text-gray-400">
                  Shareable link valid for 48 hours
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Coming Soon: WhatsApp */}
            <button
              disabled
              className="w-full flex items-center gap-4 p-4 bg-gray-750 rounded-lg opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Share via WhatsApp</p>
                <p className="text-sm text-gray-400">Coming in Phase 4</p>
              </div>
            </button>

            {/* Coming Soon: Email */}
            <button
              disabled
              className="w-full flex items-center gap-4 p-4 bg-gray-750 rounded-lg opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Share via Email</p>
                <p className="text-sm text-gray-400">Coming in Phase 5</p>
              </div>
            </button>
          </div>
        )}

        {/* Error Message */}
        {exportState === 'error' && (
          <div className="px-4 pb-4">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
