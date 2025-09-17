
import * as React from 'react'
import { cn } from '@/lib/utils'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn('inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium shadow-sm border border-gray-200 hover:bg-gray-50', className)}
      {...props}
    />
  )
}
