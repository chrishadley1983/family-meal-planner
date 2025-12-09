import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'purple' | 'orange' | 'success' | 'warning' | 'error' | 'default'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  // Map variants to CSS classes
  const variantClasses = {
    default: 'badge',
    purple: 'badge-purple',
    orange: 'badge-orange',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
  }

  // Size-specific classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  const variantClass = variantClasses[variant]
  const sizeClass = sizeClasses[size]

  return (
    <span className={`${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </span>
  )
}
