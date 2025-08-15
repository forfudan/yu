---
aside: false
---
# 光华·字根练习

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="light" zigenUrl="/zigen-light.csv" :range="[0,]" mode='both' />
</div>

<ZigenMap :default-scheme="'light'" :hide-scheme-buttons="true" column-min-width="1.5rem" />
