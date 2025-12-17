---
aside: false
---
# 日月·字根練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="ming" zigenUrl="/zigen-ming.csv" :range="[0,]" :mode='"both"' rule="ming" />
</div>

<ZigenMap :default-scheme="'ming'" column-min-width="1rem" />