<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
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

const LOGIN_PAGE_TEXT = {
  en: {
    badge: "Admin Access",
    description:
      "Enter the management secret to access the copilot-api admin dashboard.",
    title: "Admin Console Login",
  },
  zh: {
    badge: "\u7ba1\u7406\u8bbf\u95ee",
    description:
      "\u8f93\u5165\u7ba1\u7406\u5bc6\u94a5\u4ee5\u8bbf\u95ee copilot-api \u7684\u540e\u53f0\u7ba1\u7406\u9762\u677f\u3002",
    title: "\u7ba1\u7406\u63a7\u5236\u53f0\u767b\u5f55",
  },
} as const

const secret = ref("")
const secretInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const errorMessage = ref("")

const zhLanguageOptionLabel = computed(() =>
  locale.value === "zh" ? "\u7b80\u4f53\u4e2d\u6587" : "Simplified Chinese",
)

const loginPageText = computed(() =>
  locale.value === "zh" ? LOGIN_PAGE_TEXT.zh : LOGIN_PAGE_TEXT.en,
)

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
          <span class="eyebrow">{{ loginPageText.badge }}</span>
          <div class="language-box">
            <label for="loginLanguageSelect">{{ t("common.language") }}</label>
            <select id="loginLanguageSelect" v-model="locale">
              <option value="en">English</option>
              <option value="zh">{{ zhLanguageOptionLabel }}</option>
            </select>
          </div>
        </div>
        <h1>{{ loginPageText.title }}</h1>
        <p>{{ loginPageText.description }}</p>
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
