---
aside: false
---
# 日月·夢澤閑客作品高頻字

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
</script>
<div class="zigen-font">
<Train name="ming"  chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-ming.csv" :range="[0,500]" :supplement="false" :ming="true" />
</div>
