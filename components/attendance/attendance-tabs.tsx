"use client"

import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePersistentTab } from "@/hooks/use-persistent-tab"

const TABS = ["personal", "assignment"] as const

export function AttendanceTabs({
  personal,
  assignment,
}: {
  personal: ReactNode
  assignment: ReactNode | null
}) {
  const [tab, setTab] = usePersistentTab(
    "attendance-tab",
    TABS,
    "personal",
  )

  if (!assignment) return <>{personal}</>

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList aria-label="Secciones de asistencia">
        <TabsTrigger value="personal">Mi asistencia</TabsTrigger>
        <TabsTrigger value="assignment">Asignación</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" keepMounted className="flex flex-col gap-4">
        {personal}
      </TabsContent>
      <TabsContent value="assignment" className="flex flex-col gap-4">
        {assignment}
      </TabsContent>
    </Tabs>
  )
}
