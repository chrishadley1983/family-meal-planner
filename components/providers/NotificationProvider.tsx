'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastContainer, ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
}

interface NotificationContextType {
  /** Show a toast notification */
  showToast: (message: string, type?: ToastType, duration?: number) => void
  /** Show a success toast */
  success: (message: string, duration?: number) => void
  /** Show an error toast */
  error: (message: string, duration?: number) => void
  /** Show a warning toast */
  warning: (message: string, duration?: number) => void
  /** Show an info toast */
  info: (message: string, duration?: number) => void
  /** Show a confirmation dialog and return a promise that resolves to true/false */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
  })

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  )

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true)
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [confirmState.resolve])

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false)
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [confirmState.resolve])

  return (
    <NotificationContext.Provider value={{ showToast, success, error, warning, info, confirm }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        confirmVariant={confirmState.options.confirmVariant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </NotificationContext.Provider>
  )
}

/**
 * Hook to access notification functions.
 * Use this to show toast notifications and confirmation dialogs.
 *
 * @example
 * const { success, error, confirm } = useNotification()
 *
 * // Show success toast
 * success('Recipe saved successfully!')
 *
 * // Show error toast
 * error('Failed to save recipe')
 *
 * // Show confirmation dialog
 * const confirmed = await confirm({
 *   title: 'Delete Recipe',
 *   message: 'Are you sure you want to delete this recipe?',
 *   confirmText: 'Delete',
 *   confirmVariant: 'danger'
 * })
 * if (confirmed) {
 *   // delete the recipe
 * }
 */
export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
