---
aside: false
---

# 星月

## 簡介

[星月](https://github.com/PillowMonth/starmoon-ime)輸入方案是以[星陳](https://shurufa.app/docs/star.html)爲基礎，拆部分聚類且小碼亂序的方案：

1. 使用纯 25 鍵方案，小碼 90% 亂序，相對應的簡繁字根取相同小碼，無對應簡體字根的繁體字根小碼取聲母，字型相近且同音的字根大部分取相同小碼，低頻無讀音字根小碼取 v；
2. 字根聚類程度超過[靈明](https://shurufa.app/docs/ling.html)，但遜於[星陳](https://shurufa.app/docs/star.html)；
3. 單字編碼規則同[星陳](https://shurufa.app/docs/star.html)，二根字全碼末回頭取首根小碼，編碼限長四碼；
4. 支持簡繁通打。

星月雖然在各類性能數據上都有所精進，但在易學難忘性遠不如星陳。因此，星月並不推薦給一般用戶，僅適合對性能有極致追求的用戶。對形碼感興趣的普通用戶及形碼初學者，建議學習宇浩輸入法系列中的[星陳](https://shurufa.app/docs/star.html)方案，對自定碼感興趣的用戶，建議學習宇浩輸入法系列中的[靈明](https://shurufa.app/docs/ling.html)方案。


使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 232 非首選字；
* 常用國字 4808 字靜重： 43 非首選字；
* 知乎簡體·頻率降序動重： 1.03‱；
* 北語簡體·頻率降序動重： 1.86‱；
* 臺標繁體·頻率降序動重： 3.70‱；
* 知乎簡體字頻全碼當量： 1.2212；
* 北語簡體字頻全碼當量： 1.2247；
* 臺標繁體字頻全碼當量： 1.2587；
* 簡碼效率： 北語字頻 50 簡碼 3.420，100 簡碼 3.304，所有簡碼 3.082；

## 聚類

由於大量字形相近的字根被放在了一個按鍵上，雖然小碼亂序，但可以通過聯想記憶法，以「組」爲單位來記憶。

<!-- do not translate -->
<div class="zigen-font">

| 大碼 | 聚類字根                                            | 零散字根  |
| :--- | :-------------------------------------------------- | --------- |
| A    | 木朩寸來　匚牙臣                                | 亠　入     |
| B    | 烏鳥　犬　示　羊革　乂                | 广        |
| C    | 心　亦　卜鹵虍虎　辰长                  | 马　     |
| D    | 㔾卩　白　風殳几　而面　馬                      | 　人     |
| E    | 刀　豕　隹                                    |  其　　之    |
| F    |  飛乙亅 习                            | 　一　亥     |
| G    | 上丄　禾夭　幺厶　⻍辶　身食                        | 王           |
| H    | 未末　土士耂至　丂　合僉　丨〢〣　七车　   |     |
| I    | 又癶　小⺌　丶乀　麻鹿　艹卅卌廾     |  世　方　走　亍      |
| J    | 斤片爿　儿　日曰　毛千壬                | 门　非　山        |
| K    | 向　　口〇舌　乌鸟　也乜巴　禺甲里         | 生　正       |
| L    | 彐肀隶　冂門鬥　穴宀　二⺀　子孑予了       | 气          |
| M    | 且　大夫                                        | 　丑　曲　疒　八      |
| N    | 弋戈戊　水氺　爪瓜                                | 不　三           |
| O    | 竹　火灬　古早　齒止　用勹                 | 米　瓦     |
| P    | 电由申魚田甫鬼甶臼                            | 干　丬　文　巾　言        |
| Q    | 丰車　乚　尚　皿罒　骨咼             | 力　金　皮        |
| R    | 矢缶　糸　冖鱼欠                            | 十          |
| S    | 彑母　丁下丅　卯　丷           | 耳　豸　虫　九　业  |
| T    | 尸户戸　牛                                    | 　女     |
| U    | 雨页见贝　夕月自　兀丌尤尢                   | 乃        |
| V    | 高　亡　丱屮丩凵囗　彳　黑           | 弓　廴　足　工        |
| W    | 丿彡　手　辛立　匕　髟長镸　厂丆石戶          |  |
| X    | 巛巜川　己巳已　夊攵　                         | 　舟        |
| Y    | 冊　艮　頁目見貝　西酉　                   |         |

</div>
<!-- do not translate -->

## 致謝

* 感謝朱宇浩製作的優質拆分和[星陳](https://shurufa.app/docs/star.html)優質方案；
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
