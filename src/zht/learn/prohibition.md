
<script setup>
import CharPlot from '@/plot/CharPlot.vue'
import MultiCharPlot from '@/plot/MultiCharPlot.vue'
</script>

# 宇浩拆分禁手

拆分之「禁手」，指的是無論任何時候都不應當出現一些拆分情形。它高於一切拆分規則。一旦某一個拆分候選中出現了「禁手」，則直接淘汰。禁手包括：散件不分割、豎向不包夾、橫間不穿心。

## 散件不分割

有一部分字根，本身存在離散的部件，比如「戈」字右上的點、「犬」字的右上的點、「三」字的三個橫等等。爲了保證拆字的直觀，保證檢字（尤其是大字集下）的便捷性，我們需要對字根的連續性做出要求，並將它認定爲字根的内在屬性。

字根的連續性定義如下：

非連續寫成、且被全包圍結構或半包圍結構分割的部件，不視爲一個字根。

::: tip 例字

「为」字的兩點不可以被視爲字根「两点」，因爲它們非連續寫成、且被半包圍結構分割。

<div class="flex justify-left flex-wrap">
<CharPlot char='为' :parts='[1,2,1]' />
✅
<CharPlot char='为' :parts='[1,2,1]' :colors='[1,2,1]' />
❌
</div>

---

「卵」字不拆「卯⺀」而拆成「卯丶丶」，因爲「卯」字的兩點非連續寫成、且被半包圍結構分割。

<div class="flex justify-left flex-wrap">
<CharPlot char='卵' :parts='[2,1,1,2,1]' :colors='[1,2,1,1,3]' />
✅
<CharPlot char='卵' :parts='[2,1,1,2,1]' :colors='[1,2,1,1,2]' />
❌
</div>

:::

## 豎向不包夾

不少字根中存在若干分散的部件。

::: tip 例字

「二」和「三」中的橫畫是分離的。

「合」分爲了「人」「一」「口」三個部分。

「儿」分爲了「丿」「乚」兩個部分。

:::

這給了它們包夾其他字根的可能。如「亘」可看成「二」包夾「日」。

爲了防止拆分不直觀，我們做出規定，一個字根**可以橫向包夾，但不能縱向包夾**。

::: tip 例字

「卿」拆「卯」

<div class="flex justify-left flex-wrap">
<CharPlot char='卿' :parts='[3,3,2,2]' :colors='[1,0,0,1]' />
✅
<CharPlot char='卿' :parts='[3,3,2,2]' :colors='[1,0,0,4]' />
❌
</div>

---

「胤」拆「儿幺月」

<div class="flex justify-left flex-wrap">
<CharPlot char='胤' :parts='[1,3,4,1]' :colors='[1,0,0,1]' />
✅
<CharPlot char='胤' :parts='[1,3,4,1]' :colors='[1,0,0,4]' />
❌
</div>

---

「亘」拆「一日一」

<div class="flex justify-left flex-wrap">
<CharPlot char='亘' :parts='[1,4,1]' :colors='[1,0,3]' />
✅
<CharPlot char='亘' :parts='[1,4,1]' :colors='[1,0,1]' />
❌
</div>

---

「僵」拆「亻一田一田一」

<div class="flex justify-left flex-wrap">
<CharPlot char='僵' :parts='[2,1,5,1,5,1]' :colors='[0,2,0,4,0,6]' />
✅
<CharPlot char='僵' :parts='[2,1,5,1,5,1]' :colors='[0,2,0,2,0,2]' />
❌
</div>

:::

這是因爲，漢字的左右對稱多於上下對稱。左右包夾是可預測的，但上下包夾往往不可預測，必須要觀察到最下方。

::: tip 爲什麼「衣」字根不應當設置

某些輸入法設置了「衣」字根，且允許包夾其他的字根。從某些角度來説，是不妥當的。原因有二：

首先，「亠」和「𧘇」的出現並不總是成對的，必須看到最下方才能正確判斷。

<div class="flex justify-left flex-wrap">
<CharPlot char='襄' :parts='[2,11,4]' :colors='[1,0,1]' />
<CharPlot char='衮' :parts='[2,4,4]' :colors='[1,0,1]' />
<CharPlot char='兖' :parts='[2,4,2]' :colors='[1,0,2]' />
</div>

其次，「衣」中的「亠𧘇」部件是相連的，如果允許將它們分離並豎向包夾其他字根，則會出現「𡉊」是否應當被拆分爲「王八」的問題。

:::

## 橫間不穿心

爲了使拆分更加直觀，符合筆順，防止字根交叉粘連，我們規定：

「<!-- verbatim -->工土士干千禾王壬龶丰末未生古矢缶早羊虫<!-- verbatim -->」等字根的「一一」之間不允許穿插其他字根。

這個規定在常用字中比較少見。

::: tip 例字

「再」不拆「王冂」，而拆「一冂土」。

<div class="flex justify-left flex-wrap">
<CharPlot char='再' :parts='[1,2,3]' />
✅
<CharPlot char='再' :parts='[1,2,3]' :colors='[1,0,1]' />
❌
</div>

---

「垂」不拆「壬龷」，而拆「千龷一」。

<div class="flex justify-left flex-wrap">
<CharPlot char='垂' :parts='[3,4,1]' :colors='[1,2,3]' />
✅
<CharPlot char='垂' :parts='[3,4,1]' :colors='[1,0,1]' />
❌
</div>

---

「禹」不拆「丿虫冂」，而拆「丿口冂丄丶」。

<div class="flex justify-left flex-wrap">
<CharPlot char='禹' :parts='[1,3,2,3]' :colors='[1,2,3,4]' />
✅
<CharPlot char='禹' :parts='[1,3,2,3]' :colors='[0,1,0,1]' />
❌
</div>

---

「妻」不拆「コ女」或「龶乛女」，而拆「十彐女」。

<div class="flex justify-left flex-wrap">
<CharPlot char='妻' :parts='[1,3,1,3]' :colors='[1,2,1,3]' />
✅
<CharPlot char='妻' :parts='[1,1,1,1,1,3]' :colors='[1,0,1,0,1,3]' />
❌
<CharPlot char='妻' :parts='[1,1,3,3]' :colors='[1,0,1,3]' />
❌
</div>

:::
