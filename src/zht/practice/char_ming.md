---
aside: false
---
# 日月·单字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
</script>
<div class="zigen-font">
<Train name="ming"  chaifenUrl="/chaifen.csv" zigenUrl="/zigen-ming.csv" :range="[0,1000]" :supplement="false" :ming="true" />
</div>
