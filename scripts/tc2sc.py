# %%
import os
import re

import opencc

t2s = opencc.OpenCC("t2s")

paths_of_docs = [
    "/index.md",
    "/install.md",
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
    "/docs/tianma.md",
    "/docs/yima.md",
    "/docs/characteristics.md",
    "/docs/sypy.md",
    "/docs/coverage.md",
    "/docs/faq.md",
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
    # 拆分
    "/chaifen/index.md",
    "/chaifen/light.md",
    "/chaifen/joy.md",
    "/chaifen/ming.md",
    # 天碼
    "/sky/index.md",
    "/sky/search.md",
    "/sky/practice.md",
    # 徐碼
    "/xuma/index.md",
    "/xuma/learn.md",
]

for path_of_doc in paths_of_docs:
    with open("src/zht" + path_of_doc, mode="r", encoding="utf8") as temp:
        doc = temp.read()
    if not doc.startswith("<!-- do not translate -->"):
        pat = re.compile(
            r"((?:<!-- do not translate -->[\S\s]+?<!-- do not translate -->)|(?:`.+?`)|(?:<.+?>)|(?:[^`<>]+)|(?:[\r\n]+)|(?:[<>]))+?"
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
