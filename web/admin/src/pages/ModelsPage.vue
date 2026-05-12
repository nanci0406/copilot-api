<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import {
  deletePremiumMultiplier,
  fetchAdminModels,
  fetchPremiumConfig,
  saveModelVisibility,
  savePremiumMultiplier,
  saveReasoningEffort,
} from "@/api/models"
import { fetchAccounts } from "@/api/accounts"
import { fetchAdminSettings, updateAdminSettings } from "@/api/settings"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"
import { formatNumber } from "@/utils/format"

const { t } = useI18n()
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
const modelManageMode = ref(false)

const visibilityFilter = computed({
  get() {
    return route.query.visibility === "hidden" ?
        route.query.visibility
      : "visible"
  },
  set(value: "hidden" | "visible") {
    void router.replace({
      query: {
        ...route.query,
        visibility: value === "hidden" ? "hidden" : undefined,
      },
    })
  },
})

const modelRows = computed(() => {
  const list = modelsQuery.data.value?.data ?? []
  const premium = premiumQuery.data.value

  return list.map((model) => {
    const hidden = premium?.hiddenModels.includes(model.id) ?? false
    const metadata = premium?.modelCardMetadata[model.id]
    const supportedEfforts =
      premium?.modelSupportedReasoningEfforts[model.id] ?? []

    return {
      contextWindowTokens: metadata?.contextWindowTokens ?? null,
      displayName: model.display_name,
      features: metadata?.features ?? [],
      hidden,
      id: model.id,
      multiplier: premium?.multipliers[model.id] ?? 0,
      ownedBy: model.owned_by,
      reasoningEffort: premium?.reasoningEfforts[model.id] ?? null,
      supportedEfforts,
    }
  })
})

const filteredModels = computed(() =>
  modelRows.value.filter((model) => {
    if (visibilityFilter.value === "hidden") {
      return model.hidden
    }

    return !model.hidden
  }),
)
const hasConfiguredAccounts = computed(
  () => (accountsQuery.data.value?.accounts.length ?? 0) > 0,
)

async function refreshAll(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["admin"],
  })
}

async function handleMultiplierChange(modelId: string, rawValue: string): Promise<void> {
  busyKey.value = `multiplier:${modelId}`

  try {
    if (!rawValue.trim()) {
      await deletePremiumMultiplier(modelId)
    } else {
      await savePremiumMultiplier(modelId, Number(rawValue))
    }

    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("models.saveFailed")))
  } finally {
    busyKey.value = ""
  }
}

async function handleReasoningChange(modelId: string, effort: string): Promise<void> {
  busyKey.value = `reasoning:${modelId}`

  try {
    await saveReasoningEffort(modelId, effort)
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("models.saveFailed")))
  } finally {
    busyKey.value = ""
  }
}

async function toggleHiddenModel(modelId: string, hidden: boolean): Promise<void> {
  busyKey.value = `visibility:${modelId}`

  try {
    await saveModelVisibility(modelId, !hidden)
    noticeStore.success(t("models.saveSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("models.saveFailed")))
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

          <button type="button" class="btn btn-sm models-action-btn refresh-btn" @click="refreshAll">
            <span class="models-action-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
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
        {{ t("models.failedLoad") }}
      </div>
      <div v-else-if="filteredModels.length === 0" class="empty-state">
        {{ visibilityFilter === "hidden" ? t("models.noHiddenModels") : t("models.noVisibleModels") }}
      </div>
      <div v-else class="models-grid">
        <article
          v-for="row in filteredModels"
          :key="row.id"
          class="model-card"
          :class="{ 'hidden-model': row.hidden }"
        >
          <div class="model-top">
            <div class="model-name" :title="row.id">
              {{ row.displayName || row.id }}
            </div>
            <div class="model-right">
              <span
                class="model-multiplier"
                :class="row.multiplier > 0 ? 'paid' : 'free'"
                :title="t('models.multiplier')"
              >
                {{ row.multiplier || 0 }}x
              </span>
              <button
                v-if="modelManageMode"
                type="button"
                class="model-visibility-action-btn"
                :class="{ show: row.hidden }"
                :disabled="busyKey === `visibility:${row.id}`"
                @click="toggleHiddenModel(row.id, row.hidden)"
              >
                {{ row.hidden ? t("models.hidden") : t("models.visible") }}
              </button>
            </div>
          </div>

          <div class="model-meta">
            <div v-if="modelManageMode" class="model-meta-row">
              <span class="model-meta-group model-meta-group-left">
                <span class="model-meta-label">{{ t("models.provider") }}</span>
                <span class="model-meta-value">{{ row.ownedBy }}</span>
              </span>
              <span class="model-meta-group model-meta-group-right">
                <span class="model-meta-label">{{ t("models.contextWindow") }}</span>
                <span class="model-meta-value">
                  {{ row.contextWindowTokens ? formatNumber(row.contextWindowTokens) : "--" }}
                </span>
              </span>
            </div>
            <div class="model-meta-row">
              <span class="model-meta-group model-meta-group-left">
                <span class="model-meta-label">ID</span>
                <span class="model-meta-value">{{ row.id }}</span>
              </span>
            </div>
            <div class="model-meta-row">
              <span class="model-meta-group model-meta-group-left">
                <span class="model-meta-label">{{ t("models.features") }}</span>
                <span class="model-meta-value">
                  {{ row.features.length ? row.features.join(", ") : "--" }}
                </span>
              </span>
            </div>
            <div class="model-meta-row">
              <input
                class="model-multiplier-input"
                type="number"
                min="0"
                step="0.01"
                :value="row.multiplier"
                :disabled="busyKey === `multiplier:${row.id}`"
                @change="handleMultiplierChange(row.id, ($event.target as HTMLInputElement).value)"
              >
              <select
                class="model-reasoning-select"
                :value="row.reasoningEffort ?? ''"
                :disabled="row.supportedEfforts.length === 0 || busyKey === `reasoning:${row.id}`"
                @change="handleReasoningChange(row.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="effort in row.supportedEfforts" :key="effort" :value="effort">
                  {{ effort }}
                </option>
              </select>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
