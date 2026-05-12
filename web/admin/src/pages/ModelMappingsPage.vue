<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import { fetchModelMappings, saveModelMapping, deleteModelMapping } from "@/api/mappings"
import { fetchAdminModels, fetchPremiumConfig } from "@/api/models"
import { fetchAdminSettings } from "@/api/settings"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"

const { t } = useI18n()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const mappingsQuery = useQuery({
  queryKey: adminQueryKeys.mappings,
  queryFn: fetchModelMappings,
})
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

const fromAlias = ref("")
const targetModel = ref("")

const availableModels = computed(() => {
  const hiddenModels = new Set(premiumQuery.data.value?.hiddenModels ?? [])
  const disableHiddenModels = settingsQuery.data.value?.disableHiddenModels ?? false

  return (modelsQuery.data.value?.data ?? []).filter((model) => {
    if (!disableHiddenModels) {
      return true
    }

    return !hiddenModels.has(model.id)
  })
})

const saveMutation = useMutation({
  mutationFn: async () =>
    saveModelMapping(fromAlias.value.trim(), targetModel.value.trim()),
  onSuccess: async () => {
    noticeStore.success(t("mappings.saveSuccess"))
    fromAlias.value = ""
    targetModel.value = ""
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.mappings,
    })
  },
  onError: (error) => {
    noticeStore.error(getErrorMessage(error, t("mappings.saveFailed")))
  },
})

function buildCopiedAlias(from: string, mappings: Record<string, string>): string {
  let candidate = `${from}-copy`
  let index = 2

  while (candidate in mappings) {
    candidate = `${from}-copy-${index}`
    index += 1
  }

  return candidate
}

async function copyMapping(from: string, to: string): Promise<void> {
  const mapping = mappingsQuery.data.value?.modelMapping ?? {}
  const nextAlias = buildCopiedAlias(from, mapping)

  try {
    await saveModelMapping(nextAlias, to)
    noticeStore.success(t("mappings.copySuccess"))
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.mappings,
    })
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("mappings.copyFailed")))
  }
}

async function removeMapping(from: string): Promise<void> {
  try {
    await deleteModelMapping(from)
    noticeStore.success(t("mappings.deleteSuccess"))
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.mappings,
    })
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("mappings.deleteFailed")))
  }
}
</script>

<template>
  <section class="page-card">
    <h1 class="page-title">{{ t("mappings.title") }}</h1>
    <p class="page-subtitle">{{ t("mappings.subtitle") }}</p>

    <div class="page-section sub-card">
      <h2 class="section-title">{{ t("mappings.createTitle") }}</h2>
      <div class="form-two-column">
        <label class="field">
          <span>{{ t("mappings.from") }}</span>
          <input v-model="fromAlias" type="text">
        </label>

        <label class="field">
          <span>{{ t("mappings.to") }}</span>
          <select v-model="targetModel">
            <option value="">{{ t("mappings.selectTarget") }}</option>
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.id }}
            </option>
          </select>
        </label>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        :disabled="!fromAlias.trim() || !targetModel.trim() || saveMutation.isPending.value"
        @click="saveMutation.mutate()"
      >
        {{ t("common.save") }}
      </button>
    </div>

    <div class="page-section table-card">
      <div v-if="mappingsQuery.isLoading.value" class="empty-state">
        {{ t("common.loading") }}
      </div>
      <div
        v-else-if="Object.keys(mappingsQuery.data.value?.modelMapping ?? {}).length === 0"
        class="empty-state"
      >
        {{ t("mappings.empty") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ t("mappings.from") }}</th>
            <th>{{ t("mappings.to") }}</th>
            <th>{{ t("mappings.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[from, to] in Object.entries(mappingsQuery.data.value?.modelMapping ?? {})"
            :key="from"
          >
            <td>{{ from }}</td>
            <td>{{ to }}</td>
            <td>
              <div class="inline-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="copyMapping(from, to)">
                  {{ t("mappings.copy") }}
                </button>
                <button type="button" class="btn btn-danger btn-sm" @click="removeMapping(from)">
                  {{ t("common.delete") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
