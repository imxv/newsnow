import type { SourceID } from "@shared/types"
import { useQueryClient } from "@tanstack/react-query"
import { refreshSourceQueries } from "@shared/source-refresh"
import { loadSource } from "~/services/source"

export function useRefetch() {
  const { enableLogin, loggedIn, login } = useLogin()
  const toaster = useToast()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  /**
   * force refresh
   */
  const refresh = useCallback(async (...sources: SourceID[]) => {
    if (enableLogin && !loggedIn) {
      toaster("登录后可以强制拉取最新数据", {
        type: "warning",
        action: {
          label: "登录",
          onClick: login,
        },
      })
      return
    }

    setIsRefreshing(true)
    try {
      const result = await refreshSourceQueries(queryClient, sources, {
        concurrency: 4,
        fetcher: loadSource,
      })
      if (result.failed.length > 0) {
        toaster(
          result.succeeded.length > 0
            ? `已刷新 ${result.succeeded.length} 个，${result.failed.length} 个失败`
            : "刷新失败，请稍后重试",
          { type: "warning" },
        )
      }
      return result
    } finally {
      setIsRefreshing(false)
    }
  }, [enableLogin, loggedIn, login, queryClient, toaster])

  return {
    refresh,
    isRefreshing,
  }
}
