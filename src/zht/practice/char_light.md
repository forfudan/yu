---
aside: false
---
# 光華·单字練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="light" chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-light.csv" :range="[0,1000]" :supplement="true" />
</div>

<ZigenMap :default-scheme="'light'" :hide-scheme-buttons="true" column-min-width="1.5rem" />