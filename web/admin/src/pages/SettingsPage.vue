<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { reactive, watch } from "vue"
import { useI18n } from "vue-i18n"

import { fetchAdminSettings, updateAdminSettings } from "@/api/settings"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"

const { t } = useI18n()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const settingsQuery = useQuery({
  queryKey: adminQueryKeys.settings,
  queryFn: fetchAdminSettings,
})

const form = reactive({
  adminSessionTtlDays: "",
  anthropicApiKey: "",
  authApiKey: "",
  contextEnabled: false,
  contextKeepRecentTurns: "",
  contextSummarizeAtPercent: "",
  contextSummarizerModel: "",
  disableHiddenModels: false,
  rateLimitSeconds: "",
  rateLimitWait: false,
  usageLogCountMode: "request",
  usageTestIntervalMinutes: "",
})

watch(
  () => settingsQuery.data.value,
  (settings) => {
    if (!settings) {
      return
    }

    form.adminSessionTtlDays = String(settings.adminSessionTtlDays)
    form.anthropicApiKey = ""
    form.authApiKey = ""
    form.contextEnabled = settings.contextManagement.enabled
    form.contextKeepRecentTurns = String(settings.contextManagement.keepRecentTurns)
    form.contextSummarizeAtPercent = String(settings.contextManagement.summarizeAtPercent)
    form.contextSummarizerModel = settings.contextManagement.summarizerModel ?? ""
    form.disableHiddenModels = settings.disableHiddenModels
    form.rateLimitSeconds =
      settings.rateLimitSeconds === null ? "" : String(settings.rateLimitSeconds)
    form.rateLimitWait = settings.rateLimitWait
    form.usageLogCountMode = settings.usageLogCountMode
    form.usageTestIntervalMinutes =
      settings.usageTestIntervalMinutes === null ?
        ""
      : String(settings.usageTestIntervalMinutes)
  },
  {
    immediate: true,
  },
)

function parseNullableNumber(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  return Number(value)
}

async function save(payload: Record<string, unknown>) {
  try {
    await updateAdminSettings(payload)
    noticeStore.success(t("settings.saveSuccess"))
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.settings,
    })
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("settings.saveFailed")))
  }
}

async function submit(): Promise<void> {
  await save({
    adminSessionTtlDays: parseNullableNumber(form.adminSessionTtlDays),
    anthropicApiKey: form.anthropicApiKey.trim() || null,
    authApiKey: form.authApiKey.trim() || null,
    contextManagement: {
      enabled: form.contextEnabled,
      keepRecentTurns: parseNullableNumber(form.contextKeepRecentTurns),
      summarizeAtPercent: parseNullableNumber(form.contextSummarizeAtPercent),
      summarizerModel: form.contextSummarizerModel.trim() || null,
    },
    disableHiddenModels: form.disableHiddenModels,
    rateLimitSeconds: parseNullableNumber(form.rateLimitSeconds),
    rateLimitWait: form.rateLimitWait,
    usageLogCountMode: form.usageLogCountMode,
    usageTestIntervalMinutes: parseNullableNumber(form.usageTestIntervalMinutes),
  })
}

async function clearAnthropicApiKey(): Promise<void> {
  await save({
    clearAnthropicApiKey: true,
  })
}

async function clearAuthApiKey(): Promise<void> {
  await save({
    clearAuthApiKey: true,
  })
}
</script>

<template>
  <section class="page-card">
    <h1 class="page-title">{{ t("settings.title") }}</h1>
    <p class="page-subtitle">{{ t("settings.subtitle") }}</p>

    <div v-if="settingsQuery.isLoading.value" class="empty-state">
      {{ t("common.loading") }}
    </div>

    <form v-else class="page-section form-grid" @submit.prevent="submit">
      <div class="form-two-column">
        <label class="field">
          <span>{{ t("settings.rateLimitSeconds") }}</span>
          <input v-model="form.rateLimitSeconds" type="number" min="0">
        </label>

        <label class="field">
          <span>{{ t("settings.adminSessionTtlDays") }}</span>
          <input v-model="form.adminSessionTtlDays" type="number" min="1">
        </label>

        <label class="field">
          <span>{{ t("settings.usageTestIntervalMinutes") }}</span>
          <input v-model="form.usageTestIntervalMinutes" type="number" min="0">
        </label>

        <label class="field">
          <span>{{ t("settings.usageLogCountMode") }}</span>
          <select v-model="form.usageLogCountMode">
            <option value="request">{{ t("settings.countModeRequest") }}</option>
            <option value="conversation">{{ t("settings.countModeConversation") }}</option>
          </select>
        </label>
      </div>

      <label class="toggle-field">
        <input v-model="form.rateLimitWait" type="checkbox">
        <span>{{ t("settings.rateLimitWait") }}</span>
      </label>

      <label class="toggle-field">
        <input v-model="form.disableHiddenModels" type="checkbox">
        <span>{{ t("settings.disableHiddenModels") }}</span>
      </label>

      <div class="sub-card">
        <h2 class="section-title">{{ t("settings.contextTitle") }}</h2>
        <div class="form-two-column">
          <label class="toggle-field">
            <input v-model="form.contextEnabled" type="checkbox">
            <span>{{ t("settings.contextEnabled") }}</span>
          </label>

          <label class="field">
            <span>{{ t("settings.contextSummarizeAtPercent") }}</span>
            <input v-model="form.contextSummarizeAtPercent" type="number" min="50" max="95">
          </label>

          <label class="field">
            <span>{{ t("settings.contextKeepRecentTurns") }}</span>
            <input v-model="form.contextKeepRecentTurns" type="number" min="1" max="20">
          </label>

          <label class="field">
            <span>{{ t("settings.contextSummarizerModel") }}</span>
            <input v-model="form.contextSummarizerModel" type="text">
          </label>
        </div>
      </div>

      <div class="sub-card">
        <h2 class="section-title">{{ t("settings.keysTitle") }}</h2>
        <div class="form-two-column">
          <label class="field">
            <span>{{ t("settings.anthropicApiKey") }}</span>
            <input v-model="form.anthropicApiKey" type="password">
          </label>

          <label class="field">
            <span>{{ t("settings.gatewayApiKey") }}</span>
            <input v-model="form.authApiKey" type="password">
          </label>
        </div>
        <div class="inline-actions">
          <button type="button" class="btn btn-ghost" @click="clearAnthropicApiKey">
            {{ t("settings.clearAnthropicApiKey") }}
          </button>
          <button type="button" class="btn btn-ghost" @click="clearAuthApiKey">
            {{ t("settings.clearGatewayApiKey") }}
          </button>
        </div>
      </div>

      <div class="sub-card" v-if="settingsQuery.data.value">
        <h2 class="section-title">{{ t("settings.securityTitle") }}</h2>
        <div class="metric-grid">
          <div class="metric-row">
            <span>{{ t("settings.securityConfigured") }}</span>
            <strong>{{ settingsQuery.data.value.adminAuth.configured ? t("common.yes") : t("common.no") }}</strong>
          </div>
          <div class="metric-row">
            <span>{{ t("settings.securitySource") }}</span>
            <strong>{{ settingsQuery.data.value.adminAuth.secretSource }}</strong>
          </div>
          <div class="metric-row">
            <span>{{ t("settings.securityHttps") }}</span>
            <strong>{{ settingsQuery.data.value.adminAuth.enforceHttps ? t("common.yes") : t("common.no") }}</strong>
          </div>
          <div class="metric-row">
            <span>{{ t("settings.securityEnvOverride") }}</span>
            <strong>
              {{
                settingsQuery.data.value.envOverride.rateLimitSeconds || settingsQuery.data.value.envOverride.rateLimitWait ?
                  t("common.yes")
                : t("common.no")
              }}
            </strong>
          </div>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">
        {{ t("common.save") }}
      </button>
    </form>
  </section>
</template>
