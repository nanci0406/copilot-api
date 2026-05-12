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
const formOpen = ref(false)
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
    formOpen.value = false
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

function openMappingForm(): void {
  fromAlias.value = ""
  targetModel.value = ""
  formOpen.value = true
}
</script>

<template>
  <div id="tab-model-mappings" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <span class="card-title">{{ t("mappings.title") }}</span>
          <button type="button" class="btn btn-primary btn-sm" @click="openMappingForm">
            {{ t("mappings.add") }}
          </button>
      </div>

      <div class="mapping-form" :class="{ active: formOpen }">
        <div class="mapping-form-row">
          <input
            v-model="fromAlias"
            class="select mapping-input-inline"
            :placeholder="t('mappings.fromPlaceholder')"
          >
          <span class="mapping-arrow">→</span>
          <select v-model="targetModel" class="select mapping-input-inline">
            <option value="">{{ t("mappings.selectTarget") }}</option>
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.id }}
            </option>
          </select>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="!fromAlias.trim() || !targetModel.trim() || saveMutation.isPending.value"
            @click="saveMutation.mutate()"
          >
            {{ t("common.save") }}
          </button>
          <button type="button" class="btn btn-sm" @click="formOpen = false">
            {{ t("common.cancel") }}
          </button>
        </div>
      </div>

      <table class="mapping-table">
        <colgroup>
          <col class="mapping-col-from">
          <col class="mapping-col-to">
          <col class="mapping-col-action">
        </colgroup>
        <thead>
          <tr class="mapping-head">
            <th>{{ t("mappings.from") }}</th>
            <th>{{ t("mappings.to") }}</th>
            <th>{{ t("mappings.action") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="mappingsQuery.isLoading.value">
            <td colspan="3" class="empty-state">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="Object.keys(mappingsQuery.data.value?.modelMapping ?? {}).length === 0">
            <td colspan="3" class="empty-state">{{ t("mappings.noMappings") }}</td>
          </tr>
          <template v-else>
            <tr
              v-for="[from, to] in Object.entries(mappingsQuery.data.value?.modelMapping ?? {})"
              :key="from"
              class="mapping-row"
            >
              <td class="mapping-cell">
                <span class="mapping-model-pill mapping-model-from">{{ from }}</span>
              </td>
              <td class="mapping-cell mapping-cell-to">
                <span class="mapping-model-pill mapping-model-to">{{ to }}</span>
              </td>
              <td class="mapping-cell mapping-cell-action">
                <div class="mapping-action-group">
                  <button type="button" class="btn btn-sm" @click="copyMapping(from, to)">
                    {{ t("mappings.copy") }}
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" @click="removeMapping(from)">
                    {{ t("common.delete") }}
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
