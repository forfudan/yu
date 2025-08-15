---
aside: false
---
# 星陳·单字練習·臺灣字型拆分

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="star" chaifenUrl="/chaifen_tw.csv" zigenUrl="/zigen-star.csv" :range="[0,1000]" :supplement="true" />
</div>

<ZigenMap :default-scheme="'star'" :hide-scheme-buttons="true" column-min-width="1.5rem" />