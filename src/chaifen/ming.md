---
aside: false
---
<script setup>
import Search from '@/search/FetchSearch.vue'
</script>

# 日月拆分查询

注意，拆分编码为日月全息编码，实际使用时，只需要截取前五码即可。

<div class="zigen-font">
<Search chaifenUrl="/chaifen.csv" zigenUrl="/zigen-sm.csv" :supplement="true" :ming="true"/>
</div>

::: tip 提示
鼠标悬停，可显示字符集和外部搜索（字统、字海、汉典、中国哲学书电子化计划）
:::

::: info 说明
本表包含 CJK 至 ext-I 区、部首区、兼容区的 99000 余个汉字拆分及编码

「拆分」栏字形标准取自 [The Unicode Standard 16.0.0](https://www.unicode.org/versions/Unicode16.0.0/)

字形优先级: 陆台港日韩越 GTHJKV

若存在台湾标准字形，则额外显示台湾字形拆分和编码
:::