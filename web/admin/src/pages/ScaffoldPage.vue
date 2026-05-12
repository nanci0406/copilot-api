<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{ titleKey: string }>()
</script>

<template>
  <div class="tab-content active">
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ t(titleKey) }}</span>
      </div>
      <div class="empty-state">{{ t("scaffold.copy") }}</div>
    </div>
  </div>
</template>
