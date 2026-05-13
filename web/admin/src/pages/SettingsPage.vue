<script setup lang="ts">
import type {
  AccountPoolScope,
  AccountSelectionMode,
  AccountSelectorStrategy,
} from "@copilot-api/admin-contracts"
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, reactive, watch } from "vue"
import { useI18n } from "vue-i18n"

import {
  fetchAccountSelection,
  updateAccountSelection,
} from "@/api/account-selection"
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
const accountSelectionQuery = useQuery({
  queryKey: adminQueryKeys.accountSelection,
  queryFn: fetchAccountSelection,
})

const isLoading = computed(
  () =>
    settingsQuery.isLoading.value || accountSelectionQuery.isLoading.value,
)
const accountSelectionAccounts = computed(
  () => accountSelectionQuery.data.value?.accounts ?? [],
)

const form = reactive({
  accountPoolScope: "all_accounts" as AccountPoolScope,
  accountSelectionFailoverOnRequestError: false,
  accountSelectionMode: "active_only" as AccountSelectionMode,
  accountSelectionSelectedAccountIds: [] as Array<string>,
  accountSelectionStickySessions: true,
  accountSelectionStickySessionTtlMinutes: "",
  accountSelectorStrategy: "least_recently_used" as AccountSelectorStrategy,
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
  () => accountSelectionQuery.data.value,
  (data) => {
    if (!data) {
      return
    }

    const accountSelection = data.accountSelection
    form.accountPoolScope = accountSelection.poolScope
    form.accountSelectionFailoverOnRequestError =
      accountSelection.failoverOnRequestError
    form.accountSelectionMode = accountSelection.mode
    form.accountSelectionSelectedAccountIds.splice(
      0,
      form.accountSelectionSelectedAccountIds.length,
      ...accountSelection.selectedAccountIds,
    )
    form.accountSelectionStickySessions = accountSelection.stickySessions
    form.accountSelectionStickySessionTtlMinutes = String(
      accountSelection.stickySessionTtlMinutes,
    )
    form.accountSelectorStrategy = accountSelection.selectorStrategy
  },
  {
    immediate: true,
  },
)

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

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  return Number(value)
}

function buildAccountSelectionPayload(): Record<string, unknown> {
  return {
    mode: form.accountSelectionMode,
    poolScope: form.accountPoolScope,
    selectedAccountIds: [...form.accountSelectionSelectedAccountIds],
    stickySessions: form.accountSelectionStickySessions,
    stickySessionTtlMinutes: parseOptionalNumber(
      form.accountSelectionStickySessionTtlMinutes,
    ),
    failoverOnRequestError: form.accountSelectionFailoverOnRequestError,
    selectorStrategy: form.accountSelectorStrategy,
  }
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
  if (!accountSelectionQuery.data.value) {
    noticeStore.error(t("settings.accountSelectionLoadFailed"))
    return
  }

  try {
    await updateAccountSelection(buildAccountSelectionPayload())
    await updateAdminSettings({
      adminSessionTtlDays: parseNullableNumber(form.adminSessionTtlDays),
      anthropicApiKey: form.anthropicApiKey.trim() || null,
      authApiKey: form.authApiKey.trim() || null,
      contextManagement: {
        enabled: form.contextEnabled,
        keepRecentTurns: parseNullableNumber(form.contextKeepRecentTurns),
        summarizeAtPercent: parseNullableNumber(
          form.contextSummarizeAtPercent,
        ),
        summarizerModel: form.contextSummarizerModel.trim() || null,
      },
      disableHiddenModels: form.disableHiddenModels,
      rateLimitSeconds: parseNullableNumber(form.rateLimitSeconds),
      rateLimitWait: form.rateLimitWait,
      usageLogCountMode: form.usageLogCountMode,
      usageTestIntervalMinutes: parseNullableNumber(
        form.usageTestIntervalMinutes,
      ),
    })
    noticeStore.success(t("settings.saveSuccess"))
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.settings,
      }),
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.accountSelection,
      }),
    ])
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("settings.saveFailed")))
  }
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

      <div v-if="isLoading" class="empty-state">
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

        <div class="settings-section settings-context-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.accountSelectionTitle") }}</div>
          </div>
          <div class="settings-context-options">
            <label class="settings-field">
              <span>{{ t("settings.accountSelectionMode") }}</span>
              <select v-model="form.accountSelectionMode" class="select">
                <option value="active_only">{{ t("settings.accountSelectionModeActiveOnly") }}</option>
                <option value="account_pool">{{ t("settings.accountSelectionModeAccountPool") }}</option>
              </select>
            </label>
            <label class="settings-field">
              <span>{{ t("settings.accountPoolScope") }}</span>
              <select v-model="form.accountPoolScope" class="select">
                <option value="all_accounts">{{ t("settings.accountPoolScopeAll") }}</option>
                <option value="selected_accounts">{{ t("settings.accountPoolScopeSelected") }}</option>
              </select>
            </label>
            <label class="settings-field">
              <span>{{ t("settings.accountSelectorStrategy") }}</span>
              <select v-model="form.accountSelectorStrategy" class="select">
                <option value="least_recently_used">{{ t("settings.accountSelectorLeastRecentlyUsed") }}</option>
                <option value="round_robin">{{ t("settings.accountSelectorRoundRobin") }}</option>
                <option value="quota_aware">{{ t("settings.accountSelectorQuotaAware") }}</option>
              </select>
            </label>
          </div>
          <label
            v-if="form.accountPoolScope === 'selected_accounts'"
            class="settings-field"
          >
            <span>{{ t("settings.accountSelectionSelectedAccounts") }}</span>
            <select
              v-model="form.accountSelectionSelectedAccountIds"
              class="select"
              multiple
              size="4"
            >
              <option
                v-if="accountSelectionAccounts.length === 0"
                disabled
                value=""
              >
                {{ t("settings.accountSelectionNoAccounts") }}
              </option>
              <option
                v-for="account in accountSelectionAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.login }} - {{ account.accountType }}
                {{ account.isActive ? ` - ${t("common.active")}` : "" }}
              </option>
            </select>
          </label>
          <div class="settings-context-options">
            <label class="settings-field">
              <span>{{ t("settings.accountSelectionStickyTtl") }}</span>
              <input
                v-model="form.accountSelectionStickySessionTtlMinutes"
                class="input"
                type="number"
                min="5"
                max="10080"
              >
            </label>
          </div>
          <label class="settings-switch-row settings-switch-row-compact">
            <span class="settings-switch-copy">
              <span class="settings-switch-title">{{ t("settings.accountSelectionStickySessions") }}</span>
              <span class="settings-switch-hint">{{ t("settings.accountSelectionStickySessionsHint") }}</span>
            </span>
            <span class="settings-switch">
              <input v-model="form.accountSelectionStickySessions" type="checkbox">
              <span class="settings-switch-slider" />
            </span>
          </label>
          <label class="settings-switch-row settings-switch-row-compact">
            <span class="settings-switch-copy">
              <span class="settings-switch-title">{{ t("settings.accountSelectionFailover") }}</span>
              <span class="settings-switch-hint">{{ t("settings.accountSelectionFailoverHint") }}</span>
            </span>
            <span class="settings-switch">
              <input v-model="form.accountSelectionFailoverOnRequestError" type="checkbox">
              <span class="settings-switch-slider" />
            </span>
          </label>
          <p class="hint">{{ t("settings.accountSelectionRuntimeHint") }}</p>
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
