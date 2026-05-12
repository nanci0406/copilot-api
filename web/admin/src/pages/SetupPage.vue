<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { useSessionStore } from "@/stores/session"
import { getErrorMessage } from "@/utils/errors"

const router = useRouter()
const { t } = useI18n()
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
  <div class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">{{ t("auth.setupTitle") }}</h1>
      <p class="auth-copy">{{ t("auth.setupCopy") }}</p>

      <p v-if="sessionStore.status" class="helper-text">
        {{ t("auth.configuredSource", { source: sessionStore.status.secretSource }) }}
      </p>

      <template v-if="mode === 'readonly'">
        <div class="readonly-panel">
          <h2>{{ t("auth.readonlyTitle") }}</h2>
          <p>{{ t("auth.readonlyCopy") }}</p>
        </div>
      </template>

      <form v-else class="form-grid" @submit.prevent="submit">
        <label class="field">
          <span>{{ t("auth.secretLabel") }}</span>
          <input
            v-model="secret"
            type="password"
            autocomplete="new-password"
          >
        </label>

        <label class="field">
          <span>{{ t("auth.confirmLabel") }}</span>
          <input
            v-model="confirmSecret"
            type="password"
            autocomplete="new-password"
          >
        </label>

        <p v-if="errorMessage" class="inline-error">
          {{ errorMessage }}
        </p>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? t("common.loading") : t("auth.submitSetup") }}
        </button>
      </form>
    </section>
  </div>
</template>
