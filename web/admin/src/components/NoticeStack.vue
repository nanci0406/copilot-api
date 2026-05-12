<script setup lang="ts">
import { storeToRefs } from "pinia"

import { useNoticeStore } from "@/stores/notices"

const noticeStore = useNoticeStore()
const { items } = storeToRefs(noticeStore)
</script>

<template>
  <div class="notice-stack">
    <transition-group name="notice-fade">
      <div
        v-for="item in items"
        :key="item.id"
        class="notice-card"
        :data-tone="item.tone"
      >
        <span>{{ item.text }}</span>
        <button
          type="button"
          class="notice-dismiss"
          @click="noticeStore.remove(item.id)"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>
