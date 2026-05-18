import { describe, expect, it } from "vitest"
import { mapNowcoderResult } from "#/sources/nowcoder"

describe("mapNowcoderResult", () => {
  it("type === 74 使用 uuid 拼 detail URL", () => {
    const result = mapNowcoderResult([
      { id: "111", uuid: "uuid-a", title: "feed 帖", type: 74 },
    ])
    expect(result).toEqual([
      { id: "uuid-a", title: "feed 帖", url: "https://www.nowcoder.com/feed/main/detail/uuid-a" },
    ])
  })

  it("type === 0 使用 id 拼 discuss URL", () => {
    const result = mapNowcoderResult([
      { id: "222", uuid: "uuid-b", title: "discuss 帖", type: 0 },
    ])
    expect(result).toEqual([
      { id: "222", title: "discuss 帖", url: "https://www.nowcoder.com/discuss/222" },
    ])
  })

  it("type 不在白名单内的条目被过滤掉", () => {
    const result = mapNowcoderResult([
      { id: "a", uuid: "ua", title: "保留", type: 0 },
      { id: "b", uuid: "ub", title: "丢弃 type=1", type: 1 },
      { id: "c", uuid: "uc", title: "丢弃 type=999", type: 999 },
      { id: "d", uuid: "ud", title: "保留", type: 74 },
    ])
    expect(result.map(k => k.title)).toEqual(["保留", "保留"])
  })

  it("空输入返回空数组", () => {
    expect(mapNowcoderResult([])).toEqual([])
  })

  it("混合 type 时顺序保持稳定", () => {
    const result = mapNowcoderResult([
      { id: "1", uuid: "u1", title: "A", type: 74 },
      { id: "2", uuid: "u2", title: "B", type: 999 },
      { id: "3", uuid: "u3", title: "C", type: 0 },
    ])
    expect(result.map(k => k.title)).toEqual(["A", "C"])
    expect(result[0].url).toBe("https://www.nowcoder.com/feed/main/detail/u1")
    expect(result[1].url).toBe("https://www.nowcoder.com/discuss/3")
  })
})
