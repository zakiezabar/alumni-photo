"use client"

import * as React from "react"
import { useEffect } from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
  {
    variants: {
      variant: {
        default: "bg-background border",
        destructive: "destructive group border-destructive bg-destructive text-mono-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  open?: boolean
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

export function Toast({
  className,
  variant,
  open,
  onClose,
  autoClose = true,
  duration = 5000,
  ...props
}: ToastProps) {
  // Effect for auto-closing the toast
  useEffect (() => {
    if (open && autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      //Clean up the timer if the component unmounts or if open changes
      return () => {
        clearTimeout(timer)
      }
    }
  }, [open, autoClose, onClose, duration])
  return (
    open && (
      <div
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">{props.children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    )
  )
}