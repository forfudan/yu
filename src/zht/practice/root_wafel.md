---
aside: false
---
# 吉旦餅·字根練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="wafel" zigenUrl="/zigen-wafel.csv" :range="[0,]" :mode='"both"' rule="wafel" />
</div>

<ZigenMap :default-scheme="'wafel'" column-min-width="1rem" />