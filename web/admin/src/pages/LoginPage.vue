<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { useSessionStore } from "@/stores/session"
import { getErrorMessage } from "@/utils/errors"

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const noticeStore = useNoticeStore()
const sessionStore = useSessionStore()

const secret = ref("")
const secretInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const errorMessage = ref("")

onMounted(() => {
  document.body.classList.add("auth-body")
  secretInput.value?.focus()
})

onBeforeUnmount(() => {
  document.body.classList.remove("auth-body")
})

async function submit(): Promise<void> {
  errorMessage.value = ""
  const normalizedSecret = secret.value.trim()
  if (!normalizedSecret) {
    errorMessage.value = t("auth.invalidSecret")
    return
  }

  loading.value = true
  try {
    await sessionStore.login(normalizedSecret)
    noticeStore.success(t("auth.loginSuccess"))
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect ?
        route.query.redirect
      : "/accounts"
    await router.push(redirect)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t("auth.loginFailed"))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page-legacy">
    <main class="panel">
      <section class="panel-header">
        <div class="header-top">
          <span class="eyebrow">{{ t("auth.loginBadge") }}</span>
          <div class="language-box">
            <label for="loginLanguageSelect">{{ t("common.language") }}</label>
            <select id="loginLanguageSelect" v-model="locale">
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </div>
        </div>
        <h1>{{ t("auth.loginTitle") }}</h1>
        <p>{{ t("auth.loginCopy") }}</p>
      </section>

      <section class="panel-body">
        <div v-if="errorMessage" class="error" role="alert">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="submit">
          <label for="adminSecret">
            <span>{{ t("auth.secretLabel") }}</span>
            <input
              id="adminSecret"
              ref="secretInput"
              v-model="secret"
              type="password"
              autocomplete="current-password"
          >
        </label>

          <button type="submit" :disabled="loading">
            {{ loading ? t("common.loading") : t("auth.submitLogin") }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>
