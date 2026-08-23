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

  it("reads 36kr quick news from the embedded page data", async () => {
    myFetchMock.mockResolvedValue(`<script>{"itemList":[{
      "itemId":123,
      "templateMaterial":{"widgetTitle":"36kr title","publishTime":1787508000000}
    }]}</script>`)

    const result = await kr36Sources["36kr-quick"]!()

    expect(result).toEqual([{
      id: 123,
      title: "36kr title",
      url: "https://36kr.com/newsflashes/123",
      extra: { date: 1787508000000 },
    }])
    expect(myFetchMock).toHaveBeenCalledOnce()
  })

  it("falls back to the text proxy when 36kr cannot be reached directly", async () => {
    myFetchMock
      .mockRejectedValueOnce(new Error("network lost"))
      .mockResolvedValueOnce(`[36kr fallback](https://www.36kr.com/newsflashes/456)

8小时前`)

    const result = await kr36Sources["36kr-quick"]!()

    expect(result[0]).toMatchObject({
      id: 456,
      title: "36kr fallback",
      url: "https://36kr.com/newsflashes/456",
    })
    expect(myFetchMock).toHaveBeenNthCalledWith(2, "https://r.jina.ai/https://www.36kr.com/newsflashes")
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
