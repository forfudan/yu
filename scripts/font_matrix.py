# %%
import numpy as np
import pandas as pd

all = 1280
start = 0xF400
end = start + all
width = 16
arr = np.empty((all // width, width), dtype="str")

for i, uni in enumerate(range(start, end)):
    arr[int(i / width), i % width] = chr(uni)

df = pd.DataFrame(arr)

columns = [hex(i)[5:].upper() for i in range(start, start + width)]
rows = [hex(i)[2:5].upper() for i in range(start, end, width)]

df.columns = pd.Index(columns)
df.index = pd.Index(rows)
print(df.to_markdown())

# %%
