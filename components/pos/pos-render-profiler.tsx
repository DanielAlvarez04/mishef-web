"use client"

import * as React from "react"

/**
 * Profiler de desarrollo para medir commits reales del POS.
 *
 * Se activa con `NEXT_PUBLIC_POS_PERF=1` o, en desarrollo, añadiendo
 * `?pos-profiler=1`. El test de Playwright captura los `[pos-profiler]` para
 * dejar evidencia del coste de render de PosView/PosCatalog.
 */
const PROFILER_ENABLED =
  process.env.NEXT_PUBLIC_POS_PERF === "1" ||
  (process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("pos-profiler"))

export function PosRenderProfiler({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  if (!PROFILER_ENABLED) return <>{children}</>

  return (
    <React.Profiler
      id={id}
      onRender={(
        profileId,
        phase,
        actualDuration,
        baseDuration,
        _startTime,
        commitTime
      ) => {
        console.info(
          "[pos-profiler]",
          JSON.stringify({
            id: profileId,
            phase,
            actualDuration: Math.round(actualDuration * 100) / 100,
            baseDuration: Math.round(baseDuration * 100) / 100,
            commitTime,
          })
        )
      }}
    >
      {children}
    </React.Profiler>
  )
}
