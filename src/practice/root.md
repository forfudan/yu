---
aside: false
---
# 星陈·字根练习

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="star" zigenUrl="/zigen-star.csv" :range="[0,]" :mode='"both"' :supplement='false' :ming='false' />
</div>

<ZigenMap :default-scheme="'star'" :hide-scheme-buttons="true" column-min-width="1.52rem" />
