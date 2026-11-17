import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { TipDistribution } from "@/lib/attendance"

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

/** Reparto de propinas por horas efectivas y factor del rol. */
export function TipsTable({
  distribution,
  rangeLabel,
}: {
  distribution: TipDistribution
  rangeLabel: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pozo de propinas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {money(distribution.pool)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Peso total</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(distribution.totalWeight ?? 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Participantes</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {distribution.participants.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reparto de propinas</CardTitle>
          <CardDescription>
            {rangeLabel} · peso = horas efectivas × factor del rol (mesero y
            cajero 1, cocina e inventario 0.6, admin 0).
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
                {distribution.participants.map((row) => (
                  <tr key={row.userId} className="border-t">
                    <td className="px-4 py-2 font-medium">
                      {row.name ?? row.userId}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{row.role}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.hours.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.weight.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {money(row.share)}
                    </td>
                  </tr>
                ))}
                {distribution.participants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin propinas ni horas registradas en el periodo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
