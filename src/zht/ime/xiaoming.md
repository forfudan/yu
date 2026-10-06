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
    * 非常用字字根無聲母，因此小碼取補碼，也即字根編碼爲 ABB；
2. 字根聚類程度接近靈明；
3. 單字編碼：
    * 單根字：A1S1B1
    * 雙根字: A1S1A2S2
    * 三根字：A1S1A2A3S3
    * 四根及以上：A1S1A2A3Az
4. 簡碼：
    * 6 個一鍵上屏簡碼字： 不 K, 在 F, 是 J，我 I，的 D，了 E；
    * 19 個空格上屏的一碼簡字：A\_
    * 19 x 19 = 361 個二鍵上屏的二碼簡字：AA
    * 三鍵上屏簡碼：ASB


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
