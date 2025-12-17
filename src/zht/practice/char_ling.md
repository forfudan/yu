---
aside: false
---
# 靈明·單字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
</script>
<div class="zigen-font">
<Train name="ling"  chaifenUrl="/chaifen.csv" zigenUrl="/zigen-ling.csv" :range="[0,500]" rule="ling" />
</div>
