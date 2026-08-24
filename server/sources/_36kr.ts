const rssHubQuick = defineRSSHubSource("/36kr/newsflashes")
const officialQuick = defineRSSSource("https://www.36kr.com/feed-newsflash")

const quick = defineSource(async () => {
  try {
    return await rssHubQuick()
  } catch {
    // Fall back to the official feed when all shared RSS mirrors fail.
  }
  return officialQuick()
})

interface HotRankItem {
  itemId: number
  templateMaterial: {
    widgetTitle: string
    authorName: string
    statRead: number
    statFormat: string
    publishTime: number
  }
}

const renqi = defineSource(async () => {
  const url = "https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot"
  const response = await myFetch<{ code: number, data: { hotRankList: HotRankItem[] } }>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      partner_id: "web",
      param: { siteId: 1, platformId: 2 },
    }),
  })

  return response.data.hotRankList.map(item => ({
    url: `https://36kr.com/p/${item.itemId}`,
    title: item.templateMaterial.widgetTitle,
    id: item.itemId,
    extra: {
      info: `${item.templateMaterial.authorName}  |  ${item.templateMaterial.statFormat}`,
      date: item.templateMaterial.publishTime,
    },
  }))
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
