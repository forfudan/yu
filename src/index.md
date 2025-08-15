---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "宇浩输入法"
  text: "情系汉字 沟通古今"
  tagline: 全汉字字形输入・繁简通打・极低选重
  image:
    dark: /logo_purple.png
    light: /logo_blue.png
    alt: yuhao-logo
  actions:
    - theme: alt
      text: 介绍
      link: /docs/
    - theme: brand
      text: 教程
      link: /learn/division
    - theme: alt
      text: 练习
      link: /practice/root
    - theme: alt
      text: 安装
      link: /install

---

<script setup>
import UnifiedSchemeInterface from '@/unified/UnifiedSchemeInterface.vue'
</script>

<div class="zigen-font">
<UnifiedSchemeInterface defaultScheme="star" />
</div>

::: tip 致有缘人

当你点开这个页面的时候，你就是一名有缘人。

从第一次牙牙学语，到知道自己名字的写法，再到于洁白的信纸上写下洋洋洒洒的文章。这每一座人生的里程碑，都是一次同母语母文的邂逅和牵连。上下五千年，东西九万里，中国历史上，多少人曾穷经皓首、青灯红烛，在不同的载体上，写下一个又一个的汉字。只在那方寸之间，将灿烂的中华文明，传承了一代又一代。

你是否怀念初中时代的书桌前，用几种颜色的中性笔，书写着自己青春的悸动？你是否记得高中时代，你曾以笔为剑，书写着生活、对国家的思考？你是否想起，曾经一笔一划抄录过下唐诗宋词。那些波澜壮阔，抑或是清新隽永的诗句，至今还让你不时地想起而心潮澎湃？

如果你怀念这种一笔一划书写地感觉，那么，你来对了地方。

宇浩输入法，就是这样的一款输入法：他为了创作而设计，对汉字怀有一份脉脉的温情。不同于拼音输入法需要先输入读音，再选择想要的汉字，宇浩输入法将汉字的部首和笔画，安排在键盘的 26 个按键上。当你连续按下一个汉字中若干部首，这个汉字便会跳到屏幕上。在宇浩输入法中，每一个汉字，都基本对应着唯一的编码。因此在输入地过程中，你并不需要进行「选择汉字」这个操作。就像你在写字的时候，从不会停下来选择汉字。

用了它，你在打字中便不会经历恼人的停顿，在无尽的菜单栏中搜索想要的那个汉字；你可以如同在纸上书写一般打字，享受一种「下笔如有神」的自由感和「我书我所想」的掌控度。你甚至可以忽略输入框，享受闭眼创作的乐趣，自由书写古今汉字，在现代文、文言文之间随心徜徉。

文字不再是一匹匹无羁的野马，而是你指间缓缓流淌的旋律。

「确定带来自由」。如果你心动于这种体验，说明你是一个既浪漫又有品味的人，不妨加入我们吧！

:::

::: info 鸣谢

感谢以下字形输入法的发明人、改编人、维护人、各平台方案制作者、插件作者、网页作者等：

- [王码五笔字形@王永民](http://www.wangma.net.cn/)
- [郑码@郑易理 郑珑](https://www.china-e.com.cn/li/main/zhengma/jj.htm)
- [仓颉@朱邦复](http://www.cbflabs.com/)
- [山人全息@谢振斌](https://siuze.github.io/ShanRenMaLTS/)
- [尔雅徐码@徐国银](http://xumax.cn/)〔[五二顶@局外人](https://github.com/Ace-Who/rime-xuma?tab=readme-ov-file)〕
- [真码@命](http://sixchou.ysepan.com/)
- [C42@谭淞宸](https://github.com/tansongchen/c42)〔[汉字自动拆分系统](https://chaifen.app/)〕
- [092](https://092wb.github.io/)
- [三码郑码@史岳](http://zzzm.ysepan.com/?xzpd=1)
- [小鹤音形@何海峰](https://flypy.com/)
- 蓝宝石@秋风
- [虎码@PeaceB](https://www.tiger-code.com/)〔[虎码测评网](http://assess.tiger-code.com/)〕
- [逸码@小泥巴](https://yb6b.github.io/yima/graceful-code/)
- [易码@小泥巴](https://yb6b.github.io/yima/)〔[测评工具](https://yb6b.github.io/#/)〕
- [吉蛋饼](https://lost-melody.github.io/wafel/)〔[仓输入法工具
](https://lost-melody.github.io/hamster-tools/)〕
[云码@为云](https://github.com/orbitoo/kumo)
[天码@宋天](http://soongsky.com/sky/)
[声笔系列@戴石麟](https://sbxlm.github.io/)
[星空键道@吅吅大山](https://xkinput.github.io/)〔[星猫键道](https://github.com/hugh7007/xmjd6-rere)〕

---

感谢在输入法的制作过程中，参与初期讨论和构思、帮助测试和宣传、提供技术支持、参与生态建设的朋友：

钱多多、阿吉、[王牌饼干](https://github.com/lost-melody)、[宋天](http://soongsky.com/)、[yb](https://github.com/yb6b)。

还有不少朋友为输入法的优化提出了宝贵的意见和建议，为输入法的推广助力，此处不一一致谢。

---

感谢以下输入平台：

[Rime中州韵](https://rime.im/)、[仓输入法](https://ihsiao.com/apps/hamster/)、[小小输入法](https://yong.dgod.net/)、大大输入法、百度输入法、搜狗输入法

---

感谢以下文化平台和项目：

[汉典网](https://www.zdic.net/)、[叶典网](http://yedict.com/zslf.htm)、[字统网](https://zi.tools/)、[天珩字库](http://cheonhyeong.com/Simplified/download.html)、[思源宋体](https://source.typekit.com/source-han-serif/cn/)

---

感谢以下网页框架、信息技术软件、技术项目：

[Vitepress](https://vitepress.dev/zh/)、[Just the docs](https://just-the-docs.com/)、[Python](https://www.python.org/)〔[Pandas](https://pandas.pydata.org/)〕、[Visual Studio Code](https://code.visualstudio.com/)、[FontForge](https://fontforge.org/en-US/)、[Hanzi Writer](https://hanziwriter.org/cn/)

---

感谢所有致力于中华文化传承发扬的前辈。

**知识的传承和发展，是人类通天的阶梯**

:::
