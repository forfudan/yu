---
aside: false
---

# 月靈

## 簡介

[月靈](https://github.com/PillowMonth/yueling-ime)輸入方案是以靈明爲基礎，專爲簡體性能優化的方案。結合了 90% [靈明](https://shurufa.app/docs/ling.html)和 10% [日月](https://shurufa.app/docs/ming.html)的設計：

1. 參照日月、靈明，使用 25 鍵方案，聲母 z/zh 用 v 代替，ch 聲碼爲 c，sh 聲碼爲 s，零聲母用 j 代替，另外聲母 q 用 k 代替以降低 q 鍵壓力；
2. 字根聚類程度接近靈明；
3. 大根聲碼與靈明相同，字根韻碼類日月映射至 A、E、U、I、O，单元音除 ü -> O，其余不变，无读音 Ø -> E，記憶壓力較原版靈明稍高；
4. 爲簡體字頻優化，簡體字頻全碼當量及簡體動重大幅降低，繁體動重較高；
5. 單字編碼規則同靈明，編碼限長四碼；

月靈方案的設計初衷，源於靈明為兼顧簡繁通打而犧牲了部分簡體性能，同時靈明為降低學習門檻，採用了以韻腹為核心的韻碼取碼策略，致使當量難以進一步壓縮。月靈雖然在簡體動態重碼率與當量方面有所精進，但在易學難忘性、繁體靜態重碼數及繁體動態重碼率等指標上，仍遠遜於靈明。因此，月靈並不推薦給一般用戶或需要輸入繁體的使用者，僅適合那些僅有簡體輸入需求、且對性能有極致追求的用戶。對自定碼感興趣的普通用戶及形碼初學者，建議學習宇浩輸入法系列中的「日月」與「靈明」方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 296 非首選字；
* 常用國字 4808 字靜重： 101 非首選字；
* 知乎簡體·頻率降序動重： 1.12‱；
* 北語簡體·頻率降序動重： 1.77‱；
* 臺標繁體·頻率降序動重： 32.06‱；
* 知乎簡體字頻全碼當量： 1.2453；
* 北語簡體字頻全碼當量： 1.2467；
* 臺標繁體字頻全碼當量： 1.2909；
* 簡碼效率： 北語字頻 50 簡碼 3.087，100 簡碼 2.971，所有簡碼 2.736；

## 映射

| A      | E      | U      | I      | O      |
| :----- | :----- | :----- | :----- | :----- |
| a      | e Ø     | u      | i      | o ü    |
|        | ao      |        |        | ai     |
| er     |         |         |       | ei      |
|        | (k)ua üe uo | ua   |       | uei     |
|        | ie      |         | ia     | iao iou   |
|        |         |        | ou     |         |
| en ian  |         | an     |        | in uan uen iuan |
|        | ong     | eng ing  |       | ang      |
|        | uang    |         | iang   | iong      |

特別注意：

* q 聲母映射至 k ，z 聲母映射至 v ，零聲母聲碼爲 j；
*  w 、y 聲母不變，僅“肀”：yù，聲碼取零聲母聲碼 j（yu = ü），全碼爲：gjo；
* 當聲碼爲 k 時，韻母 ua 映射至 e，僅“㐄”、“𰀁”：dke；
* “夂”、“攵”、“夊”歸併後，聲碼取：夂[zh]ǐ → v，韻碼取：攵p[ū] → u，全碼爲 mvu；

## 致謝

* 感謝朱宇浩製作的優質拆分和日月、靈明優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友及魔靈製作者 [@qq3qq](https://github.com/Dieken) 的多次指導與啓發；

<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-yueling.csv" rule="ling" />
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
