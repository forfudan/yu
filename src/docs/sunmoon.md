# 日月有常

::: warning 注意
本方案基于宇浩拆分，为 25.5 键、乱序、音托、前缀码、繁简通打方案。初始学习难度较大，请务必充分了解、分析、平衡其风险和收益后再决定是否学习使用。
:::

## 简介

日月输入法是基于宇浩拆分的衍生方案，也是世上第一款**纯形前缀码**方案，可完全离开空格键。其名源自《尚书大传》之「日月有常，星辰有行」。

本方案的字根或两码、或三码。称为大码、声码、韵码：

1. 大码在 `BCDFGHJKLMNPRSTVWXY` 键上乱序分布，共 20 键。
1. 声码严格取字根读音的声，在 `BCDFGHJKLMNPRSTVWXYZ` 等 21 个键上分布，`ZHㄓ CHㄔ SHㄕ`映射到 `SRK`上。部分字根为零声母，则不取声码。`Rㄖ`及`RENㄖㄣ`、`RUㄖㄨ`作零声处理。
1. 韵码严格取字根读音的韵，在 `AEIOU` 等 5 个键上分布，如遇多元音或特殊元音，则映射到 `AEIOU` 上。
   例如：`魚`的韵是 `ㄩ`，映射到 `E` 键上；`歐`的韵是 `ㄡ`，映射到 `e` 键上；`月`的韵是 `UEㄩㄝ`，映射到 `E` 键上。

注意，声码、韵码依照的是字根的实际读音，而不是汉语拼音。比如`一`的大码为`F`，声码为空，韵码为`I`，全码为`FI`。

单字取码规则共两条：

1. 取首根声码和韵码。
1. 依次取二、三、末字根的声码；
1. 不足五码时，补末根声码。
1. 不足五码时，补末根韵码。

注意到，**大码**和**声码**所在的键位（A区）同**韵码**所在的键位（B区）互斥，故而韵码可作为单字的自然分隔符。不满五码时，不用空格也可进行连续输入。

| 拼音 | 注音                     | 韵码                      | 举例 | 备注 |
| :--- | :----------------------- | ------------------------- | ---- | ---- |
| v    | 频率最高的字根，补码为 v | `口`                      | ---  | ---  |
| v    | 读音为 ㄩ 的，补码为 v   | `鱼魚雨禺予 月曰`         | ---  | ---  |
| i    | 读音为 ㄧ 的，补码为 i   | `一乙已乂弋亦衤 言羊用夭` | ---  | ---  |

本方案**全字集低重、繁简通打**，其关键数据如下：

- GB2312 重码数 175
- 国字常用字重码数 66
- GBK 重码数 2560
- 简体动态选重率 0.022%
- 繁体动态选重率 0.036%
- 繁简混合动态选重率 0.039%
- 全码速度当量 1.58

详见[《常见输入法重码数据》](./statistics.md)

以下为本方案的字根表，以供参考：

```md
┌──────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ dama ┆ root                                                                                                                                                       │
╞══════╪════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╡
│ b    ┆ 亦Bi 马Bma 示Bki 卤Blu 虎Bhu 卜Bbu 爪Bsa 瓜Bga                                                                                                             │
│ c    ┆ 来Cle 氵Cko 生Cke 禾Che 世Cki 女Cne 飞Cfo Co 乚Ci 乙Ci 癶Cbo 又Cu                                                                                         │
│ d    ┆ 甲Dja 宀Dma ⺍Dxi 电Dda 钅Djo 长Dre 口Dke 〇Dli 己Dji 已Di 末Dmo 未Do 母Dmu 彑Dji 言Da                                                                     │
│ f    ┆ 矢Fki 乃Fne 廴Fo 丿Fpe 𰀁Fka 鱼Fe 手Fke 壴Fsu 一Fi 牙Fa 匚Ffe 而Fo 面Fma 𠁁Fde Fo                                                                         │
│ g    ┆ 扌Gke 革Gge 豕Gki 九Gju 儿Go 夭Gi 牛Gnu 疒Gbi 广Ggo Go 罒Go 皿Gmo 目Gmu 贝Gbo 页Ge 麻Gma 鹿Glu                                                            │
│ h    ┆ 其Hqi 田Hta 自Hzi 走Hze 𠂤Hdo 亥Hhe 辰Hre 忄Hxo 习Hxi 鱼He 舟Hse 丁Hdi 下Hxa 乌Hu 鸟Hni 勹Hbi 册Hce 冂Hji 止Hsi 齿Hri 贝Hbo 页He 门Hme 斗Hde               │
│ j    ┆ 𬺰Jo 丰Jfe 刀Jdi Jo 饣Jki 心Jxo 夕Jxi 见Jja 上Jke 巴Jba 巳Jsi 日Ji 曰Je 早Jzi 爿Jpa 片Jpa 鬼Jgo 甶Jfu 寸Jci                                               │
│ k    ┆ 千Kqa 入Ke 里Kli 囗Ko 且Kqe 之Ksi 甫Kfu 丬Kqo 辛Kxo 三Ksa 八Kba 马Kma 纟Ksi 弓Kgi 古Kgu 凵Kka 屮Kci 戊Ku 戈Kge 弋Ki 彡Kka 彳Kri Ko 臼Kju 白Kbe 𦣞Ki 臣Kre │
│ l    ┆ 向Lxo 干Lga 正Lse 幺Li 糸Lsi 非Lfo 曲Lqe 欠Lqa 匕Lbi 兀Lu 丨Lgi 小Lxi 辶Lro 穴Lxe 方Lfe 了Lle 亠Lte Lo 高Lgi 𣎆Llo 亡Lo 子Lzi 予Le 长Lre 髟Lbi            │
│ m    ┆ 虫Mri 不Mbu 耳Mo 艮Mge 𠂇Mzo 𫝀Mu 丑Mre コMko 七Mqi 乜Mme 也Me 瓦Ma 工Mgi Mo 艹Mci 卅Msa 风Mfe                                                            │
│ n    ┆ 壬No 足Nzu 厶Nsi 缶Nfe No 月Ne 亍Nru 丶Nda No 冖Nmi 丆Nre 厂Nre 巛Nri 川Nri                                                                              │
│ p    ┆ 雨Pe 夫Pfu 大Pda 𡗗Pdi 犭Pqi 犬Pqi 豸Psi                                                                                                                   │
│ q    ┆ 殳Qku 几Qji 卯Qmi 丱Qgi 丩Qju 𠂎Qo                                                                                                                         │
│ r    ┆ 王Ro 门Rme 车Rre 黑Rho 㔾Rje 文Ri 身Rke 丌Rji 毛Rmi 石Rki 立Rli 鸟Rni 乌Ru                                                                                 │
│ s    ┆ 丂Ski 尸Ski 至Ssi 户Shu So 舌Ske 用Si 二So So 冫So ⺀So 尤Su 尢So 隶Sli 彐Sji 肀Se 木Smu                                                                 │
│ t    ┆ 皮Tpi 火Tho 尚Tke 巾Tjo 由Tu 十Tki 夂Tpu 攵Tpu 衤Ti To 𧘇To                                                                                               │
│ v    ┆ 讠Va 业Ve 山Vka 见Vja 车Vre 米Vmi 乂Vi 士Vki Vo 土Vtu 耂Vli 龶Vke 斤Vjo 𠂆Vi 户Vhu                                                                        │
│ w    ┆ 力Wli 禺We 水Wko 申Wke 佥Wqa 合Whe 人Wo 亻Wo 隹Wco 呙Wga 骨Wgu                                                                                             │
│ x    ┆ 金Xjo 食Xki 丷Xba 䒑Xci 羊Xo 𢆉Xo                                                                                                                          │
│ y    ┆ 刂Ydi 灬Ybi 阝Yfu 气Yqi 竹Ysu 𠂉Yo 酉Yu 西Yxi                                                                                                              │
└──────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 优缺点

本方案为首款纯形前缀码方案，优缺点都十分突出，故总结如下：

### 缺点

- 字根大码随机，初始学习难度较大，同键位字根之间的字形关系不强，难以进行相似字形联想记忆。
- 单字最高码长为五码，码长较长，不适合追求极致码长的用户。
- 本方案只专注於单字，不设词库。

### 优点

- 首根信息完整，大字集重码极低。
- 本方案不需要按空格，特别适合腱鞘炎患者。
- 双手互击、击键速度当量、用指分布极佳。
- 专注於单字，无需记忆词语，输入流畅。
