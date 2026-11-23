"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  CatalogAiField,
  CatalogProposal,
} from "@/lib/forecast"

export async function getCatalogProposals(): Promise<
  ActionResult<CatalogProposal[]>
> {
  return readApi("/intel/catalog/proposals")
}

export interface GenerateProposalsResult {
  proposals: CatalogProposal[]
  errors: Array<{ itemId: string; message: string }>
}

export async function generateCatalogProposals(
  itemIds: string[],
  fields: CatalogAiField[]
): Promise<ActionResult<GenerateProposalsResult>> {
  return mutateApi("/intel/catalog/proposals", "POST", { itemIds, fields }, [])
}

export async function applyCatalogProposal(
  proposalId: string,
  fields: CatalogAiField[]
): Promise<ActionResult<{ itemId: string; applied: string[] }>> {
  return mutateApi(
    `/intel/catalog/proposals/${proposalId}/apply`,
    "POST",
    { fields },
    ["/catalog", "/catalog/ai"]
  )
}

export async function dismissCatalogProposal(
  proposalId: string
): Promise<ActionResult<unknown>> {
  return mutateApi(
    `/intel/catalog/proposals/${proposalId}/dismiss`,
    "POST",
    {},
    ["/catalog/ai"]
  )
}
