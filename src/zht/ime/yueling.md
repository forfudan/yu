---
aside: false
---

# 月靈

## 簡介

[月靈]输入方案，結合了 90% 的[靈明](https://shurufa.app/docs/ling.html)和 10% 的[日月](https://shurufa.app/docs/ming.html)的設計：

1. 參照日月、靈明，使用 25 鍵方案，聲母 z/zh 用 v 代替，零聲母用 j 代替，另外聲母 q 用 k 代替以降低 q 鍵壓力；
2. 字根聚類程度接近靈明；
3. 大根聲碼與靈明相同，字根韻碼類日月映射到 A、E、U、I、O，記憶壓力較原版靈明稍高；
4. 爲簡體字頻優化，簡體字頻全碼當量及簡體動重大幅降低，繁體動重較高；
5. 單字編碼规则同灵明，單字編碼限長四碼；

月靈的設計初衷是因靈明爲簡繁通打，適棄了一部分簡體性能；同時因靈明爲易學而採用韻碼取韻腹的設計，導致當量較難降低。雖然月靈的簡體動態重碼率及當量有所提升，但在易學難忘性、繁體靜態重碼數、繁體動態重碼率上都距靈明甚遠，因此並不推薦一般用戶及有繁體輸入需求的用戶使用，僅推薦只有簡體輸入需求並對性能有極致追求的用戶使用。對自定碼感興趣的一般用戶應去學習宇浩輸入法系列的日月和靈明方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 297 非首選字；
* 常用國字 4808 字靜重： 102 非首選字；
* 知乎簡體·頻率降序動重： 1.13‱；
* 北語簡體·頻率降序動重： 1.78‱；
* 臺標繁體·頻率降序動重： 32.06‱；
* 知乎簡體字頻全碼當量： 1.2453；
* 北語簡體字頻全碼當量： 1.2467；
* 臺標繁體字頻全碼當量： 1.2909；
* 簡碼效率： 北語字頻 50 簡碼 3.071，100 簡碼 2.962，所有簡碼 2.714；

## 致謝

* 感謝朱宇浩製作的優質拆分和日月、靈明優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友及魔靈製作者 [@qq3qq](https://github.com/Dieken) 的多次指導与啓發；


<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-yueling.csv" rule="yueling" />
</div>

## 字根

<ZigenMap 
:default-scheme="'yueling'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="月靈"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/yueling"
/>

## 練習

<div class="zigen-font">
<Train name="yueling" chaifenUrl="/chaifen.json" zigenUrl="/zigen-yueling.csv" :range="[0,]" :mode='"both"' rule="ling" />
</div>
