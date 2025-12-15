import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
  className?: string
}

export function PageContainer({
  children,
  title,
  description,
  action,
  maxWidth = '7xl',
  className = '',
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto py-6 sm:px-6 lg:px-8 ${className}`}>
      {(title || action) && (
        <div className="px-4 sm:px-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-white">{title}</h1>
              )}
              {description && (
                <p className="mt-2 text-sm text-zinc-400">{description}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </div>
      )}
      <div className="px-4 sm:px-0">{children}</div>
    </div>
  )
}

// Subcomponent for sections within a page
interface PageSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function PageSection({
  children,
  title,
  description,
  className = '',
}: PageSectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
