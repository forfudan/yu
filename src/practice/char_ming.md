---
aside: false
---
# 日月·单字练习

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/CharTrain.vue"
</script>
<div class="zigen-font">
<Train name="ming"  chaifenUrl="/chaifen.csv" zigenUrl="/zigen-ming.csv" :range="[0,1000]" :supplement="false" :ming="true" />
</div>
