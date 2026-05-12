<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { fetchAccounts } from "@/api/accounts"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { usePreferencesStore } from "@/stores/preferences"
import { useSessionStore } from "@/stores/session"

const router = useRouter()
const { t } = useI18n()
const preferencesStore = usePreferencesStore()
const sessionStore = useSessionStore()
const noticeStore = useNoticeStore()
const { locale } = storeToRefs(preferencesStore)

const accountsQuery = useQuery({
  queryKey: adminQueryKeys.accounts,
  queryFn: fetchAccounts,
})

const links = [
  { to: "/accounts", label: "nav.accounts" },
  { to: "/settings", label: "nav.settings" },
  { to: "/models", label: "nav.models" },
  { to: "/usage", label: "nav.usage" },
  { to: "/model-mappings", label: "nav.mappings" },
  { to: "/manual", label: "nav.manual" },
] as const

const activeAccount = computed(() =>
  accountsQuery.data.value?.accounts.find((account) => account.isActive),
)

async function handleLogout(): Promise<void> {
  try {
    await sessionStore.logout()
    noticeStore.success(t("auth.logoutSuccess"))
  } catch {
    noticeStore.error(t("auth.loginFailed"))
  } finally {
    await router.push("/login")
  }
}
</script>

<template>
  <div class="container">
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-profile">
          <div class="sidebar-avatar-wrap">
            <img
              v-if="activeAccount?.avatarUrl"
              class="sidebar-avatar"
              :src="activeAccount.avatarUrl"
              :alt="activeAccount.login"
              style="display: block;"
            >
            <div v-else class="sidebar-avatar-fallback">
              {{ activeAccount?.login?.slice(0, 1).toUpperCase() || "?" }}
            </div>
          </div>
          <div class="sidebar-profile-text">
            <div class="sidebar-login">
              {{ activeAccount?.login || t("status.noActiveAccount") }}
            </div>
            <div class="sidebar-type">
              {{ activeAccount?.accountType || t("status.connectAccount") }}
            </div>
          </div>
        </div>

        <div class="status-bar">
          <div class="status-dot" :class="{ online: sessionStore.authenticated }" />
          <span>{{ sessionStore.authenticated ? t("status.online") : t("status.offline") }}</span>
        </div>

        <div class="sidebar-language">
          <label class="sidebar-language-label" for="languageSelect">
            {{ t("common.language") }}
          </label>
          <select
            id="languageSelect"
            class="select sidebar-language-select"
            :value="locale"
            @change="preferencesStore.setLocale(($event.target as HTMLSelectElement).value as 'zh' | 'en')"
          >
            <option value="zh">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <div class="sidebar-admin-actions">
          <button type="button" class="btn btn-sm" @click="handleLogout">
            {{ t("common.logout") }}
          </button>
        </div>

        <nav class="tabs sidebar-nav">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="tab"
          >
            {{ t(link.label) }}
          </RouterLink>
        </nav>
      </aside>

      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
