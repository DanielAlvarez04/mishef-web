"use client"

import { useState, useTransition } from "react"

export interface ActionFormResult<T = unknown> {
  ok: boolean
  message?: string
  data?: T
}

export function useActionForm<T = unknown>(
  onSuccess?: (result: ActionFormResult<T>) => void
) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(
    action: () => Promise<ActionFormResult<T>>
  ): Promise<boolean> {
    setError(null)

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action()
          if (!result.ok) {
            setError(result.message ?? "La operación falló")
            resolve(false)
            return
          }
          onSuccess?.(result)
          resolve(true)
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "La operación falló"
          )
          resolve(false)
        }
      })
    })
  }

  return { pending, error, run, setError }
}
