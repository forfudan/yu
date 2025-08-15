---
aside: false
---
# 卿雲·字根練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="joy" zigenUrl="/zigen-joy.csv" :range="[0,]" mode='A' />
</div>

<ZigenMap :default-scheme="'joy'" :hide-scheme-buttons="true" column-min-width="1.5rem" />