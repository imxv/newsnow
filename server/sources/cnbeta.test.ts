import { describe, expect, it } from "vitest"
import { parseCnbetaRss } from "#/sources/cnbeta"

describe("parseCnbetaRss", () => {
  it("解析多条 item，guid 作为 id", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>第一条标题</title>
      <link>https://www.cnbeta.com.tw/articles/1</link>
      <guid>guid-1</guid>
      <pubDate>Mon, 18 May 2026 08:00:00 +0000</pubDate>
    </item>
    <item>
      <title>第二条标题</title>
      <link>https://www.cnbeta.com.tw/articles/2</link>
      <guid>guid-2</guid>
      <pubDate>Mon, 18 May 2026 09:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`
    const items = parseCnbetaRss(xml)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      id: "guid-1",
      title: "第一条标题",
      url: "https://www.cnbeta.com.tw/articles/1",
      pubDate: Date.parse("Mon, 18 May 2026 08:00:00 +0000"),
    })
    expect(items[1].id).toBe("guid-2")
  })

  it("缺少 guid 时回退到 link 作为 id", () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>无 guid</title>
    <link>https://www.cnbeta.com.tw/articles/3</link>
  </item>
</channel></rss>`
    const items = parseCnbetaRss(xml)
    expect(items[0].id).toBe("https://www.cnbeta.com.tw/articles/3")
  })

  it("缺少 pubDate 时返回 undefined", () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>无 pubDate</title>
    <link>https://www.cnbeta.com.tw/articles/4</link>
    <guid>guid-4</guid>
  </item>
</channel></rss>`
    const items = parseCnbetaRss(xml)
    expect(items[0].pubDate).toBeUndefined()
  })

  it("channel 不存在时返回空数组", () => {
    const xml = `<?xml version="1.0"?><rss></rss>`
    expect(parseCnbetaRss(xml)).toEqual([])
  })

  it("channel 存在但没有 item 时返回空数组", () => {
    const xml = `<?xml version="1.0"?><rss><channel></channel></rss>`
    expect(parseCnbetaRss(xml)).toEqual([])
  })
})
