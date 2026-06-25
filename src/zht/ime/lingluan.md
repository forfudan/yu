---
aside: false
---

# 靈亂

## 簡介

[靈亂](https://github.com/PillowMonth/lingluan-ime)輸入方案是以[靈明](https://shurufa.app/docs/ling.html)爲基礎，二三編全亂序的方案。

1. 使用 25 鍵方案；
2. 字根聚類程度接近[卿雲](https://shurufa.app/zht/docs/joy.html)；
4. 爲簡繁混合字頻優化；
5. 單字編碼規則同[靈明](https://shurufa.app/docs/ling.html)，編碼限長四碼；

[靈亂](https://github.com/PillowMonth/lingluan-ime)方案沒有設計初衷。因此，[靈亂](https://github.com/PillowMonth/lingluan-ime)並不推薦給一般用戶，僅適合自認爲適合的用戶。對自定碼感興趣的普通用戶及形碼初學者，建議學習宇浩輸入法系列中的[靈明](https://shurufa.app/docs/ling.html)方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 176 非首選字；
* 常用國字 4808 字靜重： 26 非首選字；
* 知乎簡體·頻率降序動重： 0.82‱；
* 北語簡體·頻率降序動重： 1.49‱；
* 臺標繁體·頻率降序動重： 4.92‱；
* 知乎簡體字頻全碼當量： 1.2129；
* 北語簡體字頻全碼當量： 1.2162；
* 臺標繁體字頻全碼當量： 1.2589；
* 簡碼效率： 北語字頻 50 簡碼 3.061，100 簡碼 2.970，所有簡碼 2.782；

## 致謝

* 感謝朱宇浩製作的優質拆分和[靈明](https://shurufa.app/docs/ling.html)優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友及魔靈製作者 [@qq3qq](https://github.com/Dieken) 的多次指導與啓發；

<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-lingluan.csv" rule="ling" />
</div>

## 字根

<ZigenMap 
:default-scheme="'lingluan'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="靈亂"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/lingluan"
/>

## 練習

<div class="zigen-font">
<Train name="lingluan" chaifenUrl="/chaifen.json" zigenUrl="/zigen-lingluan.csv" :range="[0,]" :mode='"both"' rule="ling" />
</div>
