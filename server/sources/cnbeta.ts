import process from "node:process"
import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"

async function fetchRss(url: string): Promise<string> {
  if (process.env.CF_PAGES) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  }
  // rss.cnbeta.com.tw 不发送完整证书链，Node 原生 fetch/ofetch 会因为 "unable to verify the first certificate" 失败
  const { default: https } = await import("node:https")
  return new Promise<string>((resolve, reject) => {
    const req = https.get(url, {
      rejectUnauthorized: false,
      headers: { "User-Agent": UA },
    }, (res) => {
      let data = ""
      res.on("data", (chunk) => {
        data += chunk
      })
      res.on("end", () => resolve(data))
    })
    req.setTimeout(10000, () => req.destroy(new Error("Request timeout")))
    req.on("error", reject)
  })
}

export function parseCnbetaRss(xml: string): NewsItem[] {
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const raw = result?.rss?.channel?.item ?? []
  const items: any[] = Array.isArray(raw) ? raw : [raw]
  return items.map((item): NewsItem => ({
    id: item.guid ?? item.link,
    title: item.title,
    url: item.link,
    pubDate: item.pubDate ? new Date(item.pubDate).valueOf() : undefined,
  }))
}

export default defineSource({
  cnbeta: async () => {
    const xml = await fetchRss("https://rss.cnbeta.com.tw/")
    return parseCnbetaRss(xml)
  },
})
