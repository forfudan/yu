# 練習

<script setup>
// import CharTrain from "@/train/CharTrain.vue"
import ZigenTrain from "@/train/ZigenTrain.vue"
</script>

## 字根練習

<div class="zigen-font-tianma">
<ZigenTrain name="tianma" zigenUrl="/zigen-tianma.csv" :range="[0,]" mode='both' />
</div>

<!-- ## 單字練習

爲了降低學習難度，練習中，不補首根小碼。

<CharTrain name="tianma" zigenUrl="/zigen-tianma.csv" :range="[0,1000]" :supplement="false" /> -->