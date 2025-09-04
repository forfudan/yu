---
aside: false
---
# 中古拼音練習

<script setup>
import TupaTrain from "@/train/TupaTrain.vue"
</script>

## 中古漢語拼音訓練·高頻字

使用間隔重複算法學習中古漢語拼音。每個漢字會顯示其所有拼音形式，按使用頻率排序。您只需輸入任意一個正確的拼音即可。

資料來源：[https://github.com/nk2028/rime-tupa](https://github.com/nk2028/rime-tupa)

<TupaTrain :char-count="1000" />
