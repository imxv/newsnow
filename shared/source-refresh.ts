import type { QueryClient } from "@tanstack/react-query"
import type { SourceID, SourceResponse } from "./types"

export const sourceQueryKey = (id: SourceID) => ["source", id] as const

export interface LoadSourceOptions {
  force?: boolean
  signal?: AbortSignal
}

export type SourceFetcher = (id: SourceID, options?: LoadSourceOptions) => Promise<SourceResponse>

export interface RefreshSourcesOptions {
  concurrency?: number
  fetcher: SourceFetcher
}

export interface RefreshSourcesResult {
  succeeded: SourceID[]
  failed: Array<{
    id: SourceID
    error: unknown
  }>
}

export async function refreshSourceQueries(
  queryClient: QueryClient,
  sourceIds: SourceID[],
  options: RefreshSourcesOptions,
): Promise<RefreshSourcesResult> {
  const ids = [...new Set(sourceIds)]
  if (ids.length === 0) return { succeeded: [], failed: [] }

  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4))
  const outcomes: Array<
    { status: "fulfilled", id: SourceID } |
    { status: "rejected", id: SourceID, error: unknown }
  > = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < ids.length) {
      const index = nextIndex++
      const id = ids[index]
      const queryKey = sourceQueryKey(id)

      try {
        // An initial non-forced request must not hide a later explicit refresh.
        await queryClient.cancelQueries({ queryKey, exact: true })
        await queryClient.fetchQuery({
          queryKey,
          queryFn: ({ signal }) => options.fetcher(id, { force: true, signal }),
          staleTime: 0,
          retry: false,
        })
        outcomes[index] = { status: "fulfilled", id }
      } catch (error) {
        outcomes[index] = { status: "rejected", id, error }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()),
  )

  const succeeded: SourceID[] = []
  const failed: RefreshSourcesResult["failed"] = []
  outcomes.forEach((outcome) => {
    if (outcome.status === "fulfilled") succeeded.push(outcome.id)
    else failed.push({ id: outcome.id, error: outcome.error })
  })

  return { succeeded, failed }
}
