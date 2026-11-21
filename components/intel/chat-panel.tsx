"use client"

import * as React from "react"
import { Loader2Icon, SendIcon, SparklesIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { IntelModelInfo } from "@/lib/intel"
import { cn } from "cn"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

/**
 * Panel del copiloto.
 *
 * Consume el proxy `/api/intel/chat`, que a su vez reenvía el SSE de la API.
 * No usa WebSockets ni guarda estado en el navegador: el historial vive en la
 * base de datos y se identifica con `conversationId`.
 */
export function IntelChatPanel({
  configured,
  enabled,
  models,
}: {
  configured: boolean
  enabled: boolean
  models: IntelModelInfo[]
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [conversationId, setConversationId] = React.useState<string | null>(
    null
  )
  const [streaming, setStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  const updateAssistant = (id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, content: message.content + text }
          : message
      )
    )
  }

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return

    if (!configured) {
      setError("Intel no está configurado en el servidor.")
      return
    }

    if (!enabled) {
      setError("Intel no está activado para este negocio.")
      return
    }

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ])
    setInput("")
    setError(null)
    setNotice(null)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/intel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          locale: "es-MX",
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        throw new Error(data?.message ?? "No se pudo iniciar el chat")
      }

      if (!response.body) {
        throw new Error("La API no devolvió un stream")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          let event = "message"
          let data = ""

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim()
            if (line.startsWith("data:")) data += line.slice(5).trim()
          }

          if (!data) continue

          let parsed: Record<string, unknown>

          try {
            parsed = JSON.parse(data) as Record<string, unknown>
          } catch {
            continue
          }

          if (event === "start" && typeof parsed.conversationId === "string") {
            setConversationId(parsed.conversationId)
          } else if (event === "delta" && typeof parsed.text === "string") {
            updateAssistant(assistantId, parsed.text)
          } else if (event === "fallback" && typeof parsed.to === "string") {
            setNotice(`El modelo principal falló; usando ${parsed.to}.`)
          } else if (event === "error" && typeof parsed.message === "string") {
            setError(parsed.message)
          } else if (event === "done") {
            if (typeof parsed.conversationId === "string") {
              setConversationId(parsed.conversationId)
            }
            setNotice(null)
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setNotice("Respuesta detenida.")
      } else {
        setError(
          err instanceof Error ? err.message : "Error de conexión con Intel"
        )
      }
    } finally {
      setMessages((prev) =>
        prev.filter(
          (message) =>
            !(message.id === assistantId && message.content.length === 0)
        )
      )
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const reset = () => {
    if (streaming) return
    setMessages([])
    setConversationId(null)
    setError(null)
    setNotice(null)
  }

  return (
    <Card className="flex min-h-[65vh] flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-muted-foreground" />
          Copiloto
        </CardTitle>
        <CardDescription>
          {models.length > 0
            ? `Modelos: ${models.map((item) => item.model).join(" → ")}`
            : "Pregunta por ventas, márgenes, inventario o compras."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {!configured ? (
          <Banner tone="warning">
            Falta configurar el proveedor de IA en el servidor. Agrega
            `NVIDIA_API_KEY` o `INTEL_API_KEY` en el `.env` de la API y
            reinicia.
          </Banner>
        ) : !enabled ? (
          <Banner tone="warning">
            Intel está desactivado para este negocio. Un administrador puede
            activarlo en Configuración → Negocio.
          </Banner>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <SparklesIcon className="size-8 opacity-40" />
              <p className="max-w-sm">
                Pregunta algo como “¿qué platillos me dejan menos margen este
                mes?” o “¿qué insumos están por agotarse?”.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-3 animate-spin" />
                      Pensando…
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {notice ? (
          <p className="text-xs text-muted-foreground">{notice}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            placeholder="Escribe tu pregunta…"
            rows={2}
            disabled={streaming || !configured || !enabled}
            className="min-h-11 resize-none"
          />
          {streaming ? (
            <Button type="button" variant="outline" onClick={stop}>
              <SquareIcon className="size-4" />
              Detener
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || !configured || !enabled}
            >
              <SendIcon className="size-4" />
              Enviar
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {conversationId
              ? `Conversación ${conversationId.slice(0, 8)}…`
              : "Conversación nueva"}
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={streaming || messages.length === 0}
            className="underline-offset-4 hover:underline disabled:opacity-50"
          >
            Nueva conversación
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: "warning" | "error"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "warning"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      {children}
    </div>
  )
}
