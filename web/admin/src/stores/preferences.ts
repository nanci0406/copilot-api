import { defineStore } from "pinia"

import { i18n, type AdminLocale } from "@/plugins/i18n"

const STORAGE_KEY = "copilot-admin-locale"

function isSupportedLocale(value: string | null): value is AdminLocale {
  return value === "zh" || value === "en"
}

export const usePreferencesStore = defineStore("admin-preferences", {
  state: () => ({
    locale: "zh" as AdminLocale,
  }),
  actions: {
    hydrate(): void {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY)
      if (isSupportedLocale(stored)) {
        this.setLocale(stored, false)
        return
      }

      this.setLocale(this.locale, false)
    },
    setLocale(locale: AdminLocale, persist = true): void {
      this.locale = locale
      i18n.global.locale.value = locale
      if (persist) {
        globalThis.localStorage.setItem(STORAGE_KEY, locale)
      }
    },
  },
})
