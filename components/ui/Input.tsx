import React from 'react'

// Label Component
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  required?: boolean
}

export function Label({ className = '', children, required, ...props }: LabelProps) {
  return (
    <label className={`label ${className}`} {...props}>
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}

// Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''

    return (
      <input
        ref={ref}
        className={`input ${errorClass} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  children: React.ReactNode
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''

    return (
      <select
        ref={ref}
        className={`select ${errorClass} ${className}`}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

// Checkbox Component
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={`w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900 ${className}`}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="text-sm text-zinc-300 cursor-pointer">
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

// Field Component (wrapper for Input/Select with Label and Error)
export interface FieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactElement
  className?: string
}

export function Field({ label, error, required, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
