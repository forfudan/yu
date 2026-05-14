---
title: 漢字字形輸入法繫絡圖
aside: false
---

<!-- verbatim -->
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Preserve locale prefix (/zht/docs/gene → /zht/ime/gene; /docs/gene → /ime/gene)
  const newPath = window.location.pathname.replace(/\/docs\/gene\/?$/, '/ime/gene')
  window.location.replace(newPath + window.location.search + window.location.hash)
})
</script>
<!-- verbatim -->

# 頁面已遷移

本頁面已遷移至 [/ime/gene](../ime/gene)，正在自動跳轉……

如未自動跳轉，請點擊上方鏈接。
