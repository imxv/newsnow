interface QuickItem {
  itemId: number
  templateMaterial: {
    widgetTitle: string
    publishTime: number
  }
}

function parseQuickItems(content: string): QuickItem[] {
  const marker = `"itemList":`
  const markerIndex = content.indexOf(marker)
  const arrayStart = markerIndex === -1 ? -1 : content.indexOf("[", markerIndex + marker.length)
  let arrayEnd = -1
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = arrayStart; index >= 0 && index < content.length; index++) {
    const character = content[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === "\\") {
        escaped = true
      } else if (character === `"`) {
        inString = false
      }
      continue
    }
    if (character === `"`) {
      inString = true
    } else if (character === "[") {
      depth++
    } else if (character === "]" && --depth === 0) {
      arrayEnd = index + 1
      break
    }
  }

  const embeddedItems = arrayStart >= 0 && arrayEnd > arrayStart
    ? content.slice(arrayStart, arrayEnd)
    : undefined
  if (embeddedItems) {
    try {
      return JSON.parse(embeddedItems)
    } catch {
      // Fall through to the text proxy format.
    }
  }

  const items: QuickItem[] = []
  const linkPattern = /^\[([^\]\n]+)\]\(https:\/\/www\.36kr\.com\/newsflashes\/(\d+)\)$/gm
  for (const match of content.matchAll(linkPattern)) {
    const followingText = content.slice((match.index ?? 0) + match[0].length)
    const relativeDate = followingText.split(/\r?\n/).map(line => line.trim()).find(Boolean)
    if (!relativeDate) continue
    items.push({
      itemId: Number(match[2]),
      templateMaterial: {
        widgetTitle: match[1],
        publishTime: Number(parseRelativeDate(relativeDate, "Asia/Shanghai").valueOf()),
      },
    })
  }
  return items
}

const quick = defineSource(async () => {
  const sourceURL = "https://www.36kr.com/newsflashes"
  let content = ""
  try {
    content = await myFetch<string>(sourceURL)
  } catch {
    // Some edge runtimes cannot connect to 36kr directly.
  }

  let items = parseQuickItems(content)
  if (!items.length) {
    content = await myFetch<string>(`https://r.jina.ai/${sourceURL}`)
    items = parseQuickItems(content)
  }
  if (!items.length) throw new Error("Cannot fetch 36kr quick news")

  return items.map(item => ({
    id: item.itemId,
    title: item.templateMaterial.widgetTitle,
    url: `https://36kr.com/newsflashes/${item.itemId}`,
    extra: {
      date: item.templateMaterial.publishTime,
    },
  }))
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
