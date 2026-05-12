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
  <div id="tab-settings" class="tab-content active">
    <div class="card">
      <div class="card-header">
        <div class="settings-header-main">
          <span class="card-title">{{ t("settings.trafficControl") }}</span>
          <p class="settings-subtitle">{{ t("settings.subtitle") }}</p>
        </div>
        <div class="settings-save-wrap">
          <button form="settingsForm" type="submit" class="btn btn-primary btn-sm">
            {{ t("common.save") }}
          </button>
        </div>
      </div>

      <div v-if="settingsQuery.isLoading.value" class="empty-state">
        {{ t("common.loading") }}
      </div>

      <form v-else id="settingsForm" class="settings-form-grid" @submit.prevent="submit">
        <div class="settings-section settings-rate-limit-section">
          <div class="settings-section-title">{{ t("settings.rateLimitSeconds") }}</div>
          <div class="settings-input-row">
            <input v-model="form.rateLimitSeconds" class="input" type="number" min="0">
            <span class="settings-input-unit">{{ t("settings.secondsUnit") }}</span>
          </div>
          <label class="settings-switch-row settings-switch-row-compact">
            <span class="settings-switch-copy">
              <span class="settings-switch-title">{{ t("settings.rateLimitWait") }}</span>
              <span class="settings-switch-hint">{{ t("settings.rateLimitWaitHint") }}</span>
            </span>
            <span class="settings-switch">
              <input v-model="form.rateLimitWait" type="checkbox">
              <span class="settings-switch-slider" />
            </span>
          </label>
          <div class="notice settings-notice">
            {{ t("settings.noticeProcessWide") }}
            {{ t("settings.noticeSavedValues") }}
          </div>
        </div>

        <div class="settings-section settings-context-section">
          <label class="settings-switch-row">
            <span class="settings-switch-copy">
              <span class="settings-switch-title">{{ t("settings.contextTitle") }}</span>
              <span class="settings-switch-hint">{{ t("settings.contextEnabled") }}</span>
            </span>
            <span class="settings-switch">
              <input v-model="form.contextEnabled" type="checkbox">
              <span class="settings-switch-slider" />
            </span>
          </label>
          <div class="settings-context-options">
            <label class="settings-field">
              <span>{{ t("settings.contextSummarizeAtPercent") }}</span>
              <input v-model="form.contextSummarizeAtPercent" class="input" type="number" min="50" max="95">
            </label>
            <label class="settings-field">
              <span>{{ t("settings.contextKeepRecentTurns") }}</span>
              <input v-model="form.contextKeepRecentTurns" class="input" type="number" min="1" max="20">
            </label>
            <label class="settings-field">
              <span>{{ t("settings.contextSummarizerModel") }}</span>
              <input v-model="form.contextSummarizerModel" class="input" type="text">
            </label>
          </div>
          <p class="hint">{{ t("settings.contextCompressionCostHint") }}</p>
        </div>

        <div class="settings-section settings-key-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.anthropicApiKey") }}</div>
          </div>
          <div class="settings-input-row">
            <input v-model="form.anthropicApiKey" class="input" type="password">
            <button type="button" class="btn settings-inline-btn" @click="clearAnthropicApiKey">
              {{ t("settings.clearAnthropicApiKey") }}
            </button>
          </div>
        </div>

        <div class="settings-section settings-key-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.gatewayApiKey") }}</div>
          </div>
          <div class="settings-input-row">
            <input v-model="form.authApiKey" class="input" type="password">
            <button type="button" class="btn settings-inline-btn" @click="clearAuthApiKey">
              {{ t("settings.clearGatewayApiKey") }}
            </button>
          </div>
        </div>

        <div class="settings-section settings-admin-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.securityTitle") }}</div>
            <div v-if="settingsQuery.data.value" class="settings-title-actions">
              <span class="settings-status-badge" :class="{ 'is-set': settingsQuery.data.value.adminAuth.configured }">
                {{ settingsQuery.data.value.adminAuth.configured ? t("common.yes") : t("common.no") }}
              </span>
            </div>
          </div>
          <div v-if="settingsQuery.data.value" class="settings-security-meta">
            <p class="hint">
              {{ t("settings.securitySource") }}: {{ settingsQuery.data.value.adminAuth.secretSource }}
            </p>
            <p class="hint">
              {{ t("settings.securityHttps") }}:
              {{ settingsQuery.data.value.adminAuth.enforceHttps ? t("common.yes") : t("common.no") }}
            </p>
            <div class="settings-input-row">
              <input v-model="form.adminSessionTtlDays" class="input" type="number" min="1">
              <span class="settings-input-unit">{{ t("settings.daysUnit") }}</span>
            </div>
          </div>
        </div>

        <div class="settings-section settings-maintenance-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.usageLogMaintenance") }}</div>
          </div>
          <div class="settings-context-options">
            <label class="settings-field">
              <span>{{ t("settings.usageTestIntervalMinutes") }}</span>
              <input v-model="form.usageTestIntervalMinutes" class="input" type="number" min="0">
            </label>
            <label class="settings-field">
              <span>{{ t("settings.usageLogCountMode") }}</span>
              <select v-model="form.usageLogCountMode" class="select">
                <option value="request">{{ t("settings.countModeRequest") }}</option>
                <option value="conversation">{{ t("settings.countModeConversation") }}</option>
              </select>
            </label>
          </div>
          <label class="settings-switch-row settings-switch-row-compact">
            <span class="settings-switch-copy">
              <span class="settings-switch-title">{{ t("settings.disableHiddenModels") }}</span>
            </span>
            <span class="settings-switch">
              <input v-model="form.disableHiddenModels" type="checkbox">
              <span class="settings-switch-slider" />
            </span>
          </label>
        </div>
      </form>
    </div>
  </div>
</template>
