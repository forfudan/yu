---
aside: false
---

# 星月

## 簡介

[星月](https://github.com/PillowMonth/starmoon-ime)輸入方案是以星陈爲基礎，拆部分聚类且小码乱序的方案：

1. 使用 25 鍵方案，小碼基本亂序，低頻無讀音字根小碼取v，相對應的簡繁字根取相同小碼，無對應簡體字根的繁體字根小碼取聲母，字型相近且同音的字根大部分取相同小碼；
2. 字根聚類程度接近靈明；
3. 單字編碼規則同星陳，二根字全碼末回頭取首根小碼，編碼限長四碼；
4. 支持簡繁通打。

星月雖然在各類性能數據上都有所精進，但在易學難忘性遠不如星陳。因此，星月並不推薦給一般用戶，僅適合對性能有極致追求的用戶。對形碼感興趣的普通用戶及形碼初學者，建議學習宇浩輸入法系列中的「星陳」方案，對自定碼感興趣的用戶，建議學習宇浩輸入法系列中的「靈明」方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 231 非首選字；
* 常用國字 4808 字靜重： 43 非首選字；
* 知乎簡體·頻率降序動重： 1.03‱；
* 北語簡體·頻率降序動重： 1.86‱；
* 臺標繁體·頻率降序動重： 3.70‱；
* 知乎簡體字頻全碼當量： 1.2213；
* 北語簡體字頻全碼當量： 1.2249；
* 臺標繁體字頻全碼當量： 1.2590；
* 簡碼效率： 北語字頻 50 簡碼 3.420，100 簡碼 3.304，所有簡碼 3.082；

## 致謝

* 感謝朱宇浩製作的優質拆分和星陳優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友及魔靈製作者 [@qq3qq](https://github.com/Dieken) 的多次指導與啓發；

<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-xingyue.csv" rule="star" />
</div>

## 字根

<ZigenMap 
:default-scheme="'xingyue'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="星月"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/xingyue"
/>

## 練習

<div class="zigen-font">
<Train name="xingyue" chaifenUrl="/chaifen.json" zigenUrl="/zigen-xingyue.csv" :range="[0,]" :mode='"both"' rule="star" />
</div>
