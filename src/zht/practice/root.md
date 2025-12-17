---
aside: false
---
# 星陳·字根練習

你可以隨時暫停練習。你的練習進度會在同一設備上儲存。

其他輸入法字根練習: [日月](./root_ming) [卿雲](./root_joy) [光華](./root_light) [吉旦餅](./root_wafel)

<script setup>
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="star" zigenUrl="/zigen-star.csv" :range="[0,]" :mode='"both"' rule="star" />
</div>

<ZigenMap :default-scheme="'star'" column-min-width="1rem" />
