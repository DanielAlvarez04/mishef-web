"use client"

import type { ReactNode } from "react"
import {
  BanknoteIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePersistentTab } from "@/hooks/use-persistent-tab"

const TABS = ["schedule", "records", "tips"] as const

/** Secciones internas de la pestaña Asignación. */
export function AssignmentTabs({
  schedule,
  records,
  tips,
}: {
  schedule: ReactNode
  records: ReactNode
  tips: ReactNode
}) {
  const [tab, setTab] = usePersistentTab(
    "attendance-assignment-tab",
    TABS,
    "schedule",
  )

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList aria-label="Secciones de asignación">
        <TabsTrigger value="schedule">
          <CalendarDaysIcon />
          Horarios
        </TabsTrigger>
        <TabsTrigger value="records">
          <ClipboardListIcon />
          Registros
        </TabsTrigger>
        <TabsTrigger value="tips">
          <BanknoteIcon />
          Propinas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="schedule" keepMounted className="flex flex-col gap-4">
        {schedule}
      </TabsContent>
      <TabsContent value="records" className="flex flex-col gap-4">
        {records}
      </TabsContent>
      <TabsContent value="tips" className="flex flex-col gap-4">
        {tips}
      </TabsContent>
    </Tabs>
  )
}
