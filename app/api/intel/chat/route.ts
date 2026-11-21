import { NextResponse } from "next/server"

import { apiFetch } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * Proxy SSE hacia la API.
 *
 * El navegador no llama a `api.mishef.co` directamente: esta ruta reenvía las
 * cookies de sesión y el tenant, y devuelve el stream tal cual. Así el chat
 * funciona igual en local y en los subdominios de cada negocio.
 */
export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { message: "El cuerpo de la petición no es JSON válido" },
      { status: 400 }
    )
  }

  const response = await apiFetch("/intel/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    let message = "No se pudo iniciar el chat"

    try {
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      // La API pudo devolver texto plano.
    }

    return NextResponse.json({ message }, { status: response.status })
  }

  if (!response.body) {
    return NextResponse.json(
      { message: "La API no devolvió un stream" },
      { status: 502 }
    )
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
