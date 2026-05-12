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
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t("models.title") }}</h1>
        <p class="page-subtitle">{{ t("models.subtitle") }}</p>
      </div>

      <button type="button" class="btn btn-ghost" @click="refreshAll">
        {{ t("common.refresh") }}
      </button>
    </div>

    <div class="page-section toolbar-row">
      <label class="field compact-field">
        <span>{{ t("models.visibilityFilter") }}</span>
        <select
          :value="visibilityFilter"
          @change="visibilityFilter = ($event.target as HTMLSelectElement).value as 'all' | 'hidden' | 'visible'"
        >
          <option value="all">{{ t("models.filterAll") }}</option>
          <option value="visible">{{ t("models.filterVisible") }}</option>
          <option value="hidden">{{ t("models.filterHidden") }}</option>
        </select>
      </label>

      <label class="toggle-field">
        <input
          type="checkbox"
          :checked="settingsQuery.data.value?.disableHiddenModels ?? false"
          :disabled="busyKey === 'disable-hidden'"
          @change="updateDisableHiddenModels(($event.target as HTMLInputElement).checked)"
        >
        <span>{{ t("models.disableHiddenModels") }}</span>
      </label>
    </div>

    <div v-if="modelsQuery.isLoading.value || premiumQuery.isLoading.value" class="empty-state">
      {{ t("common.loading") }}
    </div>
    <div v-else-if="filteredModels.length === 0" class="empty-state">
      {{ t("models.empty") }}
    </div>
    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t("models.model") }}</th>
            <th>{{ t("models.provider") }}</th>
            <th>{{ t("models.contextWindow") }}</th>
            <th>{{ t("models.features") }}</th>
            <th>{{ t("models.multiplier") }}</th>
            <th>{{ t("models.reasoningEffort") }}</th>
            <th>{{ t("models.visibility") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredModels" :key="row.id">
            <td>
              <div class="table-title">{{ row.displayName }}</div>
              <div class="table-subtitle">{{ row.id }}</div>
            </td>
            <td>{{ row.ownedBy }}</td>
            <td>{{ row.contextWindowTokens ? formatNumber(row.contextWindowTokens) : "--" }}</td>
            <td>
              <div class="tag-list">
                <span v-for="feature in row.features" :key="feature" class="tag">
                  {{ feature }}
                </span>
                <span v-if="row.features.length === 0" class="table-subtitle">--</span>
              </div>
            </td>
            <td>
              <input
                class="table-input"
                type="number"
                min="0"
                step="0.01"
                :value="row.multiplier"
                :disabled="busyKey === `multiplier:${row.id}`"
                @change="handleMultiplierChange(row.id, ($event.target as HTMLInputElement).value)"
              >
            </td>
            <td>
              <select
                class="table-input"
                :value="row.reasoningEffort ?? ''"
                :disabled="row.supportedEfforts.length === 0 || busyKey === `reasoning:${row.id}`"
                @change="handleReasoningChange(row.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="effort in row.supportedEfforts" :key="effort" :value="effort">
                  {{ effort }}
                </option>
              </select>
            </td>
            <td>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                :disabled="busyKey === `visibility:${row.id}`"
                @click="toggleHiddenModel(row.id, row.hidden)"
              >
                {{ row.hidden ? t("models.hidden") : t("models.visible") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
