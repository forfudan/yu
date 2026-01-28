---
aside: false
---

<script setup>
import ZigenMap from "@/zigen/ZigenMap.vue"
import ZigenTrain from "@/train/ZigenTrain.vue"
import Search from '@/search/FetchSearch.vue'
</script>

# 天碼

<div class="zigen-font-tianma">
<Search chaifenUrl="/chaifen-tianma.csv" zigenUrl="/zigen-tianma.csv" rule="star" />
</div>

## 簡介

天碼是一個表形碼輸入方案，由宋天研製。特點有：四碼限長、純字形、雙編碼、繁簡通打[^fanjian]等。因爲其大碼表形，小碼取音的設計哲學，易學性極高。QQ討論群：631302614

<ZigenMap :default-scheme="'tianma'" column-min-width="1rem" :zigenFontClass="'zigen-font-tianma'" />

## 規則

天碼共約 500 字根，歸類後約 250，在 26 鍵上，依據其形態，對應到近似的拉丁字母上，形成規則排布。

::: tip 例
`人` `八` 像字母 A，故而排在 A 鍵上。
`丁` `下` `不` 像字母 T，故而排在 T 鍵上。
:::

每個字根還有一個小碼，爲其漢語拼音首字母。生僻字根或無讀音字根小碼爲 v。

其編碼規則類似於宇碼，總結如下：

- 依次取首、次、三、末根
- 不足四碼補末根小碼（拼音）
- 仍不足四碼補首根小碼（若是 v 則可以省略）

::: info 編碼規則公式化

單字拆分成若干字根後，最多取四根。假設首次三末根編碼爲 Aa Bb Cc Zz。則單字編碼規則爲：

- 單字根字 Zz
- 兩字根字 AZza
- 三字根及以上字 ABCZ

單行定義爲：ABCZza\[:4\]
:::

## 字根練習

[天碼字根練習器](../practice/root_sky)

[^fanjian]: 一般認爲單一碼表繁簡聯合選重率小於萬分之五十即具有繁簡通打特性。
