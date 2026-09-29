import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from 'sonner'
import { useTheme } from '@/features/theme/theme'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      gap={8}
      toastOptions={{
        classNames: {
          toast: '!elevated !rounded-xl !border !border-border !bg-surface !text-fg !text-[13px]',
          description: '!text-muted',
          success: '[&_[data-icon]]:!text-emerald-500',
          error: '[&_[data-icon]]:!text-red-500',
          closeButton: '!bg-surface-2 !border-border !text-muted hover:!text-fg',
        },
      }}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Springs and layout animations turn off when the OS asks for reduced motion. */}
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ThemedToaster />
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
)
