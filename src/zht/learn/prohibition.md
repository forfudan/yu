
<script setup>
import Chaifen from '@/chaifen/Chaifen.vue'
import MultiChaifen from '@/chaifen/MultiChaifen.vue'
</script>

# 宇浩拆分禁手

拆分之「禁手」，指的是無論任何時候都不應當出現一些拆分情形。它高於一切拆分規則。一旦某一個拆分候選中出現了「禁手」，則直接淘汰。禁手包括：散件不分割、豎向不包夾、橫間不穿心。

## 散件不分割

有一部分字根，本身存在離散的部件，比如`戈`字右上的點、`犬`字的右上的點、`三`字的三個橫等等。爲了保證拆字的直觀，保證檢字（尤其是大字集下）的便捷性，我們需要對字根的連續性做出要求，並將它認定爲字根的内在屬性。

字根的連續性定義如下：

非連續寫成、且被全包圍結構或半包圍結構分割的部件，不視爲一個字根。

::: tip 例

`为`字的兩點不可以被視爲字根`两点`，因爲它們非連續寫成、且被半包圍結構分割。  
<div class="flex justify-left flex-wrap">
<Chaifen char='为' :parts='[1,2,1]' />
✅
<Chaifen char='为' :parts='[1,2,1]' :colors='[1,2,1]' />
❌
</div>

`卵`字不拆`卯⺀`而拆成`卯丶丶`，因爲`卯`字的兩點非連續寫成、且被半包圍結構分割。
<div class="flex justify-left flex-wrap">
<Chaifen char='卵' :parts='[2,1,1,2,1]' :colors='[1,2,1,1,3]' />
✅
<Chaifen char='卵' :parts='[2,1,1,2,1]' :colors='[1,2,1,1,2]' />
❌
</div>
:::

## 豎向不包夾

不少字根中存在若干分散的部件。

::: tip 例

`二`和`三`中的橫畫是分離的。

`合`分爲了`人` `一` `口`三個部分。

`儿`分爲了`丿` `乚`兩個部分。
:::

這給了它們包夾其他字根的可能。如`亘`可看成`二`包夾`日`。

爲了防止拆分不直觀，我們做出規定，一個字根**可以橫向包夾，但不能縱向包夾**。

::: tip 例

`卿` = `卯彐厶`
<div class="flex justify-left flex-wrap">
<Chaifen char='卿' :parts='[3,3,2,2]' :colors='[1,0,0,1]' />
✅
<Chaifen char='卿' :parts='[3,3,2,2]' :colors='[1,0,0,4]' />
❌
</div>

`胤` = `儿幺月`
<div class="flex justify-left flex-wrap">
<Chaifen char='胤' :parts='[1,3,4,1]' :colors='[1,0,0,1]' />
✅
<Chaifen char='胤' :parts='[1,3,4,1]' :colors='[1,0,0,4]' />
❌
</div>

`亘` = `一日一`
<div class="flex justify-left flex-wrap">
<Chaifen char='亘' :parts='[1,4,1]' :colors='[1,0,3]' />
✅
<Chaifen char='亘' :parts='[1,4,1]' :colors='[1,0,1]' />
❌
</div>

`僵` = `亻一田一田一`

<div class="flex justify-left flex-wrap">
<Chaifen char='僵' :parts='[2,1,5,1,5,1]' :colors='[0,2,0,4,0,6]' />
✅
<Chaifen char='僵' :parts='[2,1,5,1,5,1]' :colors='[0,2,0,2,0,2]' />
❌
</div>
:::

這是因爲，漢字的左右對稱多於上下對稱。左右包夾是可預測的，但上下包夾往往不可預測，必須要觀察到最下方。

::: tip 如果設置了衣字根

某些輸入法設置了`衣下`字根，但`亠`和`𧘇`的出現並不總是成對的，必須看到最下方才能正確判斷。

<div class="flex justify-left flex-wrap">
<Chaifen char='襄' :parts='[2,11,4]' :colors='[1,0,1]' />
<Chaifen char='衮' :parts='[2,4,4]' :colors='[1,0,1]' />
<Chaifen char='兖' :parts='[2,4,2]' :colors='[1,0,2]' />
</div>

:::

## 橫間不穿心

爲了使拆分更加直觀，符合筆順，防止字根交叉粘連，我們規定：

`工土士干千禾キ王壬龶丰末未生古矢缶早羊虫`等字根不允許在`一一`間穿插其他字根。

這個規定在常用字中比較少見。

::: tip 例

`再`不拆`王冂`，而拆`一冂土`
<div class="flex justify-left flex-wrap">
<Chaifen char='再' :parts='[1,2,3]' />
✅
<Chaifen char='再' :parts='[1,2,3]' :colors='[1,0,1]' />
❌
</div>

`垂`不拆`壬龷`，而拆`千龷一`
<div class="flex justify-left flex-wrap">
<Chaifen char='垂' :parts='[3,4,1]' :colors='[1,2,3]' />
✅
<Chaifen char='垂' :parts='[3,4,1]' :colors='[1,0,1]' />
❌
</div>

`禹`不拆`丿虫冂`，而拆`丿口冂<丄丶>`
<div class="flex justify-left flex-wrap">
<Chaifen char='禹' :parts='[1,3,2,3]' :colors='[1,2,3,4]' />
✅
<Chaifen char='禹' :parts='[1,3,2,3]' :colors='[0,1,0,1]' />
❌
</div>

`妻`不拆 `キコ女`或`龶乛女`，而拆`十彐女`。
<div class="flex justify-left flex-wrap">
<Chaifen char='妻' :parts='[1,3,1,3]' :colors='[1,2,1,3]' />
✅
<Chaifen char='妻' :parts='[1,1,1,1,1,3]' :colors='[1,0,1,0,1,3]' />
❌
<Chaifen char='妻' :parts='[1,1,3,3]' :colors='[1,0,1,3]' />
❌
</div>

:::

## 對稱不擠壓

對稱形態的字根，不允許其中分散的一部分被擠壓到一邊。

這個規定在常用字中比較少見。

::: tip 例

`命`不拆`合卩`，而拆`人口一卩`。
<div class="flex justify-left flex-wrap">
<Chaifen char='命' :parts='[2,1,3,2]' />
✅
<Chaifen char='命' :parts='[6,2]' />
❌
</div>

:::
