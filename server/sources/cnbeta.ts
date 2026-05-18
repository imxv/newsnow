import https from "node:https"
import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"

function fetchInsecure(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      rejectUnauthorized: false,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" },
    }, (res) => {
      let data = ""
      res.on("data", (chunk) => {
        data += chunk
      })
      res.on("end", () => resolve(data))
    }).on("error", reject)
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
    const xml = await fetchInsecure("https://rss.cnbeta.com.tw/")
    return parseCnbetaRss(xml)
  },
})
