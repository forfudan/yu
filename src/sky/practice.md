# 练习

<script setup>
// import CharTrain from "@/train/CharTrain.vue"
import ZigenTrain from "@/train/ZigenTrain.vue"
</script>

## 字根练习

<div class="zigen-font-tianma">
<ZigenTrain name="tianma" zigenUrl="/zigen-tianma.csv" :range="[0,]" mode='both' />
</div>

<!-- ## 单字练习

为了降低学习难度，练习中，不补首根小码。

<CharTrain name="tianma" zigenUrl="/zigen-tianma.csv" :range="[0,1000]" :supplement="false" /> -->