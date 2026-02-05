import { createContext, useContext, useEffect, useState } from "react"

const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: () => null,
})

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}) {
  const [theme, setTheme] = useState(defaultTheme)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    try {
      if (typeof window !== "undefined") {
          const storedTheme = localStorage.getItem(storageKey)
          if (storedTheme) {
            setTheme(storedTheme)
          }
      }
    } catch (e) {
      console.error("Failed to access localStorage for theme", e)
    }
  }, [storageKey])

  useEffect(() => {
    if (!isMounted) return

    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, isMounted])

  const value = {
    theme,
    setTheme: (theme) => {
      try {
        if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, theme)
        }
      } catch (e) {
        console.error("Failed to save theme to localStorage", e)
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
