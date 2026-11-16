"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatMoney } from "@/lib/catalog"
import { useCurrency } from "@/lib/currency"

const chartConfig = {
  sales: {
    label: "Ventas",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

/** Eje compacto para que los importes no ocupen media gráfica. */
function createAxisMoneyFormatter(currency: string): Intl.NumberFormat {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  })
}

export function SalesChart({
  data,
}: {
  data: { date: string; sales: number | null }[]
}) {
  const currency = useCurrency()
  const axisMoneyFormatter = useMemo(
    () => createAxisMoneyFormatter(currency),
    [currency]
  )
  const money = useMemo(
    () => (value: string | number) => formatMoney(value, currency),
    [currency]
  )
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ventas de los últimos días</CardTitle>
        <CardDescription>
          Importes cobrados y confirmados por día.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 12 }}
          >
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sales)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sales)"
                  stopOpacity={0.15}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value: string) => {
                const [, month, day] = value.split("-")
                return `${day}/${month}`
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value: number) =>
                axisMoneyFormatter.format(value)
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => {
                    const [year, month, day] = String(value).split("-")
                    return `${day}/${month}/${year}`
                  }}
                  formatter={(value) => money(Number(value))}
                />
              }
            />
            <Area
              dataKey="sales"
              type="linear"
              fill="url(#fillSales)"
              stroke="var(--color-sales)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
