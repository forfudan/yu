# %%
import os
import re

import opencc

t2s = opencc.OpenCC("t2s")

paths_of_docs = [
    "/index.md",
    "/docs/index.md",
    "/docs/changelog.md",
    "/docs/developing.md",
    "/docs/technical.md",
    "/docs/discussion.md",
    "/docs/background.md",
    "/docs/statistics.md",
    "/docs/concepts.md",
    "/docs/coding.md",
    "/docs/guji.md",
    "/docs/yuniversus.md",
    "/docs/star.md",
    "/docs/light.md",
    "/docs/wafel.md",
    "/docs/ming.md",
    "/docs/ling.md",
    "/docs/joy.md",
    "/docs/characteristics.md",
    "/docs/coverage.md",
    "/docs/faq.md",
    "/docs/gene.md", # 已遷移至 /ime/gene，保留重定向頁面
    # 教程
    "/learn/index.md",
    "/learn/division.md",
    "/learn/prohibition.md",
    "/learn/intrinsic.md",
    "/learn/variation.md",
    "/learn/radicals.md",
    "/learn/grouping.md",
    "/learn/machine.md",
    # 星陳
    "/learn/roots.md",
    "/learn/chars.md",
    "/learn/quick.md",
    "/learn/words.md",
    "/learn/lexicon.md",
    # 日月
    "/learn/roots_ming.md",
    "/learn/chars_ming.md",
    # 靈明
    "/learn/roots_ling.md",
    "/learn/chars_ling.md",
    "/learn/quick_ling.md",
    # 例子
    "/learn/examples.md",
    "/learn/frequent.md",
    "/learn/frequent_tc.md",
    # 練習
    "/practice/root.md",
    "/practice/char.md",
    "/practice/char_tw.md",
    "/practice/root_light.md",
    "/practice/char_light.md",
    "/practice/root_joy.md",
    "/practice/char_joy.md",
    "/practice/char_joy_zhu.md",
    "/practice/root_ming.md",
    "/practice/char_ming.md",
    "/practice/char_ming_zhu.md",
    "/practice/root_ling.md",
    "/practice/char_ling.md",
    "/practice/char_ling_zhu.md",
    "/practice/root_wafel.md",
    "/practice/tupa.md",
    "/practice/root_sky.md",
    # 安裝
    "/docs/install.md",
    # 在線輸入
    "/pad/ling.md",
    "/pad/ling5.md",
    "/pad/ming.md",
    # DIY
    "/diy/index.md",
    # 大觀
    "/ime/index.md",
    "/ime/gene.md", # 系絡圖
    "/ime/sypy.md", # 宇浩詩韻拼音
    "/ime/sky.md", # 天碼
    "/ime/xuma.md", # 徐碼
    "/ime/yima.md", # 易碼
    "/ime/sbmm.md",
    "/ime/moling.md", # 魔靈
    "/ime/yueling.md", # 月靈
    "/ime/yaoling.md", # 妖靈
    "/ime/xingyue.md", # 星月
    "/ime/lingluan.md", # 靈亂
]

for path_of_doc in paths_of_docs:
    with open("src/zht" + path_of_doc, mode="r", encoding="utf8") as temp:
        doc = temp.read()
    if not (
        doc.startswith("<!-- do not translate -->")
        or doc.startswith("<!-- verbatim -->")
    ):
        pat = re.compile(
            r"((?:<!-- do not translate -->[\S\s]+?<!-- do not translate -->)|(?:<!-- verbatim -->[\S\s]+?<!-- verbatim -->)|(?:`.+?`)|(?:<.+?>)|(?:[^`<>]+)|(?:[\r\n]+)|(?:[<>]))+?"
        )
        res = re.findall(pat, doc)
        res_zht = []
        for i in res:
            if i.startswith("`") or i.startswith("<"):
                res_zht.append(i)
            else:
                res_zht.append(t2s.convert(i))
        output = "".join(res_zht)
        print(path_of_doc, "translated.")
    else:
        output = doc
        print(path_of_doc, "not translated.")
    output = output.replace("/zht/", "/")
    output_path = "src" + path_of_doc
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, mode="w", encoding="utf8") as temp:
        temp.write(output)
