<script setup>
import Chaifen from '@/chaifen/Chaifen.vue'
</script>

# 星陳輸入法詞語編碼

除了設置簡碼，宇碼還將常用的詞語，也編成 4 個字母的編碼。這樣可以降低每一個字的平均碼長，提高打字速度。

星陳輸入法的詞語編碼規則，分爲三種情況。

## 兩字詞

兩字詞，取每個字**全碼**的前兩碼即可：

::: tip 例

`人生`：`人`的編碼爲 `Ree`，`生`的編碼爲 `Pss`。因此，`人生`的編碼爲 `RePs`。

`事情`：`事`的編碼爲 `KLBj`，`情`的編碼爲 `RHWy`。因此，「事情」的編碼爲 `KLWy`。
<div class="flex justify-left flex-wrap">
<Chaifen char='事' :parts='[1,3,3,1]' :colors='[1,2,0,1]' />
<Chaifen char='情' :parts='[3,4,4]' :colors='[3,4,0]' />
</div>
:::

## 三字詞

三字詞，取前兩字的第一碼，和第三個字的前兩碼即可：

::: tip 例
`泡泡糖`：`泡`的編碼爲`〔氵月巳・ NWOs〕`，`糖`的編碼爲`〔米广又古・ QMBL〕`。因此，`泡泡糖`的編碼爲`〔氵氵米广・ NNQM〕`。
<div class="flex justify-left flex-wrap">
<Chaifen char='泡' :parts='[3,2,3]' :colors='[1,0,0,0]' />
<Chaifen char='泡' :parts='[3,2,3]' :colors='[1,0,0,0]' />
<Chaifen char='糖' :parts='[6,3,4,3]' :colors='[3,4,0,0]' />
</div>

`星期三`：`星`的編碼爲`〔日生・ JPsr〕`，`期`的編碼爲`〔其月・ UWyq〕`，`三`的編碼爲`〔三・ Laa〕`。因此，`星期三`的編碼爲`〔日其三・ JULa〕`。
<div class="flex justify-left flex-wrap">
<Chaifen char='星' :parts='[4,5]' :colors='[1,0,0,0]' />
<Chaifen char='期' :parts='[8,4]' :colors='[2,0,0,0]' />
<Chaifen char='三' :parts='[3]' :colors='[3,0,0,0]' />
</div>
:::

## 四字詞及以上

四字詞及以上，取前三字的第一碼，和最後一個字的第一碼即可：

::: tip 例
`狐假虎威`：`狐`的編碼爲`〔犭瓜・ HUgq〕`，「假」的編碼爲`〔亻尸二又・ EBIB〕`，「虎」的編碼爲`〔虎・ Uhh〕`，「威」的編碼爲`〔戊一女・ KFCn〕`。因此，「狐假虎威」的編碼爲`〔犭亻虎戊・ HEUK〕`。
<div class="flex justify-left flex-wrap">
<Chaifen char='狐' :parts='[3,5]' :colors='[1,0]' />
<Chaifen char='假' :parts='[2,3,2,2,2]' :colors='[2,0,0,0,0]' />
<Chaifen char='虎' :parts='[8]' :colors='[3]' />
<Chaifen char='威' :parts='[2,1,3,3]' :colors='[4,0,0,4]' />
</div>

`中华人民共和国`：這是一個七字詞，所以我們只看前三字和最後一字`中`、`华`、`人`、`国`。`中`的編碼爲`〔口丨・ LUsv〕`，`华`的編碼爲`〔亻匕十・ ENGi〕`，`人`的編碼爲`〔人・ Ree〕`，`国`的編碼爲`〔囗王丶・ WJKd〕`。因此，`中华人民共和国`的編碼爲`〔口亻禾囗・ LERW〕`。
<div class="flex justify-left flex-wrap">
<Chaifen char='中' :parts='[3,1]' :colors='[1,0]' :size=50 />
<Chaifen char='华' :parts='[2,2,2]' :colors='[1,0,0]' :size=50 />
<Chaifen char='人' :parts='[2]' :colors='[1]' :size=50 />
<Chaifen char='民' :parts='[3,2]' :colors='[0,0]' :size=50 />
<Chaifen char='共' :parts='[4,2]' :colors='[0,0]' :size=50 />
<Chaifen char='和' :parts='[5,3]' :colors='[0,0]' :size=50 />
<Chaifen char='国' :parts='[2,4,1,1]' :colors='[1,0,0,1]' :size=50 />
</div>
:::

## 詞語輸入的優缺點

用詞語的方式進行輸入，優點在於降低了每個字的平均碼長。

::: tip

試想`我们今天一起吃饭`這個句子。

<div class="flex justify-left flex-wrap">
<Chaifen char='今' :parts='[2,1,2]' :size=50 />
<Chaifen char='天' :parts='[1,3]' :size=50 />
<Chaifen char='我' :parts='[1,1,2,3]' :colors='[1,0,2,3,5,1]' :size=50 />
<Chaifen char='们' :parts='[2,3]' :size=50 />
<Chaifen char='一' :parts='[1]' :size=50 />
<Chaifen char='起' :parts='[7,3]' :size=50 />
<Chaifen char='吃' :parts='[3,2,1]' :size=50 />
<Chaifen char='饭' :parts='[3,2,2]' :size=50 />
</div>

- 如果打單字全碼的話，需要按`GFKgETmrRKYiFOdiFii_HOjzLGYiXDBo`。
- 如果打單字簡碼的話，需要按`G_ET_RK_FOd_F_HO_LG_XD`。
- 如果打詞語全碼的話，需要按`GFETRKFOFIHOLGXD`。

可以看到，詞語全碼有效降低了按鍵的次數。
:::
但是，詞語輸入也有其缺點，最主要的缺點包括：

- 如果詞庫太小，不是每個詞語都在詞庫中。很多時候還是需要打單字。
- 如果詞庫太大，則會出現大量的重碼，需要進行選擇，破壞了形碼輸入的流暢性。
- 你輸入一個詞語，卻發現它並不在詞庫中，就需要刪除後重新輸入單字。讓人感覺不悅。
- 人工分詞需要消耗額外的注意力。

**因此，精簡詞庫，熟悉詞庫，打單字和打詞語相結合，是形碼高手們的修煉之路。**
