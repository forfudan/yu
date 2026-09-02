#!/usr/bin/env node

/**
 * short-links.js — 給每一個頁面在站根上生一個短鏈。
 *
 *     /docs/yume   也可以寫成   /yume
 *     /learn/division            /division
 *
 * **為什麼是生成的靜態樁，而不是服務端跳轉**：站點託管在 GitHub Pages（見 README 與
 * `.github/workflows/`），那裏沒有 rewrite、沒有 redirect、沒有 `_redirects`。唯一能在
 * 構建產物裏表達「這個地址指向那個地址」的東西，就是一張會自己跳走的小 HTML。
 *
 * 樁裏三樣缺一不可：`canonical` 告訴搜索引擎正版在哪（不然兩個地址分走權重）、
 * `location.replace` 負責真正跳轉並**帶上 query 與 hash**、`meta refresh` 是關掉 JS 時
 * 的後路。三樣加起來不到 1 KB。
 *
 * **撞名的一律不生。** 兩個文件夾裏有同名頁時，短鏈指向誰都是猜——猜錯比沒有更糟。
 * 跳過的會列在構建日誌裏，加頁面時撞上了看得見。
 *
 * **兩個語言各省一層**：`/yume` → `/docs/yume`，`/zht/yume` → `/zht/docs/yume`。撞名
 * 是**各語言各算各的**——`zht/` 裏多一頁不會把簡體那邊的短鏈弄沒。
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const dist = path.join(projectRoot, 'dist')

// 與 `src/.vitepress/config.mts` 的 `base` 保持一致——GitHub Pages 預覽構建掛在 /yu/
// 下面，樁裏的絕對路徑得跟着走，否則跳到站外去了。
const base =
  process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES ? '/yu/' : '/'

// 這幾個名字不生短鏈：`index` 是每個文件夾都有的（指向誰都不對），其餘是站點自己的。
const RESERVED = new Set(['index', '404'])

// 樁自己的記號。**沒有它這一支就不能重跑**：第二趟會把上一趟生的樁當成「根上已有同名
// 頁」，於是一個短鏈都不生。CI 每次都是乾淨的 `dist`，但本機是常態。
const STUB_MARK = '<!-- yuhao:short-link -->'

/** 這個檔是上一趟生的樁嗎。 */
function isStub(file) {
  try {
    return fs.readFileSync(file, 'utf8').includes(STUB_MARK)
  } catch {
    return false
  }
}

if (!fs.existsSync(dist)) {
  console.error('❌ 沒有 dist/，先跑 vitepress build')
  process.exit(1)
}

/** `dir` 下所有頁面，回相對 `dir` 的 posix 路徑。跳過資源目錄。 */
function pages(dir, out = [], rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) {
      if (r === 'assets' || e.name.startsWith('.')) continue
      pages(path.join(dir, e.name), out, r)
    } else if (e.name.endsWith('.html')) {
      out.push(r)
    }
  }
  return out
}

const written = []
const clashes = []

/**
 * 給一個語言生短鏈。`prefix` 是它在 `dist` 下的根（簡體是 ``，繁體是 `zht`）。
 *
 * 兩個語言分開跑，撞名也就各算各的——`zht/` 裏加一頁不該把簡體那邊已經在用的短鏈
 * 弄沒。
 */
function generate(prefix) {
  const root = prefix ? path.join(dist, prefix) : dist
  if (!fs.existsSync(root)) return
  const all = pages(root).filter(
    // 簡體那一趟從 `dist` 掃起，要把繁體整棵樹排除掉，否則兩份混在一起算撞名。
    (p) => (prefix ? true : !p.startsWith('zht/'))
  )
  // 只有**在文件夾裏**的頁面才談得上「省掉文件夾」；已經在根上的本來就是短的。
  const nested = all.filter((p) => p.includes('/'))
  const rootNames = new Set(
    all
      .filter((p) => !p.includes('/') && !isStub(path.join(root, p)))
      .map((p) => p.slice(0, -5))
  )

  const byName = new Map()
  for (const p of nested) {
    const name = path.posix.basename(p, '.html')
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name).push(p)
  }

  for (const [name, paths] of [...byName].sort()) {
  if (RESERVED.has(name)) continue
  // 根上已經有同名的真頁面：那一個說了算，不能覆蓋。
  if (rootNames.has(name)) {
    clashes.push(`${prefix || '简'}/${name}（根上已有同名頁）`)
    continue
  }
  if (paths.length > 1) {
    clashes.push(`${prefix || '简'}/${name} → ${paths.join('、')}`)
    continue
  }
  const rel = prefix ? `${prefix}/${paths[0]}` : paths[0]
  const target = base + rel.slice(0, -5) // 去掉 .html，走站點的無後綴地址
  const html = `<!DOCTYPE html>
${STUB_MARK}
<html lang="zh-Hans-CN">
<head>
<meta charset="utf-8">
<title>${name}</title>
<link rel="canonical" href="${target}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
</head>
<body><a href="${target}">${target}</a></body>
</html>
`
  fs.writeFileSync(path.join(root, `${name}.html`), html, 'utf8')
  written.push(`${name} → ${target}`)
  }
}

generate('')
generate('zht')

console.log(`\n🔗 短鏈：生了 ${written.length} 個`)
if (clashes.length) {
  console.log(`   跳過 ${clashes.length} 個撞名的：`)
  for (const c of clashes) console.log(`     ${c}`)
}
