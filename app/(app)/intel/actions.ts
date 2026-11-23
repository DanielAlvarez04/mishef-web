"use server"

import { mutateApi } from "@/lib/server-api"

export async function markIntelNotificationRead(id: string) {
  return mutateApi(
    `/intel/notifications/${id}/read`,
    "PATCH",
    undefined,
    ["/intel", "/intel/notifications"]
  )
}

export async function markAllIntelNotificationsRead() {
  return mutateApi(
    "/intel/notifications/read-all",
    "POST",
    undefined,
    ["/intel", "/intel/notifications"]
  )
}

export async function runIntelDigest() {
  return mutateApi(
    "/intel/digest",
    "POST",
    undefined,
    ["/intel", "/intel/notifications"]
  )
}
