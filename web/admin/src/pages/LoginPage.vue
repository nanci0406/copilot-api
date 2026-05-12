<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { useSessionStore } from "@/stores/session"
import { getErrorMessage } from "@/utils/errors"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const noticeStore = useNoticeStore()
const sessionStore = useSessionStore()

const secret = ref("")
const loading = ref(false)
const errorMessage = ref("")

const status = computed(() => sessionStore.status)

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
  <div class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">{{ t("auth.loginTitle") }}</h1>
      <p class="auth-copy">{{ t("auth.loginCopy") }}</p>

      <form class="form-grid" @submit.prevent="submit">
        <label class="field">
          <span>{{ t("auth.secretLabel") }}</span>
          <input
            v-model="secret"
            type="password"
            autocomplete="current-password"
          >
        </label>

        <p v-if="status" class="helper-text">
          {{ t("auth.sessionTtl", { days: status.sessionTtlDays }) }}
          <span v-if="status.enforceHttps"> {{ t("auth.httpsRequired") }}</span>
        </p>

        <p v-if="errorMessage" class="inline-error">
          {{ errorMessage }}
        </p>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? t("common.loading") : t("auth.submitLogin") }}
        </button>
      </form>
    </section>
  </div>
</template>
