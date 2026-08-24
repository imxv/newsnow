import process from "node:process"
import type { AllSourceID } from "@shared/types"
import defu from "defu"
import type { RSSHubOption, RSSHubInfo as RSSHubResponse, SourceGetter, SourceOption } from "#/types"

type R = Partial<Record<AllSourceID, SourceGetter>>
export function defineSource(source: SourceGetter): SourceGetter
export function defineSource(source: R): R
export function defineSource(source: SourceGetter | R): SourceGetter | R {
  return source
}

export function defineRSSSource(url: string, option?: SourceOption): SourceGetter {
  return async () => {
    const data = await rss2json(url)
    if (!data?.items.length) throw new Error("Cannot fetch rss data")
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      id: item.link,
      pubDate: !option?.hiddenDate ? item.created : undefined,
    }))
  }
}

export function defineRSSHubSource(route: string, RSSHubOptions?: RSSHubOption, sourceOption?: SourceOption): SourceGetter {
  return async () => {
    const options = defu<RSSHubOption, RSSHubOption[]>(RSSHubOptions, {
      sorted: true,
    })
    let lastError: unknown
    for (const baseURL of ["https://rsshub.rssforever.com", "https://rsshub.liumingye.cn"]) {
      try {
        const url = new URL(route, baseURL)
        url.searchParams.set("format", "json")
        Object.entries(options).forEach(([key, value]) => {
          url.searchParams.set(key, value.toString())
        })
        const data: RSSHubResponse = await myFetch(url)
        if (!data.items?.length) throw new Error(`RSSHub ${baseURL} returned no items`)
        return data.items.map(item => ({
          title: item.title,
          url: item.url,
          id: item.id ?? item.url,
          pubDate: !sourceOption?.hiddenDate ? item.date_published : undefined,
        }))
      } catch (error) {
        lastError = error
      }
    }
    throw lastError ?? new Error("Cannot fetch RSSHub data")
  }
}

export function proxySource(proxyUrl: string, source: SourceGetter) {
  return process.env.CF_PAGES
    ? defineSource(async () => {
        const data = await myFetch(proxyUrl)
        return data.items
      })
    : source
}
