---
aside: false
---
# 星陳·单字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="star" chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-star.csv" :range="[0,500]" rule="star" />
</div>

<ZigenMap :default-scheme="'star'" column-min-width="1.5rem" />