---
aside: false
---
<script setup>
import Search from '@/search/OptimizedFetchSearch.vue'
</script>

# 星陳拆分查詢

<div class="zigen-font">
<Search chaifenUrl="/chaifen.csv" zigenUrl="/zigen-star.csv" :supplement="true" />
</div>

::: tip 提示

鼠標懸停，可显示字符集和外部搜索（字统、字海、汉典、中国哲学书电子化计划）

:::

::: info 說明

本表包含 CJK 至 ext-J 區、部首區、兼容區的 101984 餘個漢字拆分及編碼

「拆分」欄字形標準取自 [The Unicode Standard 17.0.0](https://www.unicode.org/versions/Unicode17.0.0/)

字形優先級: 陸臺港日韓越（GTHJKV）

若存在臺灣標準字形，則額外顯示臺灣字形拆分和編碼

:::
