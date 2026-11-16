"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ClockIcon, LogInIcon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { clockIn, clockOut } from "@/app/(app)/attendance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { shiftDuration, type ShiftRow } from "@/lib/attendance"

/** Checador personal: marcar entrada, salida y ver el tiempo del turno. */
export function ClockCard({ current }: { current: ShiftRow | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState("")

  function markIn() {
    startTransition(async () => {
      const result = await clockIn(note)

      if (result.ok) {
        toast.success("Entrada registrada")
        setNote("")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos registrar la entrada")
      }
    })
  }

  function markOut() {
    startTransition(async () => {
      const result = await clockOut()

      if (result.ok) {
        toast.success("Salida registrada")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos registrar la salida")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="size-4" /> Mi turno
        </CardTitle>
        <CardDescription>
          Marca tu entrada al llegar y tu salida al terminar. Las horas se usan
          para el reparto de propinas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {current ? (
          <>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                Turno abierto desde{" "}
                {new Date(current.startedAt).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-muted-foreground">
                Llevas {shiftDuration(current.startedAt, null)}.
              </p>
            </div>
            <Button onClick={markOut} disabled={pending} variant="destructive">
              <LogOutIcon data-icon="inline-start" />
              {pending ? "Registrando..." : "Marcar salida"}
            </Button>
          </>
        ) : (
          <>
            <Input
              placeholder="Nota (opcional): turno tarde, cubrí a Ana..."
              value={note}
              maxLength={200}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button onClick={markIn} disabled={pending}>
              <LogInIcon data-icon="inline-start" />
              {pending ? "Registrando..." : "Marcar entrada"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
