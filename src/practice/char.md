---
aside: false
---
# 星陈·单字练习

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="star" chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-star.csv" :range="[0,1000]" :supplement="true" />
</div>

<ZigenMap :default-scheme="'star'" :hide-scheme-buttons="true" column-min-width="1.5rem" />