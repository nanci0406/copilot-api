<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, nextTick, ref, type ComponentPublicInstance } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import { fetchAccounts } from "@/api/accounts"
import {
  deletePremiumMultiplier,
  fetchAdminModels,
  fetchPremiumConfig,
  saveModelVisibility,
  savePremiumMultiplier,
  saveReasoningEffort,
} from "@/api/models"
import { fetchAdminSettings, updateAdminSettings } from "@/api/settings"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"
import { formatNumber } from "@/utils/format"

type VisibilityFilter = "hidden" | "visible"
type ProviderKey = "claude" | "google" | "grok" | "openai" | "other"

interface ModelRow {
  contextWindowTokens: number | null
  features: Array<string>
  hidden: boolean
  id: string
  multiplier: number
  reasoningEffort: string | null
  supportedEfforts: Array<string>
}

const MODELS_COLLAPSED_STORAGE_KEY = "copilot-admin-models-collapsed"

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const modelsQuery = useQuery({
  queryKey: adminQueryKeys.models,
  queryFn: fetchAdminModels,
})
const premiumQuery = useQuery({
  queryKey: adminQueryKeys.premiumConfig,
  queryFn: fetchPremiumConfig,
})
const settingsQuery = useQuery({
  queryKey: adminQueryKeys.settings,
  queryFn: fetchAdminSettings,
})
const accountsQuery = useQuery({
  queryKey: adminQueryKeys.accounts,
  queryFn: fetchAccounts,
})

const busyKey = ref("")
const editingMultiplierDraft = ref("")
const editingMultiplierId = ref("")
const modelManageMode = ref(false)
const collapsedProviders = ref(loadCollapsedProviders())
const multiplierInputRefs = new Map<string, HTMLInputElement>()
const skipMultiplierSaveId = ref("")

const visibilityFilter = computed<VisibilityFilter>({
  get() {
    return route.query.visibility === "hidden" ? "hidden" : "visible"
  },
  set(value) {
    void router.replace({
      query: {
        ...route.query,
        visibility: value === "hidden" ? "hidden" : undefined,
      },
    })
  },
})

const modelRows = computed<Array<ModelRow>>(() => {
  const models = modelsQuery.data.value?.data ?? []
  const premium = premiumQuery.data.value

  return models.map((model) => {
    const metadata = premium?.modelCardMetadata[model.id]

    return {
      contextWindowTokens: metadata?.contextWindowTokens ?? null,
      features: metadata?.features ?? [],
      hidden: premium?.hiddenModels.includes(model.id) ?? false,
      id: model.id,
      multiplier: premium?.multipliers[model.id] ?? 0,
      reasoningEffort: premium?.reasoningEfforts[model.id] ?? null,
      supportedEfforts:
        premium?.modelSupportedReasoningEfforts[model.id] ?? [],
    }
  })
})

const filteredModels = computed(() =>
  modelRows.value.filter((model) =>
    visibilityFilter.value === "hidden" ? model.hidden : !model.hidden,
  ),
)

const providerGroups = computed(() => {
  const grouped = new Map<ProviderKey, Array<ModelRow>>([
    ["claude", []],
    ["google", []],
    ["openai", []],
    ["grok", []],
    ["other", []],
  ])

  for (const row of filteredModels.value) {
    grouped.get(getProviderKey(row.id))?.push(row)
  }

  const providerOrder: Array<ProviderKey> = [
    "claude",
    "google",
    "openai",
    "grok",
    "other",
  ]

  return providerOrder
    .map((providerKey) => {
      const rows = grouped.get(providerKey) ?? []
      if (rows.length === 0) {
        return null
      }

      const sortedRows = [...rows].sort(compareModelRows)
      const premiumCount = sortedRows.filter((row) => row.multiplier >= 1).length

      return {
        collapsed: collapsedProviders.value.has(providerKey),
        countLabel: formatProviderCountLabel(sortedRows.length),
        models: sortedRows,
        premiumCount,
        providerKey,
        title: getProviderLabel(providerKey),
      }
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
})

const hasConfiguredAccounts = computed(
  () => (accountsQuery.data.value?.accounts.length ?? 0) > 0,
)

function getModelText(
  key:
    | "copyNameFailed"
    | "copyNameHint"
    | "copyNameSuccess"
    | "collapse"
    | "expand"
    | "featureEmbeddings"
    | "featureNone"
    | "featureTools"
    | "featureVision"
    | "failedSaveMultiplier"
    | "failedSaveReasoningEffort"
    | "failedSaveVisibility"
    | "free"
    | "hide"
    | "invalidMultiplier"
    | "na"
    | "premium"
    | "show",
): string {
  const messages =
    locale.value === "zh" ?
      {
        copyNameFailed: "复制模型名失败",
        copyNameHint: "点击复制完整模型名",
        copyNameSuccess: "已复制完整模型名",
        collapse: "收起",
        expand: "展开",
        featureEmbeddings: "向量嵌入",
        featureNone: "无",
        featureTools: "工具",
        featureVision: "视觉",
        failedSaveMultiplier: "保存倍率失败",
        failedSaveReasoningEffort: "保存推理强度失败",
        failedSaveVisibility: "更新模型显隐失败",
        free: "免费",
        hide: "隐藏",
        invalidMultiplier: "倍率必须是大于等于 0 的数字",
        na: "无",
        premium: "高级",
        show: "显示",
      }
    : {
        copyNameFailed: "Failed to copy model name.",
        copyNameHint: "Click to copy the full model name",
        copyNameSuccess: "Copied full model name",
        collapse: "Collapse",
        expand: "Expand",
        featureEmbeddings: "embeddings",
        featureNone: "None",
        featureTools: "tools",
        featureVision: "vision",
        failedSaveMultiplier: "Failed to save multiplier.",
        failedSaveReasoningEffort: "Failed to save reasoning effort.",
        failedSaveVisibility: "Failed to update model visibility.",
        free: "Free",
        hide: "Hide",
        invalidMultiplier: "Multiplier must be a number greater than or equal to 0.",
        na: "N/A",
        premium: "Premium",
        show: "Show",
      }

  return messages[key]
}

function getReasoningOptionLabel(effort: string): string {
  const labelMap =
    locale.value === "zh" ?
      {
        high: "高",
        low: "低",
        medium: "中",
        minimal: "极低",
        none: "无",
        xhigh: "超高",
      }
    : {
        high: "High",
        low: "Low",
        medium: "Medium",
        minimal: "Minimal",
        none: "None",
        xhigh: "XHigh",
      }

  return labelMap[effort as keyof typeof labelMap] ?? effort
}

async function refreshAll(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["admin"],
  })
}

async function handleMultiplierSave(modelId: string): Promise<void> {
  if (
    editingMultiplierId.value !== modelId
    || busyKey.value === `multiplier:${modelId}`
  ) {
    return
  }

  if (skipMultiplierSaveId.value === modelId) {
    skipMultiplierSaveId.value = ""
    return
  }

  const rawValue = editingMultiplierDraft.value.trim()
  busyKey.value = `multiplier:${modelId}`

  try {
    if (!rawValue) {
      await deletePremiumMultiplier(modelId)
    } else {
      const parsed = Number(rawValue)
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(getModelText("invalidMultiplier"))
      }

      await savePremiumMultiplier(modelId, parsed)
    }

    editingMultiplierId.value = ""
    editingMultiplierDraft.value = ""
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getModelText("failedSaveMultiplier")),
    )
  } finally {
    busyKey.value = ""
  }
}

function cancelMultiplierEdit(): void {
  skipMultiplierSaveId.value = editingMultiplierId.value
  editingMultiplierId.value = ""
  editingMultiplierDraft.value = ""
}

async function startMultiplierEdit(modelId: string, multiplier: number): Promise<void> {
  if (busyKey.value) {
    return
  }

  editingMultiplierId.value = modelId
  editingMultiplierDraft.value = String(multiplier)

  await nextTick()
  const input = multiplierInputRefs.get(modelId)
  input?.focus()
  input?.select()
}

function setMultiplierInputRef(
  modelId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLInputElement) {
    multiplierInputRefs.set(modelId, element)
    return
  }

  multiplierInputRefs.delete(modelId)
}

async function handleReasoningChange(modelId: string, effort: string): Promise<void> {
  busyKey.value = `reasoning:${modelId}`

  try {
    await saveReasoningEffort(modelId, effort)
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getModelText("failedSaveReasoningEffort")),
    )
  } finally {
    busyKey.value = ""
  }
}

async function toggleHiddenModel(modelId: string, currentlyHidden: boolean): Promise<void> {
  busyKey.value = `visibility:${modelId}`

  try {
    await saveModelVisibility(modelId, !currentlyHidden)
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getModelText("failedSaveVisibility")),
    )
  } finally {
    busyKey.value = ""
  }
}

async function updateDisableHiddenModels(enabled: boolean): Promise<void> {
  busyKey.value = "disable-hidden"

  try {
    await updateAdminSettings({
      disableHiddenModels: enabled,
    })
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("models.saveFailed")))
  } finally {
    busyKey.value = ""
  }
}

function toggleVisibilityFilter(): void {
  visibilityFilter.value =
    visibilityFilter.value === "hidden" ? "visible" : "hidden"
}

function toggleProviderCollapse(providerKey: ProviderKey): void {
  const next = new Set(collapsedProviders.value)

  if (next.has(providerKey)) {
    next.delete(providerKey)
  } else {
    next.add(providerKey)
  }

  collapsedProviders.value = next
  persistCollapsedProviders(next)
}

async function copyModelName(modelId: string): Promise<void> {
  try {
    await copyTextToClipboard(modelId)
    noticeStore.success(getModelText("copyNameSuccess"))
  } catch (error) {
    noticeStore.error(getErrorMessage(error, getModelText("copyNameFailed")))
  }
}

function loadCollapsedProviders(): Set<ProviderKey> {
  if (typeof window === "undefined") {
    return new Set()
  }

  try {
    const rawValue = window.localStorage.getItem(MODELS_COLLAPSED_STORAGE_KEY)
    if (!rawValue) {
      return new Set()
    }

    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return new Set()
    }

    return new Set(
      parsed.filter(
        (value): value is ProviderKey =>
          value === "claude"
          || value === "google"
          || value === "grok"
          || value === "openai"
          || value === "other",
      ),
    )
  } catch {
    return new Set()
  }
}

function persistCollapsedProviders(value: Set<ProviderKey>): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    MODELS_COLLAPSED_STORAGE_KEY,
    JSON.stringify(Array.from(value)),
  )
}

function getProviderKey(modelId: string): ProviderKey {
  const normalized = modelId.trim().toLowerCase()

  if (
    normalized.startsWith("gpt-")
    || normalized.startsWith("o1")
    || normalized.startsWith("o3")
    || normalized.startsWith("o4")
    || normalized.startsWith("text-embedding-")
  ) {
    return "openai"
  }

  if (normalized.startsWith("claude-")) {
    return "claude"
  }

  if (normalized.startsWith("gemini-")) {
    return "google"
  }

  if (normalized.startsWith("grok-")) {
    return "grok"
  }

  return "other"
}

function getProviderLabel(providerKey: ProviderKey): string {
  if (providerKey === "openai") {
    return "OpenAI"
  }

  if (providerKey === "claude") {
    return "Claude"
  }

  if (providerKey === "google") {
    return "Google"
  }

  if (providerKey === "grok") {
    return "Grok"
  }

  return locale.value === "zh" ? "其他" : "Other"
}

function formatProviderCountLabel(count: number): string {
  if (locale.value === "zh") {
    return `共 ${formatNumber(count)}`
  }

  return `${formatNumber(count)} models`
}

function formatContextWindow(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return getModelText("na")
  }

  if (value >= 1_000_000) {
    const scaled = value / 1_000_000
    const formatted = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}M`
  }

  if (value >= 1_000) {
    const scaled = value / 1_000
    const formatted = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}K`
  }

  return formatNumber(value)
}

function toFeatureKey(feature: string): "embeddings" | "tools" | "vision" | null {
  const normalized = feature.trim().toLowerCase()

  if (normalized === "tool calls" || normalized === "parallel tool calls") {
    return "tools"
  }

  if (normalized === "vision") {
    return "vision"
  }

  if (normalized === "embeddings") {
    return "embeddings"
  }

  return null
}

function formatModelFeatures(features: Array<string>): string {
  const resolved = new Set(
    features
      .map((feature) => toFeatureKey(feature))
      .filter((feature): feature is NonNullable<typeof feature> => feature !== null),
  )

  const simplified = [
    ...(resolved.has("tools") ? [getModelText("featureTools")] : []),
    ...(resolved.has("vision") ? [getModelText("featureVision")] : []),
    ...(resolved.has("embeddings") ?
        [getModelText("featureEmbeddings")]
      : []),
  ]

  if (simplified.length === 0) {
    return getModelText("featureNone")
  }

  return simplified.join(locale.value === "zh" ? "、" : ", ")
}

function formatMultiplierLabel(multiplier: number): string {
  if (multiplier <= 0) {
    return getModelText("free")
  }

  return `x${Number.isInteger(multiplier) ? multiplier : String(multiplier)}`
}

function compareModelRows(left: ModelRow, right: ModelRow): number {
  const leftIsPremium = left.multiplier >= 1
  const rightIsPremium = right.multiplier >= 1

  if (leftIsPremium !== rightIsPremium) {
    return leftIsPremium ? -1 : 1
  }

  return right.id.localeCompare(left.id, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back to execCommand when clipboard access is blocked.
    }
  }

  const textarea = document.createElement("textarea")
  const previousActiveElement =
    document.activeElement instanceof HTMLElement ?
      document.activeElement
    : null

  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.setAttribute("aria-hidden", "true")
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  textarea.style.left = "-1000px"

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  let copied = false

  try {
    copied = document.execCommand("copy")
  } finally {
    document.body.removeChild(textarea)
    previousActiveElement?.focus()
  }

  if (!copied) {
    throw new Error("copy failed")
  }
}
</script>

<template>
  <div id="tab-models" class="tab-content active">
    <div class="card">
      <div class="card-header models-card-header">
        <span class="card-title">{{ t("models.availableModels") }}</span>
        <div class="models-header-actions">
          <label
            class="models-header-policy-toggle"
            :hidden="visibilityFilter !== 'hidden'"
          >
            <span class="models-header-policy-copy">
              <span class="models-header-policy-title">
                {{ t("models.disableHiddenModels") }}
              </span>
            </span>
            <span class="settings-switch">
              <input
                type="checkbox"
                :checked="settingsQuery.data.value?.disableHiddenModels ?? false"
                :disabled="busyKey === 'disable-hidden'"
                @change="updateDisableHiddenModels(($event.target as HTMLInputElement).checked)"
              >
              <span class="settings-switch-slider" />
            </span>
          </label>

          <button
            type="button"
            class="btn btn-sm models-action-btn model-visibility-toggle"
            @click="toggleVisibilityFilter"
          >
            <span class="models-action-icon">
              <svg
                v-if="visibilityFilter === 'hidden'"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 3c1.2 0 2.3.25 3.28.7l-1.09 1.1A6.4 6.4 0 0 0 8 4.3c-2.9 0-4.78 1.74-5.9 3.7a.8.8 0 0 0 0 .78c.45.8 1.05 1.57 1.84 2.22l1.07-1.07a2.94 2.94 0 0 1-.2-1.05A3.2 3.2 0 0 1 5.2 7.3L1.57 3.66A.75.75 0 1 1 2.63 2.6l11.8 11.8a.75.75 0 1 1-1.06 1.06l-1.48-1.48A7.3 7.3 0 0 1 8 13C4.5 13 2.3 10.8 1.2 8.8a1.6 1.6 0 0 1 0-1.6C2.3 5.2 4.5 3 8 3Zm0 2.8a2.2 2.2 0 0 0-1.52 3.79l3.11-3.11A2.2 2.2 0 0 0 8 5.8Zm2.4 2.4-3.1 3.1c.22.06.46.1.7.1a2.2 2.2 0 0 0 2.2-2.2c0-.24-.03-.47-.1-.7Z" />
              </svg>
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 3C4.5 3 2.3 5.2 1.2 7.2a1.6 1.6 0 0 0 0 1.6C2.3 10.8 4.5 13 8 13s5.7-2.2 6.8-4.2a1.6 1.6 0 0 0 0-1.6C13.7 5.2 11.5 3 8 3Zm0 8.7A3.7 3.7 0 1 1 8 4.3a3.7 3.7 0 0 1 0 7.4Zm0-5.9a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" />
              </svg>
            </span>
            <span>
              {{ visibilityFilter === "hidden" ? t("models.filterHidden") : t("models.filterVisible") }}
            </span>
          </button>

          <button
            type="button"
            class="btn btn-sm models-action-btn"
            :class="{ 'btn-primary': modelManageMode }"
            @click="modelManageMode = !modelManageMode"
          >
            <span class="models-action-icon">
              <svg
                v-if="modelManageMode"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L6.75 10.19l5.97-5.97a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 2.75Zm-2 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75Zm2 5A.75.75 0 0 1 3.75 12h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 12.75Z" />
              </svg>
            </span>
            <span>{{ modelManageMode ? t("models.manageDone") : t("models.manage") }}</span>
          </button>

          <button
            type="button"
            class="btn btn-sm models-action-btn refresh-btn"
            @click="refreshAll"
          >
            <span class="models-action-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.5 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
              </svg>
            </span>
            <span>{{ t("common.refresh") }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="
          accountsQuery.isLoading.value ||
            (hasConfiguredAccounts &&
              (modelsQuery.isLoading.value || premiumQuery.isLoading.value))
        "
        class="empty-state"
      >
        {{ t("models.loadingModels") }}
      </div>
      <div v-else-if="!hasConfiguredAccounts" class="empty-state">
        {{ t("models.noModels") }}
      </div>
      <div v-else-if="modelsQuery.isError.value || premiumQuery.isError.value" class="empty-state">
        {{ t("models.saveFailed") }}
      </div>
      <div v-else-if="providerGroups.length === 0" class="empty-state">
        {{ visibilityFilter === "hidden" ? t("models.noHiddenModels") : t("models.noVisibleModels") }}
      </div>
      <div v-else class="model-groups">
        <section
          v-for="group in providerGroups"
          :key="group.providerKey"
          class="provider-group"
          :class="`provider-${group.providerKey}`"
        >
          <div class="provider-group-header">
            <div class="provider-group-title-wrap">
              <span class="provider-group-title">{{ group.title }}</span>
              <span class="provider-group-count">{{ group.countLabel }}</span>
            </div>
            <div class="provider-group-stats">
              <span class="provider-stat provider-stat-premium">
                {{ `${getModelText("premium")} ${formatNumber(group.premiumCount)}` }}
              </span>
              <button
                type="button"
                class="provider-toggle-btn"
                @click="toggleProviderCollapse(group.providerKey)"
              >
                {{ group.collapsed ? getModelText("expand") : getModelText("collapse") }}
              </button>
            </div>
          </div>

          <div class="models-grid" :class="{ 'provider-models-collapsed': group.collapsed }">
            <article
              v-for="row in group.models"
              :key="row.id"
              class="model-card"
              :class="{ 'hidden-model': row.hidden }"
            >
              <div class="model-top">
                <div
                  class="model-name"
                  role="button"
                  tabindex="0"
                  :title="`${row.id} - ${getModelText('copyNameHint')}`"
                  :aria-label="`${getModelText('copyNameHint')}: ${row.id}`"
                  @click="copyModelName(row.id)"
                  @keydown.enter.prevent="copyModelName(row.id)"
                  @keydown.space.prevent="copyModelName(row.id)"
                >
                  {{ row.id }}
                </div>
                <div class="model-right">
                  <button
                    v-if="modelManageMode"
                    type="button"
                    class="model-visibility-action-btn"
                    :class="{ show: row.hidden }"
                    :disabled="busyKey === `visibility:${row.id}`"
                    @click="toggleHiddenModel(row.id, row.hidden)"
                  >
                    {{ row.hidden ? getModelText("show") : getModelText("hide") }}
                  </button>
                  <span v-if="row.multiplier >= 1" class="model-premium-badge">
                    {{ getModelText("premium") }}
                  </span>
                  <span
                    class="model-multiplier"
                    :class="{
                      editing: editingMultiplierId === row.id,
                      free: row.multiplier <= 0,
                      paid: row.multiplier > 0,
                    }"
                    @dblclick="startMultiplierEdit(row.id, row.multiplier)"
                  >
                    <input
                      v-if="editingMultiplierId === row.id"
                      :ref="(element) => setMultiplierInputRef(row.id, element)"
                      v-model="editingMultiplierDraft"
                      class="model-multiplier-input"
                      type="number"
                      min="0"
                      step="0.01"
                      :disabled="busyKey === `multiplier:${row.id}`"
                      @blur="handleMultiplierSave(row.id)"
                      @keydown.enter.prevent="handleMultiplierSave(row.id)"
                      @keydown.escape.prevent="cancelMultiplierEdit"
                    >
                    <template v-else>
                      {{ formatMultiplierLabel(row.multiplier) }}
                    </template>
                  </span>
                </div>
              </div>

              <div class="model-meta">
                <div class="model-meta-row">
                  <span class="model-meta-group model-meta-group-left">
                    <span class="model-meta-label">{{ t("models.features") }}</span>
                    <span class="model-meta-value">{{ formatModelFeatures(row.features) }}</span>
                  </span>
                  <span class="model-meta-group model-meta-group-right">
                    <label v-if="row.supportedEfforts.length > 0" class="model-reasoning-wrap">
                      <select
                        class="model-reasoning-select"
                        :value="row.reasoningEffort ?? row.supportedEfforts[0]"
                        :disabled="busyKey === `reasoning:${row.id}`"
                        @change="handleReasoningChange(row.id, ($event.target as HTMLSelectElement).value)"
                      >
                        <option v-for="effort in row.supportedEfforts" :key="effort" :value="effort">
                          {{ getReasoningOptionLabel(effort) }}
                        </option>
                      </select>
                    </label>
                    <span class="model-meta-label">{{ t("models.contextWindow") }}</span>
                    <span class="model-meta-value">{{ formatContextWindow(row.contextWindowTokens) }}</span>
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
