---
aside: false
---
# 靈明·單字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import CharTrain from "@/train/CharTrain.vue"
</script>
<div class="zigen-font">
<CharTrain 
  name="ling"
  chaifenUrl="/chaifen.csv"
  zigenUrl="/zigen-ling.csv"
  :range="[0,500]"
  rule="ling"
  mabiaoUrl="/mabiao-ling.txt"
  :popLevel="3"
/>
</div>
