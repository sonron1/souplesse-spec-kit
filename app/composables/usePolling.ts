/**
 * usePolling — composable wrapping setInterval for periodic data fetches.
 * - Pauses automatically when the browser tab is hidden (Page Visibility API)
 * - Resumes and immediately fires when the tab becomes visible again
 * - Clears the interval on component unmount
 *
 * @param fn       Async function to call on each tick
 * @param intervalMs  Polling interval in milliseconds (default: 5000)
 * @param immediate   Whether to call fn immediately on start (default: true)
 */
export function usePolling(
  fn: () => Promise<void> | void,
  intervalMs = 5000,
  immediate = true,
) {
  const isPolling = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
    if (isPolling.value) return
    isPolling.value = true
    if (immediate) fn()
    timer = setInterval(async () => {
      if (!document.hidden) await fn()
    }, intervalMs)
  }

  function stop() {
    isPolling.value = false
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function handleVisibilityChange() {
    if (!document.hidden && isPolling.value) {
      // Tab became visible — run immediately
      fn()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    start()
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { isPolling: readonly(isPolling), start, stop }
}
