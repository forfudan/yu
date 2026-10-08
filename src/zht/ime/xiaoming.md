---
aside: false
---

# 瀟明

## 簡介

[瀟明](https://github.com/Dieken/code_genie/tree/moling/moling/output-20261003-203525/thread-04)輸入方案，是結合宇浩拆分和[瀟湘](https://github.com/hertz-hwang/rime-xx)輸入方案單字編碼格式的五碼自定碼，由 @恷子 設計，@qq3qq 實現。

1. 25 鍵方案，字根編碼 ASB，大碼 A 取 ZDFJKEI 外 19 個字母，小碼 S 和補碼 B 都取 DFJKEI 六個字母：
    * 小碼來自常用字字根的聲母，映射如下：
        * D: c y
        * E: h l s
        * F: j k p t w
        * I: 0 d f g n
        * J: q x z
        * K: b m r
    * 補碼來自字根首筆筆畫，映射如下：
        * 橫 D，豎 K，撇 F，點 J，逆時針折 E，順時針折 I；
    * 非常用字字根無聲母，因此小碼取補碼，相當於字根編碼爲 ABB；
    * 補碼只用在字根字裏，有時候文檔或者 QQ 羣裏在討論多根字編碼、詞編碼、簡碼時會提到小碼 B，其實指的是小碼 S，有的人習慣用 A 指代大碼，用 B 指代小碼，但本文特意用 S 指代小碼，因爲來自聲母；
    * 舉例：
        * 烏: 大碼 Y, 小碼 F（w 映射到 F)，補碼 F(字根首筆的撇映射到 F)；
        * <span class="zigen-font"></span>: 大碼 Y(與「烏」聚類），小碼 F（無音的非常用字字根，小碼取補碼），補碼 F(字根首筆的撇映射到 F)，注意這只是恰好兩個字根歸併成同一個 YFF 編碼了，瀟明的設計類似魔靈，並不會因爲字根形狀相近就歸併成同一個編碼，而是嚴格遵守常用字字根用聲母映射小碼，其它字根小碼取補碼的規則。
2. 字根聚類程度接近靈明；
3. 單字編碼：
    * 單根字：`A1S1B1`，就是字根的編碼，例如「烏」Dff；
    * 雙根字: `A1S1A2S2`，就是首根的大小碼加上次根的大小碼，例如「好」由「女」Gie 和「子」Qji 組成，所以編碼了 GiQj；
    * 三根字：`A1S1A2A3S3`，就是首根的大小碼、次根的大碼加上末根的大小碼，例如「做」由「亻」Nff、「古」Uid 和「攵」Pff 組成，所以編碼爲 NfUPf；
    * 四根及以上：`A1S1A2A3Az`，就是首根的大小碼、次根的大碼、三根的大碼、末根的大碼，例如「靈」由「雨」Udd、「口」Hfk、「口」Hfk、「人」Rkf 組成，所以編碼爲 UdHHR；
4. 簡碼：
    * 6 個一鍵上屏無理簡碼字： 不 K, 在 F, 是 J，我 I，的 D，了 E，不需要加空格；
    * 19 個空格上屏的一碼簡字：`A1_`，就是首根大碼，如 「一」 Sdd 的簡碼爲 S 加空格；
    * 19 x 19 = 361 個二鍵上屏的二碼簡字：`A1A2`，就是首根大碼加上次根大碼，如「他」NfOD 的簡碼爲 NO ，不需要加空格;
    * 三鍵上屏簡碼：`A1S1Sz`，就是首根大碼、首根小碼加上末根小碼，如「去」UfOe 的簡碼爲 Ufe；
5. 詞組：
    * 二字詞：取**首末、首末**根，`AS A + A AS`，也即首字首根大小碼，首字末根大碼（如非首根），加次字首根大碼(如非末根)、次字末根大小碼，截斷爲 5 碼；
        * 舉例：「一人」，Sdd Rkf，詞編碼爲 SdRk;
        * 舉例：「中國」，HfAk VkLLj，詞編碼爲 HfAVL；
    * 三字詞：取**末、末、首末**根，`AS + A + A A`, 也即首字末根大小碼，加次字末根大碼，加末字首根大碼、末字末根大碼；
        * 舉例：「新中國」，YeWWf HfAk VkLLj，詞編碼爲 WfAVL；
    * 四字及以上詞：取*末、末、末、末*根，`AS + A + A + A`，也即首字末根大小碼，加次字末根大碼，加三字末根大碼，加末字末根大碼；
        * 舉例，「哭哭啼啼」，HfHYj HfHYj HfACX HfACX，詞編碼爲 YjYXX；
    * 取末根的原因是儘可能的跳過偏旁部首，增強詞組編碼的離散度；
    * [科學測評 6 萬詞](https://github.com/hertz-hwang/CHS/blob/main/data/kc6000.txt)（去掉兩個帶字母的詞）詞重 4.039%， 雖然詞重比較低，但瀟明依然是主單方案，詞的規則設計故意脫離取首根次根的慣例，增加了一點難度以獲得更好離散度；


使用[宇浩測評](https://ceping.shurufa.app)測得的性能指標：

* 通用規範 8105 字靜重： 49 非首選字；
* 常用國字 4808 字靜重： 12 非首選字；
* 知乎簡體·頻率降序動重： 0.33‱；
* 北語簡體·頻率降序動重： 0.76‱；
* 臺標繁體·頻率降序動重： 1.28‱；
* 知乎簡體字頻全碼當量： 1.2564；
* 北語簡體字頻全碼當量： 1.2590；
* 臺標繁體字頻全碼當量： 1.2898；
* 簡碼效率： 北語字頻 50 簡碼 3.468，100 簡碼 3.340，所有簡碼 3.027；

## 致謝

* 感謝朱宇浩製作的優質拆分和靈明、星陳優質方案；
* 感謝 [@荒](https://github.com/hertz-hwang) 的[碼靈](https://github.com/hertz-hwang/code_genie)優化程序和[瀟湘](https://github.com/hertz-hwang/rime-xx) 方案；
* 感謝 @恷子 的[方案設計](https://github.com/Dieken/code_genie/commit/741a1571b37505806e4058c2c6952935f6aa57a5)；


<script setup>
import Search from '@/search/FetchSearch.vue'
import Train from "@/train/ZigenTrain.vue"
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

## 拆分

<div class="zigen-font">
<Search chaifenUrl="/chaifen.json" zigenUrl="/zigen-xiaoming.csv" rule="xiaoming" />
</div>

## 字根

<ZigenMap 
:default-scheme="'xiaoming'"
alwaysVisibleZigens="卩丂丩屮丱髟廾豕彡"
chaifenUrl="/chaifen.json"
column-min-width="1rem"
schemeCnName="瀟明"
:customEmptyKeyLabels="{k: '一碼上屏字 不', f: '一碼上屏字 在', j: '一碼上屏字 是', i: '一碼上屏字 我', d: '一碼上屏字 的', e: '一碼上屏字 了'}"
customFooter="QQ羣: 544760766 · 本圖鏈接: https://shurufa.app/ime/xiaoming"
/>

## 練習

<div class="zigen-font">
<Train name="xiaoming" chaifenUrl="/chaifen.json" zigenUrl="/zigen-xiaoming.csv" :range="[0,]" :mode='"both"' rule="xiaoming" />
</div>
