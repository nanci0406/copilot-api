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

const busyKey = ref("")

const visibilityFilter = computed({
  get() {
    return route.query.visibility === "hidden" || route.query.visibility === "visible" ?
        route.query.visibility
      : "all"
  },
  set(value: "all" | "hidden" | "visible") {
    void router.replace({
      query: {
        ...route.query,
        visibility: value === "all" ? undefined : value,
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

    if (visibilityFilter.value === "visible") {
      return !model.hidden
    }

    return true
  }),
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
</script>

<template>
  <div class="tab-content active">
    <div class="card">
      <div class="card-header models-card-header">
        <span class="card-title">{{ t("models.availableModels") }}</span>
        <div class="models-header-actions">
          <label class="models-header-policy-toggle">
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

          <select
            class="select"
            :value="visibilityFilter"
            @change="visibilityFilter = ($event.target as HTMLSelectElement).value as 'all' | 'hidden' | 'visible'"
          >
            <option value="all">{{ t("models.filterAll") }}</option>
            <option value="visible">{{ t("models.filterVisible") }}</option>
            <option value="hidden">{{ t("models.filterHidden") }}</option>
          </select>
          <button type="button" class="btn btn-sm refresh-btn" @click="refreshAll">
            {{ t("common.refresh") }}
          </button>
        </div>
      </div>

      <div v-if="modelsQuery.isLoading.value || premiumQuery.isLoading.value" class="empty-state">
        {{ t("common.loading") }}
      </div>
      <div v-else-if="filteredModels.length === 0" class="empty-state">
        {{ t("models.empty") }}
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
            <div class="model-meta-row">
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
