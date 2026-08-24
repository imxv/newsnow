import { beforeEach, describe, expect, it, vi } from "vitest"
import kr36Sources from "#/sources/_36kr"
import clsSources from "#/sources/cls"
import sputnikSource from "#/sources/sputniknewscn"

const { myFetchMock } = vi.hoisted(() => ({
  myFetchMock: vi.fn(),
}))

vi.mock("#/utils/fetch", () => ({
  myFetch: myFetchMock,
}))

describe("repaired news sources", () => {
  beforeEach(() => {
    myFetchMock.mockReset()
  })

  it("fetches 36kr quick news from the shared RSS service", async () => {
    myFetchMock.mockResolvedValue({
      items: [{
        id: "https://www.36kr.com/newsflashes/123",
        url: "https://www.36kr.com/newsflashes/123",
        title: "36kr title",
        date_published: "2026-08-24T02:00:00.000Z",
      }],
    })

    const result = await kr36Sources["36kr-quick"]!()

    expect(result).toEqual([{
      id: "https://www.36kr.com/newsflashes/123",
      title: "36kr title",
      url: "https://www.36kr.com/newsflashes/123",
      pubDate: "2026-08-24T02:00:00.000Z",
    }])
    expect(myFetchMock).toHaveBeenCalledOnce()
    expect(String(myFetchMock.mock.calls[0][0])).toBe(
      "https://rsshub.rssforever.com/36kr/newsflashes?format=json&sorted=true",
    )
  })

  it("retries the shared RSS service after a transient failure", async () => {
    myFetchMock
      .mockRejectedValueOnce(new Error("network lost"))
      .mockResolvedValueOnce({
        items: [{
          id: "https://www.36kr.com/newsflashes/456",
          url: "https://www.36kr.com/newsflashes/456",
          title: "36kr retry",
          date_published: "2026-08-24T02:10:00.000Z",
        }],
      })

    const result = await kr36Sources["36kr-quick"]!()

    expect(result[0]?.title).toBe("36kr retry")
    expect(myFetchMock).toHaveBeenCalledTimes(2)
  })

  it("falls back to the official 36kr feed when both shared RSS attempts fail", async () => {
    myFetchMock
      .mockRejectedValueOnce(new Error("network lost"))
      .mockRejectedValueOnce(new Error("network still lost"))
      .mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>36氪</title><item>
          <title>36kr fallback</title>
          <link>https://36kr.com/newsflashes/456?f=rss</link>
          <pubDate>2026-08-24 10:00:00 +0800</pubDate>
        </item></channel></rss>`)

    const result = await kr36Sources["36kr-quick"]!()

    expect(result[0]).toMatchObject({
      id: "https://36kr.com/newsflashes/456?f=rss",
      title: "36kr fallback",
      url: "https://36kr.com/newsflashes/456?f=rss",
      pubDate: "2026-08-24 10:00:00 +0800",
    })
    expect(myFetchMock).toHaveBeenNthCalledWith(3, "https://www.36kr.com/feed-newsflash")
  })

  it("falls back to the official 36kr feed when the shared RSS service is empty", async () => {
    myFetchMock
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>36氪</title><item>
          <title>36kr fallback</title>
          <link>https://36kr.com/newsflashes/789?f=rss</link>
          <pubDate>2026-08-24 10:10:00 +0800</pubDate>
        </item></channel></rss>`)

    const result = await kr36Sources["36kr-quick"]!()

    expect(result[0]?.url).toBe("https://36kr.com/newsflashes/789?f=rss")
    expect(myFetchMock).toHaveBeenCalledTimes(3)
  })

  it("fetches CLS telegraph data from the current cache endpoint", async () => {
    myFetchMock.mockResolvedValue({
      data: {
        roll_data: [{
          id: 456,
          title: "CLS title",
          brief: "CLS brief",
          ctime: 1787508000,
          is_ad: 0,
        }],
      },
    })

    const result = await clsSources["cls-telegraph"]!()

    expect(result[0]).toMatchObject({
      id: 456,
      title: "CLS title",
      pubDate: 1787508000000,
      url: "https://www.cls.cn/detail/456",
    })
    expect(myFetchMock).toHaveBeenCalledWith(
      "https://www.cls.cn/api/cache",
      { query: { name: "telegraph" } },
    )
  })

  it("fetches Sputnik directly instead of using the removed proxy", async () => {
    myFetchMock.mockResolvedValue(`<div class="lenta__item"><a href="/20260824/1.html">
      <span class="lenta__item-text">Sputnik title</span>
      <span class="lenta__item-date" data-unixtime="1787508000"></span>
    </a></div>`)

    const result = await sputnikSource()

    expect(result).toEqual([{
      id: "/20260824/1.html",
      title: "Sputnik title",
      url: "https://sputniknews.cn/20260824/1.html",
      extra: { date: 1787508000000 },
    }])
    expect(myFetchMock).toHaveBeenCalledWith("https://sputniknews.cn/services/widget/lenta/")
  })
})
