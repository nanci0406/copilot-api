<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { useSessionStore } from "@/stores/session"
import { getErrorMessage } from "@/utils/errors"

const router = useRouter()
const { locale, t } = useI18n()
const noticeStore = useNoticeStore()
const sessionStore = useSessionStore()

const secret = ref("")
const confirmSecret = ref("")
const loading = ref(false)
const errorMessage = ref("")

const mode = computed(() => {
  const status = sessionStore.status
  if (!status?.configured) {
    return "initial"
  }

  return status.secretManagedInApp ? "rotate" : "readonly"
})

async function submit(): Promise<void> {
  errorMessage.value = ""
  const normalizedSecret = secret.value.trim()
  const normalizedConfirm = confirmSecret.value.trim()

  if (!normalizedSecret) {
    errorMessage.value = t("auth.invalidSecret")
    return
  }

  if (normalizedSecret !== normalizedConfirm) {
    errorMessage.value = t("auth.confirmMismatch")
    return
  }

  loading.value = true
  try {
    await sessionStore.setup(normalizedSecret, normalizedConfirm)
    noticeStore.success(t("auth.setupSuccess"))
    await router.push("/accounts")
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t("auth.setupFailed"))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page-legacy">
    <main class="panel">
      <section class="header">
        <div class="header-top">
          <span class="badge">{{ t("auth.setupBadge") }}</span>
          <div class="language-box">
            <label for="setupLanguageSelect">{{ t("common.language") }}</label>
            <select id="setupLanguageSelect" v-model="locale">
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <h1>{{ t("auth.setupTitle") }}</h1>
        <p>{{ t("auth.setupCopy") }}</p>
      </section>

      <section class="body">
        <div v-if="sessionStore.status" class="meta">
          <p>
            <strong>{{ t("auth.secretSource") }}</strong>:
            <span>{{ sessionStore.status.secretSource }}</span>
          </p>
        </div>

        <div v-if="errorMessage" class="error" role="alert">
          {{ errorMessage }}
        </div>

        <template v-if="mode === 'readonly'">
          <div class="meta">
            <p><strong>{{ t("auth.readonlyTitle") }}</strong></p>
            <p>{{ t("auth.readonlyCopy") }}</p>
          </div>
          <RouterLink class="button-link" to="/accounts">
            {{ t("auth.backToAdmin") }}
          </RouterLink>
        </template>

        <form v-else @submit.prevent="submit">
          <label for="adminSecret">
            <span>{{ t("auth.secretLabel") }}</span>
            <input
              id="adminSecret"
              v-model="secret"
              type="password"
              autocomplete="new-password"
            >
          </label>

          <label for="adminSecretConfirm">
            <span>{{ t("auth.confirmLabel") }}</span>
            <input
              id="adminSecretConfirm"
              v-model="confirmSecret"
              type="password"
              autocomplete="new-password"
            >
          </label>

          <p class="hint">{{ t("auth.setupHint") }}</p>

          <button type="submit" :disabled="loading">
            {{ loading ? t("common.loading") : t("auth.submitSetup") }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>
