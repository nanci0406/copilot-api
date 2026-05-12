import { defineStore } from "pinia"

export type NoticeTone = "success" | "error" | "info"

export interface NoticeItem {
  id: string
  text: string
  tone: NoticeTone
}

export const useNoticeStore = defineStore("admin-notices", {
  state: () => ({
    items: [] as Array<NoticeItem>,
  }),
  actions: {
    push(text: string, tone: NoticeTone = "info"): string {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.items.push({ id, text, tone })

      globalThis.setTimeout(() => {
        this.remove(id)
      }, 4200)

      return id
    },
    remove(id: string): void {
      this.items = this.items.filter((item) => item.id !== id)
    },
    success(text: string): void {
      this.push(text, "success")
    },
    error(text: string): void {
      this.push(text, "error")
    },
  },
})
