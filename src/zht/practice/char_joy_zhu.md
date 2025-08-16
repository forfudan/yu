---
aside: false
---
# 卿雲·夢澤閑客作品高頻字

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="joy" chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-joy.csv" :range="[0,1000]" :supplement="false" :ming='false'/>
</div>

<ZigenMap :default-scheme="'joy'" :hide-scheme-buttons="true" column-min-width="1.5rem" />
