import { QueryClient } from "@tanstack/react-query"
import type { SourceID, SourceResponse } from "@shared/types"
import { describe, expect, it, vi } from "vitest"
import { refreshSourceQueries, sourceQueryKey } from "@shared/source-refresh"

const sourceIds = ["v2ex", "zhihu", "weibo", "zaobao", "siliconvalley", "coolapk"] satisfies SourceID[]

function responseFor(id: SourceID): SourceResponse {
  return {
    status: "success",
    id,
    updatedTime: Date.now(),
    items: [{ id: `${id}-item`, title: id, url: `https://example.com/${id}` }],
  }
}

describe("refreshSourceQueries", () => {
  it("force-fetches and caches every source even when most queries do not exist yet", async () => {
    const queryClient = new QueryClient()
    sourceIds.slice(0, 2).forEach((id) => {
      queryClient.setQueryData(sourceQueryKey(id), responseFor(id))
    })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2)

    const fetcher = vi.fn(async (id: SourceID, options = {}) => {
      expect(options.force).toBe(true)
      return responseFor(id)
    })

    const result = await refreshSourceQueries(queryClient, sourceIds, { fetcher })

    expect(result).toEqual({ succeeded: sourceIds, failed: [] })
    expect(fetcher).toHaveBeenCalledTimes(sourceIds.length)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(sourceIds.length)
    sourceIds.forEach((id) => {
      expect(queryClient.getQueryData<SourceResponse>(sourceQueryKey(id))?.id).toBe(id)
    })
  })

  it("limits concurrency and keeps refreshing after one source fails", async () => {
    const queryClient = new QueryClient()
    let active = 0
    let maxActive = 0
    const fetcher = vi.fn(async (id: SourceID) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      try {
        await new Promise(resolve => setTimeout(resolve, 5))
        if (id === "weibo") throw new Error("upstream failed")
        return responseFor(id)
      } finally {
        active -= 1
      }
    })

    const result = await refreshSourceQueries(queryClient, sourceIds, {
      concurrency: 2,
      fetcher,
    })

    expect(maxActive).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(sourceIds.length)
    expect(result.succeeded).toEqual(sourceIds.filter(id => id !== "weibo"))
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]).toMatchObject({ id: "weibo" })
    expect(result.failed[0].error).toEqual(new Error("upstream failed"))
  })

  it("deduplicates source ids before refreshing", async () => {
    const queryClient = new QueryClient()
    const fetcher = vi.fn(async (id: SourceID) => responseFor(id))

    await refreshSourceQueries(queryClient, ["zhihu", "zhihu", "weibo"], { fetcher })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
