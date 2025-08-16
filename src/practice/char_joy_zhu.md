---
aside: false
---
# 卿云·梦泽闲客作品高频字

你可以随时暂停练习。你的练习进度会在同一设备上储存。

<script setup>
import Train from "@/train/CharTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>
<div class="zigen-font">
<Train name="joy" chaifenUrl="/chaifen_zhu.csv" zigenUrl="/zigen-joy.csv" :range="[0,1000]" :supplement="false" :ming='false'/>
</div>

<ZigenMap :default-scheme="'joy'" column-min-width="1.5rem" />
