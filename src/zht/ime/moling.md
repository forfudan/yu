---
aside: false
---

# 魔靈

## 簡介

[魔靈兩可](https://github.com/Dieken/code_genie/tree/moling/moling#readme)輸入方案，簡稱「魔靈」，結合了 90% 的[靈明](https://shurufa.app/docs/ling.html)和 10% 的[星陳](https://shurufa.app/docs/star.html)的設計：

1. 參照靈明，使用 25 鍵方案，聲母 z/zh 用 v 代替，零聲母用 w 代替，另外聲母 y 用 k 代替以降低 Y 鍵壓力；
2. 字根聚類程度接近靈明；
3. 非成字字根和非常用字字根省略聲碼，字根韻碼取字根首筆筆畫，映射到 A(折)、 E(撇)、 U(豎)、I(點)、O(橫)，不用記憶生僻字讀音；
4. 沒有大小根和第三根跳根，常用字字根可以組二字詞，打詞體驗類似傳統四定，但因編碼空間限制，也是定位主單輔詞；
5. 單字編碼爲 A1A2A3AzSzYz，除了雙根字編碼爲 A1A2S2S1Y1 ，模仿了星陳的回頭碼設計，單字編碼限長四碼；

魔靈兩可的初衷是降低靈明的學習難度（靈明要記憶省略聲母的小根），以及捨棄了靈明二碼字根字不能組二字詞的設計決策（靈明是爲了碼長短），雖然魔靈兩可的簡體動態重碼率還不錯，但在靜態重碼數、繁體動態重碼率、當量、碼長上都距靈明甚遠，只能算是結合了靈明特性的改進版星陳（但繁體性能依然比星陳差），因此並不推薦使用，對自定碼感興趣的朋友應去學習宇浩輸入法系列的日月和靈明方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 358 非首選字；
* 常用國字 4808 字靜重： 119 非首選字；
* 知乎簡體·頻率降序動重： 1.26‱；
* 北語簡體·頻率降序動重： 1.95‱；
* 臺標繁體·頻率降序動重： 37.18‱；
* 知乎簡體字頻全碼當量： 1.2829；
* 北語簡體字頻全碼當量： 1.2857；
* 臺標繁體字頻全碼當量： 1.3131；
* 簡碼效率： 北語字頻 50 簡碼 3.108，100 簡碼 2.978，所有簡碼 2.752；

## 致謝

* 感謝朱宇浩製作的優質拆分和靈明、星陳優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友 [@Litles](https://github.com/litles) 的多次啓發，尤其是提出了取字根首筆筆畫代替韻母的設計；


<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-moling.csv" rule="moling" />
</div>

## 字根

<ZigenMap 
:default-scheme="'moling'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="魔靈"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/moling"
/>

## 練習

<div class="zigen-font">
<Train name="moling" chaifenUrl="/chaifen.json" zigenUrl="/zigen-moling.csv" :range="[0,]" :mode='"both"' rule="moling" />
</div>
