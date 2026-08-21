import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

const indexHTML = readFileSync(new URL("../index.html", import.meta.url), "utf8")
const loginCallbackScript = indexHTML.match(
  /<script>\s*(const loginParams = new URLSearchParams\(window\.location\.hash\.slice\(1\)\)[\s\S]*?)<\/script>/,
)?.[1]

if (!loginCallbackScript) throw new Error("OAuth login callback script not found")
const loginCallbackCode = loginCallbackScript

function runLoginCallback(failingKey?: "user" | "jwt") {
  const values = new Map<string, string>()
  const setItem = vi.fn((key: string, value: string) => {
    if (key === failingKey) throw new Error(`${key} storage failed`)
    values.set(key, value)
  })
  const removeItem = vi.fn((key: string) => values.delete(key))
  const replaceState = vi.fn()

  runInNewContext(loginCallbackCode, {
    URLSearchParams,
    document: { title: "NewsNow+" },
    localStorage: { removeItem, setItem },
    window: {
      history: { replaceState },
      location: {
        hash: "#login=github&user=%7B%22name%22%3A%22Test%22%7D&jwt=token",
        pathname: "/news",
        search: "?tab=hot",
      },
    },
  })

  return { removeItem, replaceState, values }
}

describe("oauth login callback", () => {
  it("persists credentials and removes the fragment", () => {
    const { replaceState, values } = runLoginCallback()

    expect(values.get("user")).toBe("{\"name\":\"Test\"}")
    expect(values.get("jwt")).toBe("\"token\"")
    expect(replaceState).toHaveBeenCalledWith({}, "NewsNow+", "/news?tab=hot")
  })

  it("rolls back partial credentials and removes the fragment when persistence fails", () => {
    const { removeItem, replaceState, values } = runLoginCallback("jwt")

    expect(values.size).toBe(0)
    expect(removeItem).toHaveBeenCalledWith("user")
    expect(removeItem).toHaveBeenCalledWith("jwt")
    expect(replaceState).toHaveBeenCalledWith({}, "NewsNow+", "/news?tab=hot")
  })
})
