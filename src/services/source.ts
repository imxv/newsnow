import type { SourceID, SourceResponse } from "@shared/types"
import sources from "@shared/sources"
import { delay } from "@shared/utils"
import type { LoadSourceOptions } from "@shared/source-refresh"
import { cacheSources } from "../utils/data"
import { myFetch, safeParseString } from "../utils"

export async function loadSource(id: SourceID, options: LoadSourceOptions = {}) {
  const { force = false, signal } = options
  const previous = cacheSources.get(id)

  if (!force && previous) {
    // Keep the existing transition when data comes from the in-memory cache.
    await delay(200)
    return previous
  }

  const headers: Record<string, string> = {}
  let url = `/s?id=${id}`
  if (force) {
    url += "&latest"
    const jwt = typeof localStorage === "undefined"
      ? ""
      : safeParseString(localStorage.getItem("jwt"))
    if (jwt) headers.Authorization = `Bearer ${jwt}`
  }

  const response = await myFetch<SourceResponse>(url, {
    headers,
    signal,
  })

  try {
    if (response.items && sources[id].type === "hottest" && previous) {
      response.items.forEach((item, index) => {
        const previousIndex = previous.items.findIndex(previousItem => previousItem.id === item.id)
        item.extra = {
          ...item.extra,
          diff: previousIndex === -1 ? undefined : previousIndex - index,
        }
      })
    }
  } catch (error) {
    console.error(error)
  }

  cacheSources.set(id, response)
  return response
}
