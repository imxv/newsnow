import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"

// rss.cnbeta.com.tw 不发送完整证书链，HTTPS 抓取在 Node 会触发 "unable to verify the first certificate"，
// 在 Cloudflare 会触发 HTTP 526，且 CF 的 fetch 无法跳过校验。其 HTTP 端点不会跳转，且 RSS 为公开内容，所以走 HTTP。
const RSS_URL = "http://rss.cnbeta.com.tw/"

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
    const xml = await myFetch(RSS_URL, { responseType: "text" }) as string
    return parseCnbetaRss(xml)
  },
})
