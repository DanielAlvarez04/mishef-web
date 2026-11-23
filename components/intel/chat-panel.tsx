"use client"

import * as React from "react"
import { Loader2Icon, SendIcon, SparklesIcon, SquareIcon } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Textarea } from "@/components/ui/textarea"
import type { IntelModelInfo } from "@/lib/intel"
import { cn } from "cn"
import { ToolResultCard } from "@/components/intel/tool-result"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

/**
 * Panel del copiloto.
 *
 * Consume el proxy `/api/intel/chat`, que reenvía el SSE de la API. El
 * `MessageScroller` se encarga de seguir el stream sin robarle la posición al
 * lector; `Message` y `Bubble` son los primitives de AI Elements.
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
  const [toolActivity, setToolActivity] = React.useState<string | null>(null)
  const [toolResult, setToolResult] = React.useState<{
    name: string
    data: unknown
  } | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)

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
    setToolActivity(null)
    setToolResult(null)
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
          } else if (event === "tool") {
            const status = parsed.status
            const name = parsed.name

            if (status === "running" && typeof name === "string") {
              setToolActivity(`Consultando ${toolLabel(name)}…`)
            } else if (status === "done") {
              setToolActivity(
                typeof parsed.summary === "string" ? parsed.summary : null
              )

              if (parsed.data !== undefined) {
                setToolResult({
                  name: typeof name === "string" ? name : "tool",
                  data: parsed.data,
                })
              }
            } else if (status === "error") {
              setToolActivity(
                typeof parsed.error === "string"
                  ? parsed.error
                  : "La herramienta falló"
              )
            }
          } else if (event === "delta" && typeof parsed.text === "string") {
            setToolActivity(null)
            updateAssistant(assistantId, parsed.text)
          } else if (event === "fallback" && typeof parsed.to === "string") {
            setNotice(`El modelo principal falló; usando ${parsed.to}.`)
          } else if (event === "error" && typeof parsed.message === "string") {
            setToolActivity(null)
            setError(parsed.message)
          } else if (event === "done") {
            if (typeof parsed.conversationId === "string") {
              setConversationId(parsed.conversationId)
            }
            setToolActivity(null)
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
      setToolActivity(null)
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
    setToolActivity(null)
    setToolResult(null)
  }

  return (
    <Card className="flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col">
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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
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

        <div className="min-h-0 flex-1">
          <MessageScrollerProvider
            autoScroll
            defaultScrollPosition="last-anchor"
            scrollPreviousItemPeek={64}
          >
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.length === 0 ? (
                    <MessageScrollerItem
                      messageId="empty"
                      className="flex min-h-64 items-center justify-center"
                    >
                      <div className="flex max-w-sm flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                        <SparklesIcon className="size-8 opacity-40" />
                        <p>
                          Pregunta algo como “¿qué platillos me dejan menos
                          margen este mes?” o “¿qué insumos están por
                          agotarse?”.
                        </p>
                      </div>
                    </MessageScrollerItem>
                  ) : (
                    messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                      >
                        <Message
                          align={message.role === "user" ? "end" : "start"}
                        >
                          <MessageContent>
                            <Bubble
                              variant={
                                message.role === "user" ? "default" : "muted"
                              }
                              align={
                                message.role === "user" ? "end" : "start"
                              }
                            >
                              <BubbleContent className="whitespace-pre-wrap">
                                {message.content || (
                                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                                    <Loader2Icon className="size-3 animate-spin" />
                                    Pensando…
                                  </span>
                                )}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))
                  )}

                  {toolResult ? (
                    <MessageScrollerItem messageId="tool-result">
                      <ToolResultCard
                        name={toolResult.name}
                        data={toolResult.data}
                      />
                    </MessageScrollerItem>
                  ) : null}

                  {toolActivity ? (
                    <MessageScrollerItem messageId="tool-activity">
                      <Message align="start">
                        <MessageContent>
                          <Bubble variant="outline" align="start">
                            <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                              <Loader2Icon className="size-3 animate-spin" />
                              {toolActivity}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
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
              <SquareIcon data-icon="inline-start" />
              Detener
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || !configured || !enabled}
            >
              <SendIcon data-icon="inline-start" />
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

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    ventasResumen: "ventas",
    topPlatillos: "platillos más vendidos",
    metodosDePago: "métodos de pago",
    margenPorPlatillo: "márgenes",
    stockBajo: "inventario bajo",
  }

  return labels[name] ?? name
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
