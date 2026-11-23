"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellIcon, CheckCheckIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  markAllIntelNotificationsRead,
  markIntelNotificationRead,
  runIntelDigest,
} from "@/app/(app)/intel/actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { IntelNotification } from "@/lib/intel"
import { cn } from "cn"

export function NotificationList({
  notifications,
}: {
  notifications: IntelNotification[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const unread = notifications.filter((item) => !item.readAt).length

  const generate = () => {
    startTransition(async () => {
      const result = await runIntelDigest()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo generar el digest")
        return
      }

      toast.success("Digest generado")
      router.refresh()
    })
  }

  const markAll = () => {
    startTransition(async () => {
      const result = await markAllIntelNotificationsRead()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron marcar como leídas")
        return
      }

      toast.success("Notificaciones marcadas como leídas")
      router.refresh()
    })
  }

  const markRead = (id: string) => {
    startTransition(async () => {
      const result = await markIntelNotificationRead(id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo marcar como leída")
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BellIcon className="size-4" />
          {unread > 0 ? `${unread} sin leer` : "Todo leído"}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={pending}
          >
            {pending ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            Generar digest ahora
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={pending || unread === 0}
          >
            <CheckCheckIcon data-icon="inline-start" />
            Marcar todas
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <BellIcon className="size-8 opacity-40" />
            <p>
              No hay notificaciones todavía. El digest diario aparecerá aquí y
              también llegará por correo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((item) => (
            <Card
              key={item.id}
              className={cn(!item.readAt && "border-primary/30")}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  {item.title}
                  {!item.readAt ? (
                    <Badge variant="secondary">Nueva</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  {formatDate(item.createdAt)} · {item.kind}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.body}
                </p>

                {item.data?.links?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {item.data.links.map((link) => (
                      <Link
                        key={`${item.id}-${link.url}`}
                        href={link.url}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {!item.readAt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => markRead(item.id)}
                    disabled={pending}
                  >
                    Marcar como leída
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
