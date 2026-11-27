import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
// Laptops and big tablets in landscape: the sidebar shows its labels and list pages open items next to the list.
const WIDE_QUERY = "(min-width: 1280px)"

const subscribeWide = (onChange: () => void) => {
  const mql = window.matchMedia?.(WIDE_QUERY)
  mql?.addEventListener("change", onChange)
  return () => mql?.removeEventListener("change", onChange)
}

export function useIsWide() {
  return React.useSyncExternalStore(subscribeWide, () => window.matchMedia?.(WIDE_QUERY).matches ?? false)
}
