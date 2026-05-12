<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{ titleKey: string }>()
</script>

<template>
  <section class="page-card">
    <h1 class="page-title">{{ t(titleKey) }}</h1>
    <p class="page-subtitle">
      {{ t("scaffold.copy") }}
    </p>
  </section>
</template>
