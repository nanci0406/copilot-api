<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import { fetchAdminSettings, updateAdminSettings } from "@/api/settings"
import {
  clearAllUsageLogs,
  clearUsageLogs,
} from "@/api/usage"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"

type SettingsSnapshot = {
  adminSessionTtlDays: number | null
  anthropicApiKey: string
  authApiKey: string
  contextEnabled: boolean
  contextKeepRecentTurns: number
  contextSummarizeAtPercent: number
  contextSummarizerModel: string
  disableHiddenModels: boolean
  rateLimitSeconds: number | null
  rateLimitWait: boolean
}

const LEGACY_SETTINGS_TEXT = {
  en: {
    adminHttpsOptional: "Optional",
    adminHttpsRequired: "Required",
    adminSecretSourceConfig: "Config file",
    adminSecretSourceEnv: "Environment variable",
    adminSecretSourceEnvHash: "Environment variable (hash)",
    adminSecretSourceNone: "Not configured",
    adminSecurityLoading: "Loading admin security status...",
    adminSecurityStatusConfigured: "Protected",
    adminSecurityStatusPending: "Loading",
    adminSecurityStatusSetupRequired: "Setup required",
    adminSecuritySummary: "Source: {source}. HTTPS: {https}.",
    adminSessionTtlDaysHint:
      "Controls how long Admin login sessions remain valid. Leave empty to reset to the default 5 days.",
    adminSessionTtlDaysPlaceholder: "Leave empty to use default",
    anthropicApiKeyHint:
      "This key must be a valid Anthropic API key. It is only used for accurate token counting on Claude models.",
    anthropicApiKeyPlaceholder: "Leave empty to keep current key",
    anthropicApiKeyStatusNotSet: "Not set",
    anthropicApiKeyStatusSet: "Set",
    clearAll: "Clear all account logs",
    clearAllConfirmMessage:
      "This will permanently clear the local usage log list for all accounts. Continue?",
    clearAllConfirmTitle: "Clear all account usage logs",
    clearAllSuccess:
      "Cleared {count} local usage log record(s) across all accounts.",
    clearAnthropicApiKeyConfirmMessage:
      "This will remove the saved Anthropic API key immediately. Continue?",
    clearAnthropicApiKeyConfirmTitle: "Clear Anthropic API key",
    clearCurrent: "Clear current account logs",
    clearCurrentConfirmMessage:
      "This will permanently clear the current active account's local usage log list. Continue?",
    clearCurrentConfirmTitle: "Clear current account usage logs",
    clearCurrentFailed: "Failed to clear usage logs.",
    clearCurrentSuccess:
      "Cleared {count} local usage log record(s) for the current active account.",
    clearGatewayApiKeyConfirmMessage:
      "This will remove the saved gateway API key immediately. Continue?",
    clearGatewayApiKeyConfirmTitle: "Clear gateway API key",
    contextCompressionModelPlaceholder: "Use small model",
    contextCompressionPercentPlaceholder: "80",
    contextKeepRecentTurnsPlaceholder: "4",
    failedLoad: "Failed to load settings.",
    gatewayApiKeyHint:
      "Suitable for scenarios without gpt/new-style relay projects, helping avoid unauthorized calls or abuse after public exposure.",
    gatewayApiKeyPlaceholder: "Leave empty to keep current key",
    gatewayApiKeyStatusNotSet: "Not set",
    gatewayApiKeyStatusSet: "Set",
    loadingSettings: "Loading settings...",
    maintenanceHint:
      "These buttons clear the local Usage list for the current active account or all accounts. Historical month data is also cleaned automatically on the first new write after the 1st of each month.",
    manageAdminSecret: "Manage Secret",
    noticeEnvOverride:
      "Environment variables currently override: {names}.",
    rateLimitPlaceholder: "Leave empty to disable",
    setupAdminSecret: "Setup Secret",
    unsaved: "Unsaved changes",
    validationAdminSessionTtlDays:
      "Admin session days must be an integer greater than 0, or left empty.",
    validationContextCompressionPercent:
      "Context compression percent must be between 50 and 95.",
    validationContextKeepRecentTurns:
      "Recent turns must be an integer between 1 and 20.",
    validationRateLimit:
      "Rate limit seconds must be greater than 0, or left empty.",
  },
  zh: {
    adminHttpsOptional: "\u53ef\u9009",
    adminHttpsRequired: "\u5fc5\u987b",
    adminSecretSourceConfig: "\u914d\u7f6e\u6587\u4ef6",
    adminSecretSourceEnv: "\u73af\u5883\u53d8\u91cf",
    adminSecretSourceEnvHash: "\u73af\u5883\u53d8\u91cf\uff08\u54c8\u5e0c\uff09",
    adminSecretSourceNone: "\u672a\u914d\u7f6e",
    adminSecurityLoading: "\u6b63\u5728\u52a0\u8f7d Admin \u5b89\u5168\u72b6\u6001...",
    adminSecurityStatusConfigured: "\u5df2\u4fdd\u62a4",
    adminSecurityStatusPending: "\u52a0\u8f7d\u4e2d",
    adminSecurityStatusSetupRequired: "\u9700\u8981\u8bbe\u7f6e",
    adminSecuritySummary: "\u6765\u6e90\uff1a{source}\u3002HTTPS\uff1a{https}\u3002",
    adminSessionTtlDaysHint:
      "\u7528\u4e8e\u63a7\u5236 Admin \u767b\u5f55\u4f1a\u8bdd\u7684\u6709\u6548\u5929\u6570\u3002\u7559\u7a7a\u5219\u6062\u590d\u4e3a\u9ed8\u8ba4 5 \u5929\u3002",
    adminSessionTtlDaysPlaceholder:
      "\u7559\u7a7a\u5219\u4f7f\u7528\u9ed8\u8ba4\u503c",
    anthropicApiKeyHint:
      "\u8fd9\u4e2a key \u5fc5\u987b\u662f\u6709\u6548\u7684 Anthropic API Key\uff0c\u4ec5\u7528\u4e8e Claude \u6a21\u578b\u7684 token \u7edf\u8ba1\u3002",
    anthropicApiKeyPlaceholder:
      "\u7559\u7a7a\u5219\u4fdd\u7559\u5f53\u524d key",
    anthropicApiKeyStatusNotSet: "\u672a\u8bbe\u7f6e",
    anthropicApiKeyStatusSet: "\u5df2\u8bbe\u7f6e",
    clearAll: "\u6e05\u7406\u5168\u90e8\u8d26\u6237\u8bb0\u5f55",
    clearAllConfirmMessage:
      "\u8fd9\u4f1a\u6c38\u4e45\u6e05\u7a7a\u6240\u6709\u8d26\u6237\u7684\u672c\u5730 Usage \u65e5\u5fd7\u5217\u8868\uff0c\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f",
    clearAllConfirmTitle:
      "\u6e05\u7406\u5168\u90e8\u8d26\u6237 Usage \u8bb0\u5f55",
    clearAllSuccess:
      "\u5df2\u6e05\u7406\u5168\u90e8\u8d26\u6237\u7684 {count} \u6761\u672c\u5730 Usage \u8bb0\u5f55\u3002",
    clearAnthropicApiKeyConfirmMessage:
      "\u8fd9\u4f1a\u7acb\u5373\u79fb\u9664\u5df2\u4fdd\u5b58\u7684 Anthropic API Key\uff0c\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f",
    clearAnthropicApiKeyConfirmTitle:
      "\u6e05\u9664 Anthropic API Key",
    clearCurrent: "\u6e05\u7406\u5f53\u524d\u8d26\u6237\u8bb0\u5f55",
    clearCurrentConfirmMessage:
      "\u8fd9\u4f1a\u6c38\u4e45\u6e05\u7a7a\u5f53\u524d\u6d3b\u8dc3\u8d26\u6237\u7684\u672c\u5730 Usage \u65e5\u5fd7\u5217\u8868\uff0c\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f",
    clearCurrentConfirmTitle:
      "\u6e05\u7406\u5f53\u524d\u8d26\u6237 Usage \u8bb0\u5f55",
    clearCurrentFailed: "\u6e05\u7406 Usage \u8bb0\u5f55\u5931\u8d25\u3002",
    clearCurrentSuccess:
      "\u5df2\u6e05\u7406\u5f53\u524d\u6d3b\u8dc3\u8d26\u6237\u7684 {count} \u6761\u672c\u5730 Usage \u8bb0\u5f55\u3002",
    clearGatewayApiKeyConfirmMessage:
      "\u8fd9\u4f1a\u7acb\u5373\u79fb\u9664\u5df2\u4fdd\u5b58\u7684\u7f51\u5173 API Key\uff0c\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f",
    clearGatewayApiKeyConfirmTitle:
      "\u6e05\u9664\u7f51\u5173 API Key",
    contextCompressionModelPlaceholder:
      "\u7559\u7a7a\u5219\u4f7f\u7528\u5c0f\u6a21\u578b",
    contextCompressionPercentPlaceholder: "80",
    contextKeepRecentTurnsPlaceholder: "4",
    failedLoad: "\u52a0\u8f7d\u8bbe\u7f6e\u5931\u8d25\u3002",
    gatewayApiKeyHint:
      "\u9002\u5408\u6ca1\u6709 gpt/new \u7c7b\u4e2d\u8f6c\u9879\u76ee\u7684\u573a\u666f\uff0c\u53ef\u4ee5\u5e2e\u52a9\u907f\u514d\u516c\u5f00\u540e\u88ab\u672a\u6388\u6743\u8c03\u7528\u6216\u6ee5\u7528\u3002",
    gatewayApiKeyPlaceholder:
      "\u7559\u7a7a\u5219\u4fdd\u7559\u5f53\u524d key",
    gatewayApiKeyStatusNotSet: "\u672a\u8bbe\u7f6e",
    gatewayApiKeyStatusSet: "\u5df2\u8bbe\u7f6e",
    loadingSettings: "\u6b63\u5728\u52a0\u8f7d\u8bbe\u7f6e...",
    maintenanceHint:
      "\u8fd9\u4e24\u4e2a\u6309\u94ae\u5206\u522b\u6e05\u7406\u5f53\u524d\u6d3b\u8dc3\u8d26\u6237\u6216\u5168\u90e8\u8d26\u6237\u5728 Usage \u5217\u8868\u4e2d\u7684\u672c\u5730\u8bb0\u5f55\u3002\u5386\u53f2\u6708\u4efd\u6570\u636e\u4e5f\u4f1a\u5728\u6bcf\u6708 1 \u53f7\u540e\u9996\u6b21\u65b0\u5199\u5165\u65e5\u5fd7\u65f6\u81ea\u52a8\u6e05\u7406\u3002",
    manageAdminSecret: "\u7ba1\u7406\u5bc6\u94a5",
    noticeEnvOverride:
      "\u5f53\u524d\u7531\u73af\u5883\u53d8\u91cf\u8986\u76d6\u7684\u9879\uff1a{names}\u3002",
    rateLimitPlaceholder: "\u7559\u7a7a\u5219\u5173\u95ed",
    setupAdminSecret: "\u8bbe\u7f6e\u5bc6\u94a5",
    unsaved: "\u6709\u672a\u4fdd\u5b58\u7684\u4fee\u6539",
    validationAdminSessionTtlDays:
      "Admin \u4f1a\u8bdd\u5929\u6570\u5fc5\u987b\u662f\u5927\u4e8e 0 \u7684\u6574\u6570\uff0c\u6216\u8005\u7559\u7a7a\u3002",
    validationContextCompressionPercent:
      "\u4e0a\u4e0b\u6587\u538b\u7f29\u767e\u5206\u6bd4\u5fc5\u987b\u5728 50 \u5230 95 \u4e4b\u95f4\u3002",
    validationContextKeepRecentTurns:
      "\u4fdd\u7559\u6700\u8fd1\u8f6e\u6b21\u5fc5\u987b\u662f 1 \u5230 20 \u4e4b\u95f4\u7684\u6574\u6570\u3002",
    validationRateLimit:
      "\u9650\u6d41\u79d2\u6570\u5fc5\u987b\u5927\u4e8e 0\uff0c\u6216\u8005\u7559\u7a7a\u3002",
  },
} as const

const { locale, t } = useI18n()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const settingsQuery = useQuery({
  queryKey: adminQueryKeys.settings,
  queryFn: fetchAdminSettings,
})

const loadedState = ref<SettingsSnapshot | null>(null)
const maintenanceBusyKey = ref("")
const saveBusy = ref(false)
const keyActionBusy = ref<"" | "anthropic" | "gateway">("")

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
})

function getCurrentLocale(): "en" | "zh" {
  return locale.value === "zh" ? "zh" : "en"
}

function getLegacySettingsText(
  key: keyof typeof LEGACY_SETTINGS_TEXT.en,
  params?: Record<string, string | number>,
): string {
  let text: string = LEGACY_SETTINGS_TEXT[getCurrentLocale()][key]

  if (!params) {
    return text
  }

  for (const [paramKey, value] of Object.entries(params)) {
    text = text.replace(`{${paramKey}}`, String(value))
  }

  return text
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return Number(trimmed)
}

function readSettingsFormState(): SettingsSnapshot {
  return {
    adminSessionTtlDays: parseNullableNumber(form.adminSessionTtlDays),
    anthropicApiKey: form.anthropicApiKey.trim(),
    authApiKey: form.authApiKey.trim(),
    contextEnabled: form.contextEnabled,
    contextKeepRecentTurns:
      parseNullableNumber(form.contextKeepRecentTurns) ?? 4,
    contextSummarizeAtPercent:
      parseNullableNumber(form.contextSummarizeAtPercent) ?? 80,
    contextSummarizerModel: form.contextSummarizerModel.trim(),
    disableHiddenModels: form.disableHiddenModels,
    rateLimitSeconds: parseNullableNumber(form.rateLimitSeconds),
    rateLimitWait: form.rateLimitWait,
  }
}

function isSameSettingsState(
  left: SettingsSnapshot | null,
  right: SettingsSnapshot | null,
): boolean {
  if (!left || !right) {
    return false
  }

  return left.rateLimitSeconds === right.rateLimitSeconds
    && left.adminSessionTtlDays === right.adminSessionTtlDays
    && left.rateLimitWait === right.rateLimitWait
    && left.contextEnabled === right.contextEnabled
    && left.contextSummarizeAtPercent === right.contextSummarizeAtPercent
    && left.contextKeepRecentTurns === right.contextKeepRecentTurns
    && left.contextSummarizerModel === right.contextSummarizerModel
    && left.disableHiddenModels === right.disableHiddenModels
    && left.anthropicApiKey === right.anthropicApiKey
    && left.authApiKey === right.authApiKey
}

watch(
  () => settingsQuery.data.value,
  (settings) => {
    if (!settings) {
      return
    }

    form.rateLimitSeconds =
      settings.rateLimitSeconds === null ? "" : String(settings.rateLimitSeconds)
    form.adminSessionTtlDays = String(settings.adminSessionTtlDays)
    form.rateLimitWait = settings.rateLimitWait
    form.contextEnabled = settings.contextManagement.enabled
    form.contextSummarizeAtPercent = String(
      settings.contextManagement.summarizeAtPercent ?? 80,
    )
    form.contextKeepRecentTurns = String(
      settings.contextManagement.keepRecentTurns ?? 4,
    )
    form.contextSummarizerModel =
      settings.contextManagement.summarizerModel ?? ""
    form.disableHiddenModels = settings.disableHiddenModels
    form.anthropicApiKey = ""
    form.authApiKey = ""

    loadedState.value = readSettingsFormState()
  },
  {
    immediate: true,
  },
)

const currentState = computed(() => readSettingsFormState())

const isDirty = computed(() =>
  !isSameSettingsState(loadedState.value, currentState.value),
)

const saveDisabled = computed(() =>
  saveBusy.value || keyActionBusy.value !== "" || !loadedState.value || !isDirty.value,
)

const settingsNoticeText = computed(() => {
  if (settingsQuery.isLoading.value && !settingsQuery.data.value) {
    return getLegacySettingsText("loadingSettings")
  }

  if (settingsQuery.isError.value && !settingsQuery.data.value) {
    return getLegacySettingsText("failedLoad")
  }

  const notices = [t("settings.noticeProcessWide")]
  const envOverride = settingsQuery.data.value?.envOverride

  if (envOverride?.rateLimitSeconds || envOverride?.rateLimitWait) {
    const overrideNames = []
    if (envOverride.rateLimitSeconds) {
      overrideNames.push("RATE_LIMIT")
    }
    if (envOverride.rateLimitWait) {
      overrideNames.push("RATE_LIMIT_WAIT")
    }

    notices.push(
      getLegacySettingsText("noticeEnvOverride", {
        names: overrideNames.join(", "),
      }),
    )
  } else {
    notices.push(t("settings.noticeSavedValues"))
  }

  return notices.join(" ")
})

function getAdminSecretSourceLabel(secretSource?: string): string {
  if (secretSource === "env-hash") {
    return getLegacySettingsText("adminSecretSourceEnvHash")
  }

  if (secretSource === "env-secret") {
    return getLegacySettingsText("adminSecretSourceEnv")
  }

  if (secretSource === "config-hash") {
    return getLegacySettingsText("adminSecretSourceConfig")
  }

  return getLegacySettingsText("adminSecretSourceNone")
}

function getAdminHttpsLabel(enforceHttps?: boolean): string {
  return enforceHttps ?
      getLegacySettingsText("adminHttpsRequired")
    : getLegacySettingsText("adminHttpsOptional")
}

const adminSecurityConfigured = computed(() =>
  Boolean(settingsQuery.data.value?.adminAuth.configured),
)

const adminSecurityStatusText = computed(() => {
  if (!settingsQuery.data.value?.adminAuth) {
    return getLegacySettingsText("adminSecurityStatusPending")
  }

  return adminSecurityConfigured.value ?
      getLegacySettingsText("adminSecurityStatusConfigured")
    : getLegacySettingsText("adminSecurityStatusSetupRequired")
})

const adminSecuritySummaryText = computed(() => {
  const adminAuth = settingsQuery.data.value?.adminAuth
  if (!adminAuth) {
    return getLegacySettingsText("adminSecurityLoading")
  }

  return getLegacySettingsText("adminSecuritySummary", {
    https: getAdminHttpsLabel(adminAuth.enforceHttps),
    source: getAdminSecretSourceLabel(adminAuth.secretSource),
  })
})

const manageAdminSecretText = computed(() =>
  adminSecurityConfigured.value ?
      getLegacySettingsText("manageAdminSecret")
    : getLegacySettingsText("setupAdminSecret"),
)

const anthropicApiKeyStatusText = computed(() =>
  settingsQuery.data.value?.hasAnthropicApiKey ?
      getLegacySettingsText("anthropicApiKeyStatusSet")
    : getLegacySettingsText("anthropicApiKeyStatusNotSet"),
)

const gatewayApiKeyStatusText = computed(() =>
  settingsQuery.data.value?.hasAuthApiKey ?
      getLegacySettingsText("gatewayApiKeyStatusSet")
    : getLegacySettingsText("gatewayApiKeyStatusNotSet"),
)

function validateSettingsState(state: SettingsSnapshot): string | null {
  if (
    form.rateLimitSeconds.trim()
    && (!Number.isFinite(state.rateLimitSeconds) || (state.rateLimitSeconds ?? 0) <= 0)
  ) {
    return getLegacySettingsText("validationRateLimit")
  }

  if (
    form.adminSessionTtlDays.trim()
    && (
      !Number.isFinite(state.adminSessionTtlDays)
      || (state.adminSessionTtlDays ?? 0) <= 0
      || !Number.isInteger(state.adminSessionTtlDays)
    )
  ) {
    return getLegacySettingsText("validationAdminSessionTtlDays")
  }

  if (
    form.contextSummarizeAtPercent.trim()
    && (
      !Number.isFinite(state.contextSummarizeAtPercent)
      || state.contextSummarizeAtPercent < 50
      || state.contextSummarizeAtPercent > 95
    )
  ) {
    return getLegacySettingsText("validationContextCompressionPercent")
  }

  if (
    form.contextKeepRecentTurns.trim()
    && (
      !Number.isFinite(state.contextKeepRecentTurns)
      || state.contextKeepRecentTurns < 1
      || state.contextKeepRecentTurns > 20
      || !Number.isInteger(state.contextKeepRecentTurns)
    )
  ) {
    return getLegacySettingsText("validationContextKeepRecentTurns")
  }

  return null
}

async function submit(): Promise<void> {
  if (saveDisabled.value) {
    return
  }

  const snapshot = readSettingsFormState()
  const validationMessage = validateSettingsState(snapshot)
  if (validationMessage) {
    noticeStore.error(validationMessage)
    return
  }

  saveBusy.value = true

  try {
    const payload: Record<string, unknown> = {
      adminSessionTtlDays: snapshot.adminSessionTtlDays,
      contextManagement: {
        enabled: snapshot.contextEnabled,
        keepRecentTurns: snapshot.contextKeepRecentTurns,
        summarizeAtPercent: snapshot.contextSummarizeAtPercent,
        summarizerModel: snapshot.contextSummarizerModel || null,
      },
      disableHiddenModels: snapshot.disableHiddenModels,
      rateLimitSeconds: snapshot.rateLimitSeconds,
      rateLimitWait: snapshot.rateLimitWait,
    }

    if (snapshot.anthropicApiKey !== "") {
      payload.anthropicApiKey = snapshot.anthropicApiKey
    }

    if (snapshot.authApiKey !== "") {
      payload.authApiKey = snapshot.authApiKey
    }

    await updateAdminSettings(payload)
    noticeStore.success(t("settings.saveSuccess"))
    await settingsQuery.refetch()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("settings.saveFailed")))
  } finally {
    saveBusy.value = false
  }
}

async function clearAnthropicApiKey(): Promise<void> {
  const confirmed = globalThis.confirm(
    `${getLegacySettingsText("clearAnthropicApiKeyConfirmTitle")}\n\n${getLegacySettingsText("clearAnthropicApiKeyConfirmMessage")}`,
  )

  if (!confirmed) {
    return
  }

  keyActionBusy.value = "anthropic"

  try {
    await updateAdminSettings({
      clearAnthropicApiKey: true,
    })
    noticeStore.success(t("settings.saveSuccess"))
    await settingsQuery.refetch()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("settings.saveFailed")))
  } finally {
    keyActionBusy.value = ""
  }
}

async function clearAuthApiKey(): Promise<void> {
  const confirmed = globalThis.confirm(
    `${getLegacySettingsText("clearGatewayApiKeyConfirmTitle")}\n\n${getLegacySettingsText("clearGatewayApiKeyConfirmMessage")}`,
  )

  if (!confirmed) {
    return
  }

  keyActionBusy.value = "gateway"

  try {
    await updateAdminSettings({
      clearAuthApiKey: true,
    })
    noticeStore.success(t("settings.saveSuccess"))
    await settingsQuery.refetch()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("settings.saveFailed")))
  } finally {
    keyActionBusy.value = ""
  }
}

async function handleClearUsageLogs(): Promise<void> {
  const confirmed = globalThis.confirm(
    `${getLegacySettingsText("clearCurrentConfirmTitle")}\n\n${getLegacySettingsText("clearCurrentConfirmMessage")}`,
  )

  if (!confirmed) {
    return
  }

  maintenanceBusyKey.value = "clear-current"

  try {
    const payload = await clearUsageLogs()
    noticeStore.success(
      getLegacySettingsText("clearCurrentSuccess", {
        count: payload.deletedCount,
      }),
    )
    await queryClient.invalidateQueries({
      queryKey: ["admin"],
    })
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getLegacySettingsText("clearCurrentFailed")),
    )
  } finally {
    maintenanceBusyKey.value = ""
  }
}

async function handleClearAllUsageLogs(): Promise<void> {
  const confirmed = globalThis.confirm(
    `${getLegacySettingsText("clearAllConfirmTitle")}\n\n${getLegacySettingsText("clearAllConfirmMessage")}`,
  )

  if (!confirmed) {
    return
  }

  maintenanceBusyKey.value = "clear-all"

  try {
    const payload = await clearAllUsageLogs()
    noticeStore.success(
      getLegacySettingsText("clearAllSuccess", {
        count: payload.deletedCount,
      }),
    )
    await queryClient.invalidateQueries({
      queryKey: ["admin"],
    })
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getLegacySettingsText("clearCurrentFailed")),
    )
  } finally {
    maintenanceBusyKey.value = ""
  }
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
          <span class="settings-dirty-indicator" :class="{ active: isDirty }">
            {{ getLegacySettingsText("unsaved") }}
          </span>
          <button
            type="submit"
            class="btn btn-primary btn-sm"
            form="settingsForm"
            :disabled="saveDisabled"
          >
            {{ t("common.save") }}
          </button>
        </div>
      </div>

      <form id="settingsForm" class="settings-form-grid" @submit.prevent="submit">
        <div class="settings-section settings-rate-limit-section">
          <div class="settings-section-title">{{ t("settings.rateLimitSeconds") }}</div>
          <div class="settings-input-row">
            <input
              v-model="form.rateLimitSeconds"
              class="input"
              type="number"
              min="0"
              step="1"
              :placeholder="getLegacySettingsText('rateLimitPlaceholder')"
            >
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
            {{ settingsNoticeText }}
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
              <div class="settings-input-row">
                <input
                  v-model="form.contextSummarizeAtPercent"
                  class="input"
                  type="number"
                  min="50"
                  max="95"
                  step="1"
                  :disabled="!form.contextEnabled"
                  :placeholder="getLegacySettingsText('contextCompressionPercentPlaceholder')"
                >
                <span class="settings-input-unit">%</span>
              </div>
            </label>
            <label class="settings-field">
              <span>{{ t("settings.contextKeepRecentTurns") }}</span>
              <input
                v-model="form.contextKeepRecentTurns"
                class="input"
                type="number"
                min="1"
                max="20"
                step="1"
                :disabled="!form.contextEnabled"
                :placeholder="getLegacySettingsText('contextKeepRecentTurnsPlaceholder')"
              >
            </label>
            <label class="settings-field">
              <span>{{ t("settings.contextSummarizerModel") }}</span>
              <input
                v-model="form.contextSummarizerModel"
                class="input"
                type="text"
                spellcheck="false"
                :disabled="!form.contextEnabled"
                :placeholder="getLegacySettingsText('contextCompressionModelPlaceholder')"
              >
            </label>
          </div>
          <p class="hint">{{ t("settings.contextCompressionCostHint") }}</p>
        </div>

        <div class="settings-section settings-key-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.anthropicApiKey") }}</div>
            <span
              class="settings-status-badge"
              :class="{ 'is-set': settingsQuery.data.value?.hasAnthropicApiKey }"
            >
              {{ anthropicApiKeyStatusText }}
            </span>
          </div>
          <div class="settings-input-row">
            <input
              v-model="form.anthropicApiKey"
              class="input"
              type="password"
              autocomplete="off"
              spellcheck="false"
              :placeholder="getLegacySettingsText('anthropicApiKeyPlaceholder')"
            >
            <button
              type="button"
              class="btn settings-inline-btn"
              :disabled="saveBusy || maintenanceBusyKey !== '' || keyActionBusy !== ''"
              @click="clearAnthropicApiKey"
            >
              {{ t("settings.clearAnthropicApiKey") }}
            </button>
          </div>
          <p class="hint">{{ getLegacySettingsText("anthropicApiKeyHint") }}</p>
        </div>

        <div class="settings-section settings-key-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.gatewayApiKey") }}</div>
            <span
              class="settings-status-badge"
              :class="{ 'is-set': settingsQuery.data.value?.hasAuthApiKey }"
            >
              {{ gatewayApiKeyStatusText }}
            </span>
          </div>
          <div class="settings-input-row">
            <input
              v-model="form.authApiKey"
              class="input"
              type="password"
              autocomplete="off"
              spellcheck="false"
              :placeholder="getLegacySettingsText('gatewayApiKeyPlaceholder')"
            >
            <button
              type="button"
              class="btn settings-inline-btn"
              :disabled="saveBusy || maintenanceBusyKey !== '' || keyActionBusy !== ''"
              @click="clearAuthApiKey"
            >
              {{ t("settings.clearGatewayApiKey") }}
            </button>
          </div>
          <p class="hint">{{ getLegacySettingsText("gatewayApiKeyHint") }}</p>
        </div>

        <div class="settings-section settings-admin-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.securityTitle") }}</div>
            <div class="settings-title-actions">
              <span
                class="settings-status-badge"
                :class="{ 'is-set': adminSecurityConfigured, 'is-unset': !adminSecurityConfigured }"
              >
                {{ adminSecurityStatusText }}
              </span>
              <RouterLink class="btn settings-inline-btn btn-sm" to="/setup">
                {{ manageAdminSecretText }}
              </RouterLink>
            </div>
          </div>
          <div class="settings-security-meta">
            <p class="hint settings-security-summary">
              {{ adminSecuritySummaryText }}
            </p>
            <div class="settings-input-row">
              <input
                v-model="form.adminSessionTtlDays"
                class="input"
                type="number"
                min="1"
                step="1"
                :placeholder="getLegacySettingsText('adminSessionTtlDaysPlaceholder')"
              >
              <span class="settings-input-unit">{{ t("settings.daysUnit") }}</span>
            </div>
            <p class="hint">{{ getLegacySettingsText("adminSessionTtlDaysHint") }}</p>
          </div>
        </div>

        <div class="settings-section settings-maintenance-section">
          <div class="settings-title-row">
            <div class="settings-section-title">{{ t("settings.usageLogMaintenance") }}</div>
            <div class="settings-title-actions">
              <button
                type="button"
                class="btn settings-inline-btn btn-sm"
                :disabled="saveBusy || maintenanceBusyKey !== '' || keyActionBusy !== ''"
                @click="handleClearUsageLogs"
              >
                {{ getLegacySettingsText("clearCurrent") }}
              </button>
              <button
                type="button"
                class="btn btn-danger settings-inline-btn btn-sm"
                :disabled="saveBusy || maintenanceBusyKey !== '' || keyActionBusy !== ''"
                @click="handleClearAllUsageLogs"
              >
                {{ getLegacySettingsText("clearAll") }}
              </button>
            </div>
          </div>
          <p class="hint">{{ getLegacySettingsText("maintenanceHint") }}</p>
        </div>
      </form>
    </div>
  </div>
</template>
