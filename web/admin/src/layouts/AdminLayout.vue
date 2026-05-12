<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { usePreferencesStore } from "@/stores/preferences"
import { useSessionStore } from "@/stores/session"

const router = useRouter()
const { t } = useI18n()
const preferencesStore = usePreferencesStore()
const sessionStore = useSessionStore()
const noticeStore = useNoticeStore()
const { locale } = storeToRefs(preferencesStore)

const links = [
  { to: "/accounts", label: "nav.accounts" },
  { to: "/models", label: "nav.models" },
  { to: "/settings", label: "nav.settings" },
  { to: "/usage", label: "nav.usage" },
  { to: "/model-mappings", label: "nav.mappings" },
  { to: "/manual", label: "nav.manual" },
] as const

async function handleLogout(): Promise<void> {
  try {
    await sessionStore.logout()
    noticeStore.success(t("auth.loginSuccess"))
  } catch {
    noticeStore.error(t("auth.loginFailed"))
  } finally {
    await router.push("/login")
  }
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="app-brand-title">{{ t("brand.title") }}</div>
        <div class="app-brand-subtitle">{{ t("brand.subtitle") }}</div>
      </div>

      <nav class="app-nav">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="app-nav-link"
        >
          {{ t(link.label) }}
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <label class="sidebar-field">
          <span>{{ t("common.language") }}</span>
          <select
            :value="locale"
            @change="preferencesStore.setLocale(($event.target as HTMLSelectElement).value as 'zh' | 'en')"
          >
            <option value="zh">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>

        <button
          type="button"
          class="btn btn-ghost btn-block"
          @click="handleLogout"
        >
          {{ t("common.logout") }}
        </button>
      </div>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
