---
aside: false
---

# 妖靈

## 簡介

[妖靈](https://github.com/Evildoer-Yao/yaoling-ime)輸入方案是以靈明爲基礎，專爲簡體性能優化的方案：

1. 參照靈明，使用 25 鍵方案；
2. 字根聚類程度接近靈明；
3. 小根韻碼除「又」外，與靈明相同，大根聲碼與韻碼固定映射，記憶壓力較原版靈明稍高；
4. 爲簡體字頻優化，簡體字頻全碼當量及簡體動重大幅降低，繁體動重稍高；
5. 單字編碼規則同靈明，編碼限長四碼；

妖靈方案的設計初衷，源於靈明為兼顧簡繁通打而犧牲了部分簡體性能，同時靈明為降低學習門檻，採用了以韻腹為核心的韻碼取碼策略，致使當量難以進一步壓縮。妖靈雖然在簡體動態重碼率與當量方面有所精進，但在易學難忘性、繁體靜態重碼數及繁體動態重碼率等指標上，仍遠遜於靈明。因此，妖靈並不推薦給一般用戶或需要輸入繁體的使用者，僅適合那些僅有簡體輸入需求、且對性能有極致追求的用戶。對自定碼感興趣的普通用戶及形碼初學者，建議學習宇浩輸入法系列中的「日月」與「靈明」方案。

使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 227 非首選字；
* 常用國字 4808 字靜重： 41 非首選字；
* 知乎簡體·頻率降序動重： 1.16‱；
* 北語簡體·頻率降序動重： 1.93‱；
* 臺標繁體·頻率降序動重： 4.71‱；
* 知乎簡體字頻全碼當量： 1.2371；
* 北語簡體字頻全碼當量： 1.2355；
* 臺標繁體字頻全碼當量： 1.2804；
* 簡碼效率： 北語字頻 50 簡碼 3.085，100 簡碼 3.006，所有簡碼 2.839；

## 映射

|        | A      | E      | U      | I      | O      |
| :----- | :----- | :----- | :----- | :----- | :----- |
| C      |        |        | c   ch |        |        |
| D      |        |        |        | r      | s   sh |
| G      |        |        | y      |        |        |
| J      |        | k    q |        |        | w      |
| K      | x      | d z zh |        |        |        |
| L      | h      |        |        |        |        |
| M      |        | t      |        |        |        |
| N      | p      | j    Ø |        |        |        |
| Q      |        |        |        |        | n      |
| R      |        |        |        |        | m      |
| S      |        |        |        | b      |        |
| V      |        |        |        | l      |        |
| W      |        |        |        | g      | f      |

特別注意：

* 「又」爲小根，無聲碼，韻碼應爲 o ，由於大碼爲 P ，考慮到 po 的手感問題，故改韻碼爲 e ，全碼爲 pe 。

## 致謝

* 感謝朱宇浩製作的優質拆分和靈明優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序；
* 感謝上述兩位作者的討論和指導，以及羣友及魔靈製作者 [@qq3qq](https://github.com/Dieken) 的多次指導與啓發；

<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-yaoling.csv" rule="ling" />
</div>

## 字根

<ZigenMap 
:default-scheme="'yaoling'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="妖靈"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/yaoling"
/>

## 練習

<div class="zigen-font">
<Train name="yaoling" chaifenUrl="/chaifen.json" zigenUrl="/zigen-yaoling.csv" :range="[0,]" :mode='"both"' rule="ling" />
</div>
