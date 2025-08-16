---
aside: false
---
# 日月·字根练习

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/ZigenTrain.vue"
</script>
<div class="zigen-font">
<Train name="sunmoon" zigenUrl="/zigen-ming.csv" :range="[0,]" :mode='"both"' :supplement='false' :ming='false' />
</div>
