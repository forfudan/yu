---
aside: false
---
# 卿雲·单字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

<div class="zigen-font">
<Train name="joy"  chaifenUrl="/chaifen.csv" zigenUrl="/zigen-joy.csv" :range="[0,500]" rule="joy" />
</div>

<ZigenMap :default-scheme="'joy'" column-min-width="1.5rem" />