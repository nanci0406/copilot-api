<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useNoticeStore } from "@/stores/notices"
import { useSessionStore } from "@/stores/session"
import { getErrorMessage } from "@/utils/errors"

const SETUP_PAGE_TEXT = {
  en: {
    badge: "Admin Security",
    descriptions: {
      initial:
        "Create the management secret that will protect the admin dashboard and all admin API routes.",
      readonly:
        "The admin secret is currently managed by environment variables and cannot be changed from the web UI.",
      rotate:
        "Replace the current admin secret. Existing admin sessions will be refreshed immediately.",
    },
    hint:
      "Use at least 8 characters. After saving, the secret will protect /admin and all /admin/api/* routes.",
    minimumLength:
      "Management secret must be at least 8 characters.",
    source: {
      "config-hash": "Config file",
      "env-hash": "Environment variable (hash)",
      "env-secret": "Environment variable",
      none: "Not configured",
    },
    submit: {
      initial: "Create Secret",
      readonly: "Back to Admin",
      rotate: "Save New Secret",
    },
    titles: {
      initial: "Initialize Admin Secret",
      readonly: "Admin Secret Managed Externally",
      rotate: "Update Admin Secret",
    },
  },
  zh: {
    badge: "Admin \u5b89\u5168",
    descriptions: {
      initial:
        "\u521b\u5efa\u4e00\u4e2a\u7528\u4e8e\u4fdd\u62a4 Admin \u540e\u53f0\u4e0e\u5168\u90e8 Admin API \u8def\u7531\u7684\u7ba1\u7406\u5bc6\u94a5\u3002",
      readonly:
        "\u5f53\u524d Admin \u5bc6\u94a5\u7531\u73af\u5883\u53d8\u91cf\u7ba1\u7406\uff0c\u65e0\u6cd5\u901a\u8fc7 Web UI \u4fee\u6539\u3002",
      rotate:
        "\u66ff\u6362\u5f53\u524d\u7684 Admin \u5bc6\u94a5\u3002\u73b0\u6709\u7684 Admin \u4f1a\u8bdd\u4f1a\u7acb\u5373\u5237\u65b0\u3002",
    },
    hint:
      "\u8bf7\u4f7f\u7528\u81f3\u5c11 8 \u4e2a\u5b57\u7b26\u3002\u4fdd\u5b58\u540e\uff0c\u8fd9\u4e2a\u5bc6\u94a5\u5c06\u4fdd\u62a4 /admin \u4e0e\u5168\u90e8 /admin/api/* \u8def\u7531\u3002",
    minimumLength:
      "\u7ba1\u7406\u5bc6\u94a5\u957f\u5ea6\u81f3\u5c11\u4e3a 8 \u4e2a\u5b57\u7b26\u3002",
    source: {
      "config-hash": "\u914d\u7f6e\u6587\u4ef6",
      "env-hash": "\u73af\u5883\u53d8\u91cf\uff08\u54c8\u5e0c\uff09",
      "env-secret": "\u73af\u5883\u53d8\u91cf",
      none: "\u672a\u914d\u7f6e",
    },
    submit: {
      initial: "\u521b\u5efa\u5bc6\u94a5",
      readonly: "\u8fd4\u56de Admin",
      rotate: "\u4fdd\u5b58\u65b0\u5bc6\u94a5",
    },
    titles: {
      initial: "\u521d\u59cb\u5316 Admin \u5bc6\u94a5",
      readonly: "Admin \u5bc6\u94a5\u7531\u5916\u90e8\u7ba1\u7406",
      rotate: "\u66f4\u65b0 Admin \u5bc6\u94a5",
    },
  },
} as const

const router = useRouter()
const { locale, t } = useI18n()
const noticeStore = useNoticeStore()
const sessionStore = useSessionStore()

const secret = ref("")
const secretInput = ref<HTMLInputElement | null>(null)
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

const zhLanguageOptionLabel = computed(() =>
  locale.value === "zh" ? "\u7b80\u4f53\u4e2d\u6587" : "Simplified Chinese",
)

const setupPageText = computed(() =>
  locale.value === "zh" ? SETUP_PAGE_TEXT.zh : SETUP_PAGE_TEXT.en,
)

const setupPageModeText = computed(() =>
  setupPageText.value.titles[mode.value],
)

const setupPageDescription = computed(() =>
  setupPageText.value.descriptions[mode.value],
)

const setupPageSourceLabel = computed(() =>
  setupPageText.value.source[sessionStore.status?.secretSource ?? "none"],
)

const setupPageSubmitLabel = computed(() =>
  setupPageText.value.submit[mode.value],
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
  const normalizedConfirm = confirmSecret.value.trim()

  if (!normalizedSecret) {
    errorMessage.value = t("auth.invalidSecret")
    return
  }

  if (normalizedSecret.length < 8) {
    errorMessage.value = setupPageText.value.minimumLength
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
          <span class="badge">{{ setupPageText.badge }}</span>
          <div class="language-box">
            <label for="setupLanguageSelect">{{ t("common.language") }}</label>
            <select id="setupLanguageSelect" v-model="locale">
              <option value="en">English</option>
              <option value="zh">{{ zhLanguageOptionLabel }}</option>
            </select>
          </div>
        </div>
        <h1>{{ setupPageModeText }}</h1>
        <p>{{ setupPageDescription }}</p>
      </section>

      <section class="body">
        <div v-if="sessionStore.status" class="meta">
          <p>
            <strong>{{ t("auth.secretSource") }}</strong>:
            <span>{{ setupPageSourceLabel }}</span>
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
              ref="secretInput"
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

          <p class="hint">{{ setupPageText.hint }}</p>

          <button type="submit" :disabled="loading">
            {{ loading ? t("common.loading") : setupPageSubmitLabel }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>
