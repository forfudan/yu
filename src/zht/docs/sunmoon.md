# 日月有常

::: warning 注意
本方案基於宇浩拆分，爲 25.5 鍵、亂序、音托、前綴碼、繁簡通打方案。初始學習難度較大，請務必充分瞭解、分析、平衡其風險和收益後再決定是否學習使用。
:::

## 簡介

日月輸入法是基於宇浩拆分的衍生方案，也是世上第一款**純形前綴碼**方案，可完全離開空格鍵。其名源自《尚書大傳》之「日月有常，星辰有行」。

本方案的字根或兩碼、或三碼。稱爲大碼、聲碼、韻碼：

1. 大碼在 `BCDFGHJKLMNPRSTVWXY` 鍵上亂序分佈，共 20 鍵。
1. 聲碼取字根讀音的聲，在 `BCDFGHJKLMNPRSTVWXYZ` 等 21 個鍵上分佈，`ZHㄓ CHㄔ SHㄕ`映射到 `SRK`上。部分字根爲零聲母，則不取聲碼。`Rㄖ`及`RENㄖㄣ`、`RUㄖㄨ`作零聲處理。
1. 韻碼嚴格取字根讀音的韻，在 `AEIOU` 等 5 個鍵上分佈，如遇多元音或特殊元音，則映射到 `AEIOU` 上。
   例如：`魚`的韻是 `ㄩ`，映射到 `E` 鍵上；`歐`的韻是 `ㄡ`，映射到 `e` 鍵上；`月`的韻是 `UEㄩㄝ`，映射到 `E` 鍵上。

::: warning 注意
聲碼、韻碼依照的是字根的實際讀音，而不是漢語拼音。比如：

1. `一`的大碼爲`F`，聲碼爲空，韻碼爲`I`，全碼爲`FI`。
1. `二`的大碼爲`S`，聲碼爲空，韻碼爲`O`，是讀音`ERㄦ`的映射。

如果一個字根有若干讀音，一般取最常用的讀音作爲聲碼韻碼。有時也取不常用的讀音來增加手感，如`土`的聲碼取`D`。

如果一個字根無音，則聲碼爲空，韻碼取`O`。
:::

下表爲部分韻母對應的拼音、註音和韻碼：

| 完整拼音 | 註音 | 韻碼 | 舉例 | 備註 |
| :------- | :--- | ---- | ---- | ---- |
| a        | ㄚ   | A    | 巴   |      |
| ai       | ㄞ   | E    | 白   |      |
| an       | ㄢ   | A    | 干   |      |
| ang      | ㄤ   | E    | 上   |      |
| ao       | ㄠ   | I    | 勹   |      |
| e        | ㄜ   | E    | 禾   |      |
| ei       | ㄟ   | O    | 黑   |      |
| en       | ㄣ   | E    | 艮   |      |
| eng      | ㄥ   | E    | 生   |      |
| i        | ㄧ   | I    | 一   |      |
| ia       | ㄧㄚ | A    | 牙   |      |
| iao      | ㄧㄠ | I    | 幺   |      |
| iang     | ㄧㄤ | O    | 羊   |      |
| iê       | ㄧㄝ | E    | 也   |      |
| iou      | ㄧㄡ | U    | 又   |      |
| in       | ㄧㄣ | O    | 廴   |      |
| ing      | ㄧㄥ | I    | 丁   |      |
| iong     | ㄩㄥ | I    | 用   |      |
| ong      | ㄨㄥ | I    | 工   |      |
| ou       | ㄡ   | E    | 缶   |      |
| u        | ㄨ   | U    | 鳥   |      |
| ua       | ㄨㄚ | A    | 爪   |      |
| uan      | ㄨㄢ | I    | 川   |      |
| uang     | ㄨㄤ | O    | 王   |      |
| uen      | ㄨㄣ | I    | 文   |      |
| uo       | ㄨㄛ | O    | 𠂇    |      |
| üan      | ㄩㄢ | I    | 犬   |      |
| üê       | ㄩㄝ | E    | 月   |      |
| ü        | ㄩ   | V    | 魚   |      |
| ri       | ㄖ   | I    | 日   |      |
| ru       | ㄖㄨ | E    | 入   |      |
| ren      | ㄖㄣ | O    | 人   |      |

單字取碼規則如下：

1. 取首根大碼和聲碼。
1. 依次取二、三、末字根的大碼；
1. 不足五碼時，補末根聲碼。
1. 不足五碼時，補末根韻碼。

注意到，**大碼**和**聲碼**所在的鍵位（A區）同**韻碼**所在的鍵位（B區）互斥，故而韻碼可作爲單字的自然分隔符。不滿五碼時，不用空格也可進行連續輸入。

本方案**全字集低重、繁簡通打**，其關鍵數據如下：

- GB2312 重碼數 175
- 國字常用字重碼數 66
- GBK 重碼數 2560
- 簡體動態選重率 0.022%
- 繁體動態選重率 0.036%
- 繁簡混合動態選重率 0.039%
- 全碼速度當量 1.58

詳見[《常見輸入法重碼數據》](./statistics.md)

以下爲本方案的字根表，以供參考：

```md
┌──────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ dama ┆ root                                                                                                                                                       │
╞══════╪════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╡
│ b    ┆ 亦Bi 馬Bma 示Bki 鹵Blu 虎Bhu 卜Bbu 爪Bsa 瓜Bga                                                                                                             │
│ c    ┆ 來Cle 氵Cko 生Cke 禾Che 世Cki 女Cne 飛Cfo Co 乚Ci 乙Ci 癶Cbo 又Cu                                                                                         │
│ d    ┆ 甲Dja 宀Dma ⺍Dxi 电Dda 钅Djo 长Dre 口Dke 〇Dli 己Dji 已Di 末Dmo 未Do 母Dmu 彑Dji 言Da                                                                     │
│ f    ┆ 矢Fki 乃Fne 廴Fo 丿Fpe 𰀁Fka 鱼Fe 手Fke 壴Fsu 一Fi 牙Fa 匚Ffe 而Fo 面Fma 𠁁Fde Fo                                                                         │
│ g    ┆ 扌Gke 革Gge 豕Gki 九Gju 儿Go 夭Gi 牛Gnu 疒Gbi 广Ggo Go 罒Go 皿Gmo 目Gmu 貝Gbo 頁Ge 麻Gma 鹿Glu                                                            │
│ h    ┆ 其Hqi 田Hta 自Hzi 走Hze 𠂤Hdo 亥Hhe 辰Hre 忄Hxo 习Hxi 魚He 舟Hse 丁Hdi 下Hxa 乌Hu 鸟Hni 勹Hbi 冊Hce 冂Hji 止Hsi 齒Hri 贝Hbo 页He 門Hme 鬥Hde               │
│ j    ┆ 𬺰Jo 丰Jfe 刀Jdi Jo 饣Jki 心Jxo 夕Jxi 見Jja 上Jke 巴Jba 巳Jsi 日Ji 曰Je 早Jzi 爿Jpa 片Jpa 鬼Jgo 甶Jfu 寸Jci                                               │
│ k    ┆ 千Kqa 入Ke 里Kli 囗Ko 且Kqe 之Ksi 甫Kfu 丬Kqo 辛Kxo 三Ksa 八Kba 马Kma 纟Ksi 弓Kgi 古Kgu 凵Kka 屮Kci 戊Ku 戈Kge 弋Ki 彡Kka 彳Kri Ko 臼Kju 白Kbe 𦣞Ki 臣Kre │
│ l    ┆ 向Lxo 干Lga 正Lse 幺Li 糸Lsi 非Lfo 曲Lqe 欠Lqa 匕Lbi 兀Lu 丨Lgi 小Lxi 辶Lro 穴Lxe 方Lfe 了Lle 亠Lte Lo 高Lgi 𣎆Llo 亡Lo 子Lzi 予Le 長Lre 髟Lbi            │
│ m    ┆ 虫Mri 不Mbu 耳Mo 艮Mge 𠂇Mzo 𫝀Mu 丑Mre コMko 七Mqi 乜Mme 也Me 瓦Ma 工Mgi Mo 艹Mci 卅Msa 風Mfe                                                            │
│ n    ┆ 壬No 足Nzu 厶Nsi 缶Nfe No 月Ne 亍Nru 丶Nda No 冖Nmi 丆Nre 厂Nre 巛Nri 川Nri                                                                              │
│ p    ┆ 雨Pe 夫Pfu 大Pda 𡗗Pdi 犭Pqi 犬Pqi 豸Psi                                                                                                                   │
│ q    ┆ 殳Qku 几Qji 卯Qmi 丱Qgi 丩Qju 𠂎Qo                                                                                                                         │
│ r    ┆ 王Ro 门Rme 車Rre 黑Rho 㔾Rje 文Ri 身Rke 丌Rji 毛Rmi 石Rki 立Rli 鳥Rni 烏Ru                                                                                 │
│ s    ┆ 丂Ski 尸Ski 至Ssi 户Shu So 舌Ske 用Si 二So So 冫So ⺀So 尤Su 尢So 隶Sli 彐Sji 肀Se 木Smu                                                                 │
│ t    ┆ 皮Tpi 火Tho 尚Tke 巾Tjo 由Tu 十Tki 夂Tpu 攵Tpu 衤Ti To 𧘇To                                                                                               │
│ v    ┆ 讠Va 业Ve 山Vka 见Vja 车Vre 米Vmi 乂Vi 士Vki Vo 土Vtu 耂Vli 龶Vke 斤Vjo 𠂆Vi 戶Vhu                                                                        │
│ w    ┆ 力Wli 禺We 水Wko 申Wke 僉Wqa 合Whe 人Wo 亻Wo 隹Wco 咼Wga 骨Wgu                                                                                             │
│ x    ┆ 金Xjo 食Xki 丷Xba 䒑Xci 羊Xo 𢆉Xo                                                                                                                          │
│ y    ┆ 刂Ydi 灬Ybi 阝Yfu 气Yqi 竹Ysu 𠂉Yo 酉Yu 西Yxi                                                                                                              │
└──────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 優缺點

本方案爲首款純形前綴碼方案，優缺點都十分突出，故總結如下：

### 缺點

- 字根大碼隨機，初始學習難度較大，同鍵位字根之間的字形關係不強，難以進行相似字形聯想記憶。
- 單字最高碼長爲五碼，碼長較長，不適合追求极致碼長的用户。
- 本方案只專注於單字，不設詞庫。

### 優點

- 首根信息完整，大字集重碼極低。
- 本方案不需要按空格，特别適合腱鞘炎患者。
- 雙手互擊、擊鍵速度當量、用指分佈極佳。
- 專注於單字，無需記憶詞語，輸入流暢。
