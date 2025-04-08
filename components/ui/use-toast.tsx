"use client"

import * as React from "react"
import { Toast } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
  open: boolean
}

const ToastContext = React.createContext<{
  toasts: ToasterToast[]
  addToast: (toast: Omit<ToasterToast, "id" | "open">) => void
  dismissToast: (id: string) => void
}>({
  toasts: [],
  addToast: () => {},
  dismissToast: () => {},
})

export function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const addToast = React.useCallback(
    (toast: Omit<ToasterToast, "id" | "open">) => {
      setToasts((state) => {
        const newToast = {
          ...toast,
          id: crypto.randomUUID(),
          open: true,
        }

        // If we already have the max number of toasts, remove the oldest one
        if (state.length >= TOAST_LIMIT) {
          const oldestToastIndex = state.findIndex(
            (toast) => toast.open === true
          )
          if (oldestToastIndex !== -1) {
            // Close the oldest toast
            const nextState = [...state]
            nextState[oldestToastIndex].open = false
            return [...nextState, newToast]
          }
        }

        return [...state, newToast]
      })
    },
    []
  )

  const dismissToast = React.useCallback((id: string) => {
    setToasts((state) =>
      state.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    )

    // Remove the toast after a delay
    setTimeout(() => {
      setToasts((state) => state.filter((toast) => toast.id !== id))
    }, TOAST_REMOVE_DELAY)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <ToastList />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const { toasts, addToast, dismissToast } = React.useContext(ToastContext)

  return {
    toast: (props: Omit<ToasterToast, "id" | "open">) => addToast(props),
    dismiss: (id: string) => dismissToast(id),
    toasts,
  }
}

function ToastList() {
  const { toasts, dismissToast } = React.useContext(ToastContext)

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(({ id, title, description, variant, open }) => (
        <Toast
          key={id}
          open={open}
          variant={variant}
          onClose={() => dismissToast(id)}
          className={`${
            open
              ? "animate-in slide-in-from-top-full fade-in-20 sm:slide-in-from-bottom-full"
              : "animate-out slide-out-to-right-full fade-out-80"
          } duration-200`}
        >
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </Toast>
      ))}
    </div>
  )
}