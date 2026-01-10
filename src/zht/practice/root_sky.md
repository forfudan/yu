---
aside: false
---

<script setup>
import ZigenMap from "@/zigen/ZigenMap.vue"
import ZigenTrain from "@/train/ZigenTrain.vue"
</script>

# 天碼·字根練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

## 字根練習

<div class="zigen-font-tianma">
<ZigenTrain name="tianma" zigenUrl="/zigen-tianma.csv" :range="[0,]" mode='both' />
</div>

<ZigenMap :default-scheme="'tianma'" column-min-width="1rem" :zigenFontClass="'zigen-font-tianma'" />
