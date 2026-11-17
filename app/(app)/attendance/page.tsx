import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClockCard } from "@/components/attendance/clock-card"
import { ShiftEditDialog } from "@/components/attendance/shift-edit-dialog"
import { apiFetch } from "@/lib/api"
import {
  shiftDuration,
  type ShiftList,
  type ShiftRow,
  type TipDistribution,
} from "@/lib/attendance"
import { canReadMoney } from "@/lib/orders"
import { isAdmin, requireUser } from "@/lib/session"

/**
 * Lee JSON solo si hay cuerpo.
 *
 * `GET /attendance/current` responde 200 con cuerpo vacío cuando no hay turno
 * abierto (Nest serializa `null` así). Llamar `.json()` directamente rompe la
 * página con "Unexpected end of JSON input".
 */
async function readJsonOrNull<T>(
  response: Response | null
): Promise<T | null> {
  if (!response || !response.ok || response.status === 204) return null

  const text = await response.text()
  if (!text.trim()) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default async function AttendancePage() {
  const user = await requireUser()

  // Server component: el rango depende del reloj del servidor, no del render
  // del cliente. La regla de pureza no distingue server de client.
  // eslint-disable-next-line react-hooks/purity
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)

  const admin = canReadMoney(user.roles)
  const canManage = isAdmin(user)

  const [currentResponse, listResponse, tipsResponse] = await Promise.all([
    apiFetch("/attendance/current"),
    admin ? apiFetch(`/attendance?from=${from}&to=${to}`) : null,
    admin
      ? apiFetch(
          `/attendance/tips?from=${monthStart.toISOString().slice(0, 10)}&to=${to}`
        )
      : null,
  ])

  const current = await readJsonOrNull<ShiftRow>(currentResponse)
  const list = await readJsonOrNull<ShiftList>(listResponse)
  const tips = await readJsonOrNull<TipDistribution>(tipsResponse)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Checador del equipo y reparto de propinas por horas trabajadas.
        </p>
      </div>

      <ClockCard current={current} />

      {admin && list ? (
        <Card>
          <CardHeader>
            <CardTitle>Últimos 7 días</CardTitle>
            <CardDescription>
              {list.shifts.length} turno(s) · {list.hours.toFixed(1)} h en total
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Persona</th>
                    <th className="px-4 py-2 font-medium">Entrada</th>
                    <th className="px-4 py-2 font-medium">Salida</th>
                    <th className="px-4 py-2 font-medium">Duración</th>
                    <th className="px-4 py-2 font-medium">Nota</th>
                    {canManage ? (
                      <th className="px-4 py-2 font-medium">Acciones</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {list.shifts.map((shift) => (
                    <tr key={shift.id} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {shift.user?.name ?? shift.user?.username ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(shift.startedAt).toLocaleString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2">
                        {shift.endedAt
                          ? new Date(shift.endedAt).toLocaleString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {shift.endedAt ? (
                          shiftDuration(shift.startedAt, shift.endedAt)
                        ) : (
                          <Badge variant="outline">en curso</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {shift.note ?? "—"}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-2 text-right">
                          <ShiftEditDialog shift={shift} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {list.shifts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 6 : 5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nadie ha checado en los últimos 7 días.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {admin && tips ? (
        <Card>
          <CardHeader>
            <CardTitle>Reparto de propinas del mes</CardTitle>
            <CardDescription>
              Pozo de ${tips.pool.toFixed(2)} · peso = horas × factor del rol
              (mesero/cajero 1, cocina/inventario 0.6, admin 0).
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Persona</th>
                    <th className="px-4 py-2 font-medium">Rol</th>
                    <th className="px-4 py-2 text-right font-medium">Horas</th>
                    <th className="px-4 py-2 text-right font-medium">Peso</th>
                    <th className="px-4 py-2 text-right font-medium">Le toca</th>
                  </tr>
                </thead>
                <tbody>
                  {tips.participants.map((row) => (
                    <tr key={row.userId} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {row.name ?? row.userId}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.role}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.hours.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.weight.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        ${row.share.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {tips.participants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Sin propinas ni turnos en el mes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
