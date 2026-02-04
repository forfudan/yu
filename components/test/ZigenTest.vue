<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { withBase } from 'vitepress'
import { makeCodesFromDivision } from '../search/share'
import type { Chaifen, Zigen } from '../search/share'

interface ZigenTableRow {
  font: string
  ma: string
  pinyin?: string
  editedMa?: string // 用戶編輯的編碼
}

interface CharsetStats {
  name: string
  totalChars: number
  duplicateCount: number
  duplicateRate: number
  duplicateChars: Set<string> // 存儲重碼字
}

interface DynamicStats {
  zhihu: number // 知乎簡體動態選重率
  sc: number // 北語簡體動態選重率
  tc: number // 台標繁體動態選重率
  guji: number // 古籍繁體動態選重率
  unified: number // 繁簡聯合動態選重率
}

interface ComparisonResult {
  added: string[] // 新增的重碼字
  removed: string[] // 減少的重碼字
}

interface CharsetRecord {
  is_gb2312: boolean
  is_tonggui: boolean
  is_guozi: boolean
}

type CharsetData = Record<string, CharsetRecord>

const zigenList = ref<ZigenTableRow[]>([])
const chaifenMap = ref<Map<string, Chaifen>>(new Map())
const charsetData = ref<CharsetData | null>(null)
const loading = ref(true)
const calculating = ref(false)

// 原始統計結果
const originalStats = ref<CharsetStats[]>([])
// 修改後的統計結果
const modifiedStats = ref<CharsetStats[]>([])
// 對比結果
const comparison = ref<Map<string, ComparisonResult>>(new Map())

// 字頻數據
const charFrequencies = ref<{
  zhihu: Record<string, number>
  sc: Record<string, number>
  tc: Record<string, number>
  guji: Record<string, number>
  unified: Record<string, number>
} | null>(null)

// 動態選重率
const originalDynamicStats = ref<DynamicStats | null>(null)
const modifiedDynamicStats = ref<DynamicStats | null>(null)

// 加載字符集數據
async function loadCharsetData() {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/forfudan/yuhao-assess-data@main/data/charsets.json')
    charsetData.value = await response.json()
  } catch (error) {
    console.error('Failed to load charset data:', error)
    charsetData.value = {}
  }
}

// 加載字頻數據
async function loadCharFrequencies() {
  try {
    // 使用jsdelivr CDN加載yuhao-assess項目的字頻數據
    const baseUrl = 'https://cdn.jsdelivr.net/gh/forfudan/yuhao-assess-data@main'
    const [zhihuRes, scRes, tcRes, gujiRes] = await Promise.all([
      fetch(`${baseUrl}/data/charAbsoluteFrequencyZhihu.json`),
      fetch(`${baseUrl}/data/charAbsoluteFrequencySC.json`),
      fetch(`${baseUrl}/data/charAbsoluteFrequencyTC.json`),
      fetch(`${baseUrl}/data/charAbsoluteFrequencyGuji.json`)
    ])
    
    // 檢查所有響應是否成功
    if (!zhihuRes.ok || !scRes.ok || !tcRes.ok || !gujiRes.ok) {
      throw new Error(`HTTP error: ${[zhihuRes, scRes, tcRes, gujiRes].map(r => r.status).join(', ')}`)
    }
    
    const [zhihu, sc, tc, guji] = await Promise.all([
      zhihuRes.json(),
      scRes.json(),
      tcRes.json(),
      gujiRes.json()
    ])
    
    // 歸一化函數：將字頻數據轉換為概率分布（總和為1）
    const normalizeFrequency = (freq: Record<string, number>): Record<string, number> => {
      const total = Object.values(freq).reduce((sum, val) => sum + val, 0)
      if (total === 0) return freq
      
      const normalized: Record<string, number> = {}
      for (const [char, val] of Object.entries(freq)) {
        normalized[char] = val / total
      }
      return normalized
    }
    
    // 歸一化所有字頻數據
    const zhihuNorm = normalizeFrequency(zhihu)
    const scNorm = normalizeFrequency(sc)
    const tcNorm = normalizeFrequency(tc)
    const gujiNorm = normalizeFrequency(guji)
    
    // 生成繁簡聯合字頻（先合併再歸一化）
    const unifiedRaw: Record<string, number> = {}
    for (const [char, freq] of Object.entries(sc)) {
      unifiedRaw[char] = (freq as number)
    }
    for (const [char, freq] of Object.entries(tc)) {
      if (unifiedRaw[char]) {
        unifiedRaw[char] += (freq as number)
      } else {
        unifiedRaw[char] = (freq as number)
      }
    }
    const unifiedNorm = normalizeFrequency(unifiedRaw)
    
    // 保存歸一化後的數據
    charFrequencies.value = {
      zhihu: zhihuNorm,
      sc: scNorm,
      tc: tcNorm,
      guji: gujiNorm,
      unified: unifiedNorm
    }
  } catch (error) {
    console.error('Failed to load char frequencies:', error)
    charFrequencies.value = null
  }
}

// 判斷字符是否在指定字符集中
function isInCharset(char: string, charsetType: string): boolean {
  if (!charsetData.value || !charsetData.value[char]) return false
  
  const record = charsetData.value[char]
  switch (charsetType) {
    case 'gb2312':
      return record.is_gb2312 || false
    case 'tonggui':
      return record.is_tonggui || false
    case 'guozi':
      return record.is_guozi || false
    case 'tonggui_guozi':
      return record.is_tonggui || record.is_guozi || false
    default:
      return false
  }
}

// 判斷字符是否在CJK基本集
function isInCJKBasic(char: string): boolean {
  const codePoint = char.codePointAt(0)
  if (!codePoint) return false
  return codePoint >= 0x4E00 && codePoint <= 0x9FFF
}

// 加載字根表
async function loadZigenTable(url: string) {
  const response = await fetch(withBase(url))
  const text = await response.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  const list: ZigenTableRow[] = []
  // 跳過標題行
  for (let i = 1; i < lines.length; i++) {
    const [font, ma, pinyin] = lines[i].split(',')
    if (font && ma) {
      list.push({ font, ma, pinyin })
    }
  }
  
  zigenList.value = list
}

// 加載拆分表
async function loadChaifenTable(url: string) {
  const response = await fetch(withBase(url))
  const text = await response.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  const map = new Map<string, Chaifen>()
  
  // 跳過標題行
  for (let i = 1; i < lines.length; i++) {
    const [char, division, division_tw, region] = lines[i].split(',')
    if (char && division) {
      // 檢查是否在 CJK基本集 或 通規 或 GB2312 或 國字
      const inCJKBasic = isInCJKBasic(char)
      const inTargetCharsets = charsetData.value && (
        charsetData.value[char]?.is_tonggui ||
        charsetData.value[char]?.is_gb2312 ||
        charsetData.value[char]?.is_guozi
      )
      
      if (inCJKBasic || inTargetCharsets) {
        map.set(char, { char, division, division_tw: division_tw || '', region: region || '' })
      }
    }
  }
  
  chaifenMap.value = map
}

// 獲取當前使用的字根映射（考慮用戶編輯）
function getCurrentZigenMap(): Map<string, Zigen> {
  const map = new Map<string, Zigen>()
  for (const row of zigenList.value) {
    const ma = row.editedMa || row.ma
    map.set(row.font, { font: row.font, ma, pinyin: row.pinyin })
  }
  return map
}

// 計算單字編碼表
function calculateCodeTable(zigenMap: Map<string, Zigen>): Map<string, string> {
  const codeTable = new Map<string, string>()
  
  for (const [char, chaifen] of chaifenMap.value.entries()) {
    const code = makeCodesFromDivision(chaifen.division, zigenMap, 'ling').toLowerCase()
    if (code && !code.includes('?')) {
      codeTable.set(char, code)
    }
  }
  
  return codeTable
}

// 計算動態選重率（基於字頻）
function calculateDynamicDupRate(
  codeTable: Map<string, string>,
  charFrequency: Record<string, number>
): number {
  const codeToCharFreqs = new Map<string, Array<{ char: string; freq: number }>>()
  
  for (const [char, code] of codeTable.entries()) {
    const freq = charFrequency[char] || 0
    if (!codeToCharFreqs.has(code)) {
      codeToCharFreqs.set(code, [])
    }
    codeToCharFreqs.get(code)!.push({ char, freq })
  }
  
  let totalDupFreq = 0
  
  for (const charFreqs of codeToCharFreqs.values()) {
    if (charFreqs.length > 1) {
      // 按字頻降序排序
      charFreqs.sort((a, b) => b.freq - a.freq)
      
      const groupTotalFreq = charFreqs.reduce((sum, item) => sum + item.freq, 0)
      const firstCharFreq = charFreqs[0].freq
      totalDupFreq += groupTotalFreq - firstCharFreq
    }
  }
  
  // 只統計在字頻表中有記錄的字符的總頻率
  let totalFreq = 0
  for (const [char] of codeTable.entries()) {
    const freq = charFrequency[char]
    if (freq !== undefined && freq > 0) {
      totalFreq += freq
    }
  }
  
  return totalFreq > 0 ? totalDupFreq / totalFreq : 0
}

// 計算所有字頻的動態選重率
function calculateAllDynamicStats(codeTable: Map<string, string>): DynamicStats | null {
  if (!charFrequencies.value) {
    return null
  }
  
  return {
    zhihu: calculateDynamicDupRate(codeTable, charFrequencies.value.zhihu),
    sc: calculateDynamicDupRate(codeTable, charFrequencies.value.sc),
    tc: calculateDynamicDupRate(codeTable, charFrequencies.value.tc),
    guji: calculateDynamicDupRate(codeTable, charFrequencies.value.guji),
    unified: calculateDynamicDupRate(codeTable, charFrequencies.value.unified)
  }
}

// 計算重碼統計
function calculateDuplicateStats(
  codeTable: Map<string, string>,
  charsetTypes: string[]
): CharsetStats[] {
  const stats: CharsetStats[] = []
  
  for (const charsetType of charsetTypes) {
    // 第一步：過濾出屬於該字符集的字符
    const charsInCharset = Array.from(codeTable.keys()).filter(char => {
      if (charsetType === 'cjk_basic') {
        return isInCJKBasic(char)
      } else {
        return isInCharset(char, charsetType)
      }
    })
    
    // 創建該字符集的Set用於快速查找
    const charsetSet = new Set(charsInCharset)
    
    // 第二步：按編碼分組所有字符（不只是字符集內的）
    const codeToChars = new Map<string, string[]>()
    for (const [char, code] of codeTable.entries()) {
      if (!codeToChars.has(code)) {
        codeToChars.set(code, [])
      }
      codeToChars.get(code)!.push(char)
    }
    
    // 第三步：只統計該字符集內共享編碼的重碼字符
    const duplicateChars = new Set<string>()
    let duplicateCount = 0
    
    for (const [code, chars] of codeToChars.entries()) {
      // 統計該編碼組中有多少字符屬於當前字符集
      const charsInThisCharset = chars.filter(char => charsetSet.has(char))
      
      // 只有當字符集內有多個字符共享同一編碼時才計為重碼
      if (charsInThisCharset.length > 1) {
        duplicateCount += charsInThisCharset.length
        charsInThisCharset.forEach(char => duplicateChars.add(char))
      }
    }
    
    const charsetNames: Record<string, string> = {
      'gb2312': 'GB2312',
      'tonggui': '通用規範',
      'guozi': '常用國字',
      'tonggui_guozi': '通規+國字',
      'cjk_basic': 'CJK基本集'
    }
    
    stats.push({
      name: charsetNames[charsetType] || charsetType,
      totalChars: charsInCharset.length,
      duplicateCount,
      duplicateRate: charsInCharset.length > 0 ? duplicateCount / charsInCharset.length : 0,
      duplicateChars
    })
  }
  
  return stats
}

// 對比兩次統計結果
function compareStats(oldStats: CharsetStats[], newStats: CharsetStats[]) {
  const comp = new Map<string, ComparisonResult>()
  
  for (let i = 0; i < oldStats.length; i++) {
    const oldSet = oldStats[i].duplicateChars
    const newSet = newStats[i].duplicateChars
    const name = oldStats[i].name
    
    const added = Array.from(newSet).filter(char => !oldSet.has(char))
    const removed = Array.from(oldSet).filter(char => !newSet.has(char))
    
    comp.set(name, { added, removed })
  }
  
  comparison.value = comp
}

// 初始化加載
onMounted(async () => {
  try {
    loading.value = true
    
    // 第一步：先加載字符集數據（必須先加載）
    await loadCharsetData()
    
    // 第二步：加載其他數據（可以並行）
    await Promise.all([
      loadZigenTable('/zigen-ling.csv'),
      loadChaifenTable('/chaifen.csv'),
      loadCharFrequencies()
    ])
    
    // 計算原始統計
    const zigenMap = getCurrentZigenMap()
    const codeTable = calculateCodeTable(zigenMap)
    const charsetTypes = ['gb2312', 'tonggui', 'guozi', 'tonggui_guozi', 'cjk_basic']
    originalStats.value = calculateDuplicateStats(codeTable, charsetTypes)
    originalDynamicStats.value = calculateAllDynamicStats(codeTable)
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
})

// 處理用戶輸入
function handleInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  zigenList.value[index].editedMa = target.value
}

// 處理回車鍵重新計算
function handleEnter(index: number) {
  recalculate()
}

// 重新計算
function recalculate() {
  if (calculating.value) return
  
  calculating.value = true
  try {
    const zigenMap = getCurrentZigenMap()
    const codeTable = calculateCodeTable(zigenMap)
    const charsetTypes = ['gb2312', 'tonggui', 'guozi', 'tonggui_guozi', 'cjk_basic']
    modifiedStats.value = calculateDuplicateStats(codeTable, charsetTypes)
    modifiedDynamicStats.value = calculateAllDynamicStats(codeTable)
    
    // 對比結果
    compareStats(originalStats.value, modifiedStats.value)
  } finally {
    calculating.value = false
  }
}

// 一鍵還原所有編輯
function resetAllEdits() {
  // 清空所有用戶編輯
  for (const row of zigenList.value) {
    row.editedMa = undefined
  }
  // 清空修改后的統計和對比結果
  modifiedStats.value = []
  modifiedDynamicStats.value = null
  comparison.value.clear()
}

// 格式化百分比
function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}
</script>

<template>
  <div v-if="loading" class="loading">加載中...</div>
  <div v-else class="zigen-test-container">
    <!-- 左側：字根表 -->
    <div class="left-panel">
      <div class="panel-header">
        <h3>字根表編輯</h3>
        <button 
          v-if="modifiedStats.length > 0"
          @click="resetAllEdits" 
          class="reset-btn"
          title="還原所有修改"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          還原
        </button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>字根</th>
              <th>編碼</th>
              <th>修改編碼</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in zigenList" :key="index" :class="{ 'edited-row': row.editedMa }">
              <td class="zigen-cell zigen-font">{{ row.font }}</td>
              <td class="code-cell">{{ row.ma }}</td>
              <td class="input-cell">
                <input
                  type="text"
                  :value="row.editedMa || ''"
                  :placeholder="row.ma"
                  @input="handleInput(index, $event)"
                  @keyup.enter="handleEnter(index)"
                  class="code-input"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 右側：統計結果 -->
    <div class="right-panel">
      <!-- 原始統計 -->
      <div class="stats-section">
        <h4>原始統計</h4>
        <table class="compact-stats-table">
          <thead>
            <tr>
              <th>GB2312</th>
              <th>通規</th>
              <th>國字</th>
              <th>通+國</th>
              <th>CJK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ originalStats[0]?.duplicateCount || 0 }}</td>
              <td>{{ originalStats[1]?.duplicateCount || 0 }}</td>
              <td>{{ originalStats[2]?.duplicateCount || 0 }}</td>
              <td>{{ originalStats[3]?.duplicateCount || 0 }}</td>
              <td>{{ originalStats[4]?.duplicateCount || 0 }}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- 動態選重率 -->
        <div v-if="originalDynamicStats" class="dynamic-stats">
          <table class="compact-stats-table">
            <thead>
              <tr>
                <th>知乎</th>
                <th>北語</th>
                <th>臺繁</th>
                <th>古籍</th>
                <th>繁簡</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ (originalDynamicStats.zhihu * 10000).toFixed(2) }}‱</td>
                <td>{{ (originalDynamicStats.sc * 10000).toFixed(2) }}‱</td>
                <td>{{ (originalDynamicStats.tc * 10000).toFixed(2) }}‱</td>
                <td>{{ (originalDynamicStats.guji * 10000).toFixed(2) }}‱</td>
                <td>{{ (originalDynamicStats.unified * 10000).toFixed(2) }}‱</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 修改後統計 -->
      <div v-if="modifiedStats.length > 0" class="stats-section modified">
        <h4>修改後統計</h4>
        <table class="compact-stats-table">
          <thead>
            <tr>
              <th>GB2312</th>
              <th>通規</th>
              <th>國字</th>
              <th>通+國</th>
              <th>CJK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ modifiedStats[0]?.duplicateCount || 0 }}</td>
              <td>{{ modifiedStats[1]?.duplicateCount || 0 }}</td>
              <td>{{ modifiedStats[2]?.duplicateCount || 0 }}</td>
              <td>{{ modifiedStats[3]?.duplicateCount || 0 }}</td>
              <td>{{ modifiedStats[4]?.duplicateCount || 0 }}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- 修改後動態選重率 -->
        <div v-if="modifiedDynamicStats" class="dynamic-stats">
          <table class="compact-stats-table">
            <thead>
              <tr>
                <th>知乎</th>
                <th>北語</th>
                <th>臺繁</th>
                <th>古籍</th>
                <th>繁簡</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ (modifiedDynamicStats.zhihu * 10000).toFixed(2) }}‱</td>
                <td>{{ (modifiedDynamicStats.sc * 10000).toFixed(2) }}‱</td>
                <td>{{ (modifiedDynamicStats.tc * 10000).toFixed(2) }}‱</td>
                <td>{{ (modifiedDynamicStats.guji * 10000).toFixed(2) }}‱</td>
                <td>{{ (modifiedDynamicStats.unified * 10000).toFixed(2) }}‱</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 對比結果 -->
      <div v-if="comparison.size > 0" class="comparison-section">
        <h4>對比結果</h4>
        <div v-for="[name, comp] of comparison" :key="name" class="comparison-item">
          <h5>{{ name }}</h5>
          <div v-if="comp.added.length > 0" class="change-list added">
            <strong>新增重碼：</strong><span class="char-list">{{ comp.added.join(' ') }}</span>
          </div>
          <div v-if="comp.removed.length > 0" class="change-list removed">
            <strong>減少重碼：</strong><span class="char-list">{{ comp.removed.join(' ') }}</span>
          </div>
          <div v-if="comp.added.length === 0 && comp.removed.length === 0" class="no-change">
            無變化
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：字符集和字頻表統計 -->
    <div class="bottom-info-panel">
      <div class="info-section">
        <h4>字符集字數</h4>
        <table class="info-table">
          <thead>
            <tr>
              <th>GB2312</th>
              <th>通規</th>
              <th>國字</th>
              <th>通+國</th>
              <th>CJK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ charsetData ? Object.values(charsetData).filter(c => c.is_gb2312).length : 0 }}</td>
              <td>{{ charsetData ? Object.values(charsetData).filter(c => c.is_tonggui).length : 0 }}</td>
              <td>{{ charsetData ? Object.values(charsetData).filter(c => c.is_guozi).length : 0 }}</td>
              <td>{{ charsetData ? Object.values(charsetData).filter(c => c.is_tonggui || c.is_guozi).length : 0 }}</td>
              <td>{{ Array.from(chaifenMap.keys()).length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="info-section">
        <h4>字頻表字數</h4>
        <table class="info-table">
          <thead>
            <tr>
              <th>知乎</th>
              <th>北語</th>
              <th>臺繁</th>
              <th>古籍</th>
              <th>繁簡</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ charFrequencies?.zhihu ? Object.keys(charFrequencies.zhihu).length : 0 }}</td>
              <td>{{ charFrequencies?.sc ? Object.keys(charFrequencies.sc).length : 0 }}</td>
              <td>{{ charFrequencies?.tc ? Object.keys(charFrequencies.tc).length : 0 }}</td>
              <td>{{ charFrequencies?.guji ? Object.keys(charFrequencies.guji).length : 0 }}</td>
              <td>{{ charFrequencies?.unified ? Object.keys(charFrequencies.unified).length : 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style>
/* ZigenTest 组件专用样式 - 使用命名空间避免冲突 */
.zigen-test-container .loading {
  padding: 2rem;
  text-align: center;
  font-size: 1.2rem;
  color: #666;
}

.zigen-test-container {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.3rem !important;
  min-height: calc(100vh - 20px) !important;
  padding: 0.2rem !important;
  background: #f8f9fa !important;
}

.dark .zigen-test-container {
  background: #1a1a1a !important;
}

.zigen-test-container .left-panel {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  max-width: 600px !important;
  max-height: calc(100vh - 150px) !important;
  background: white !important;
  border-radius: 8px !important;
  padding: 0.3rem !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.dark .zigen-test-container .left-panel {
  background: #2d2d2d !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.zigen-test-container .right-panel {
  flex: 1.5 !important;
  max-height: calc(100vh - 150px) !important;
  background: white !important;
  border-radius: 8px !important;
  padding: 0.3rem !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  overflow-y: auto !important;
}

.dark .zigen-test-container .right-panel {
  background: #2d2d2d !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

/* 底部信息面板 */
.zigen-test-container .bottom-info-panel {
  width: 100% !important;
  display: flex !important;
  gap: 0.3rem !important;
  background: white !important;
  border-radius: 8px !important;
  padding: 0.3rem !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.dark .zigen-test-container .bottom-info-panel {
  background: #2d2d2d !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.zigen-test-container .info-section {
  flex: 1 !important;
}

.zigen-test-container .info-section h4 {
  margin: 0 0 0.1rem 0 !important;
  font-size: 0.85rem !important;
  color: #374151 !important;
}

.dark .zigen-test-container .info-section h4 {
  color: #e5e7eb !important;
}

.zigen-test-container .info-table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 0.75rem !important;
}

.zigen-test-container .info-table th,
.zigen-test-container .info-table td {
  padding: 0.3rem 0.5rem !important;
  text-align: center !important;
  border: 1px solid #e5e7eb !important;
}

.dark .zigen-test-container .info-table th,
.dark .zigen-test-container .info-table td {
  border-color: #374151 !important;
}

.info-table th {
  background: #f3f4f6;
  font-weight: 600;
  font-size: 0.7rem;
}

.dark .info-table th {
  background: #374151;
  color: #e5e7eb;
}

.info-table td {
  font-family: monospace;
  color: #6b7280;
  font-weight: 500;
}

.dark .info-table td {
  color: #9ca3af;
}

.zigen-test-container .panel-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 0.2rem !important;
  padding-bottom: 0.2rem !important;
  border-bottom: 2px solid #42b983 !important;
}

.zigen-test-container h3 {
  margin: 0 !important;
  color: #2c3e50 !important;
  font-size: 1.2rem !important;
}

.dark .zigen-test-container h3 {
  color: #e5e7eb !important;
}

.zigen-test-container h4 {
  margin-top: 0.2rem !important;
  margin-bottom: 0.1rem !important;
  color: #42b983 !important;
  font-size: 0.85rem !important;
  font-weight: 600 !important;
}

.zigen-test-container h5 {
  margin-top: 0.1rem !important;
  margin-bottom: 0.05rem !important;
  font-size: 0.8rem !important;
  color: #374151 !important;
}

.dark .zigen-test-container h5 {
  color: #d1d5db !important;
}

.zigen-test-container .reset-btn {
  display: flex !important;
  align-items: center !important;
  gap: 0.3rem !important;
  padding: 0.3rem 0.6rem !important;
  background: #ef4444 !important;
  color: white !important;
  border: none !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);
}

.reset-btn:active {
  transform: translateY(0);
}

.zigen-test-container .table-container {
  overflow-y: auto !important;
  flex: 1 !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 6px !important;
  background: #fafafa !important;
}

.dark .zigen-test-container .table-container {
  border-color: #374151 !important;
  background: #1f1f1f !important;
}

.zigen-test-container table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 0.9rem !important;
}

.zigen-test-container thead {
  position: sticky !important;
  top: 0 !important;
  background: #f3f4f6 !important;
  z-index: 1 !important;
}

.dark .zigen-test-container thead {
  background: #374151 !important;
}

.zigen-test-container th {
  padding: 0.2rem 0.25rem !important;
  text-align: left !important;
  border-bottom: 2px solid #d1d5db !important;
  font-weight: 600 !important;
  color: #374151 !important;
  font-size: 0.75rem !important;
}

.dark .zigen-test-container th {
  border-bottom-color: #4b5563 !important;
  color: #e5e7eb !important;
}

.zigen-test-container td {
  padding: 0.1rem 0.25rem !important;
  border-bottom: 1px solid #f3f4f6 !important;
  font-size: 0.75rem !important;
  line-height: 1.2 !important;
}

.dark .zigen-test-container td {
  border-bottom-color: #374151 !important;
}

.zigen-cell {
  font-size: 1.1rem;
  font-weight: 500;
  color: #1f2937;
}

.dark .zigen-cell {
  color: #f3f4f6;
}

.code-cell {
  font-family: monospace;
  color: #6b7280;
}

.dark .code-cell {
  color: #9ca3af;
}

.input-cell {
  padding: 0.3rem 0.5rem;
}

.code-input {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  background: white;
  color: #1f2937;
  transition: all 0.2s;
}

.dark .code-input {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

.code-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.code-input::placeholder {
  color: #9ca3af;
}

.dark .code-input::placeholder {
  color: #6b7280;
}

tbody tr {
  transition: background-color 0.15s;
}

tbody tr:hover {
  background-color: #f9fafb;
}

.dark tbody tr:hover {
  background-color: #2d2d2d;
}

tbody tr.edited-row {
  background-color: #fef3c7;
}

.dark tbody tr.edited-row {
  background-color: rgba(245, 158, 11, 0.15);
}

.stats-table {
  width: 100%;
  margin-bottom: 0.6rem;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  font-size: 0.75rem;
}

.dark .stats-table {
  background: #1f1f1f;
  border-color: #374151;
}

.stats-table thead {
  background: #f3f4f6;
}

.dark .stats-table thead {
  background: #374151;
}

/* 紧凑表格样式 */
.compact-stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.compact-stats-table th,
.compact-stats-table td {
  padding: 0.3rem 0.4rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.dark .compact-stats-table th,
.dark .compact-stats-table td {
  border-color: #374151;
}

.compact-stats-table th {
  background: #f3f4f6;
  font-weight: 600;
  font-size: 0.7rem;
}

.dark .compact-stats-table th {
  background: #374151;
  color: #e5e7eb;
}

.compact-stats-table td {
  font-family: monospace;
  color: #3b82f6;
  font-weight: 500;
}

.dark .compact-stats-table td {
  color: #60a5fa;
}

.charset-name {
  font-weight: 600;
  color: #1f2937;
}

.dark .charset-name {
  color: #f3f4f6;
}

.number-cell {
  text-align: right;
  font-family: monospace;
  color: #4b5563;
}

.dark .number-cell {
  color: #9ca3af;
}

.rate-cell {
  text-align: right;
  font-family: monospace;
  font-weight: 600;
  color: #42b983;
}

.zigen-test-container .stats-section {
  margin-bottom: 0.2rem !important;
}

.zigen-test-container .stats-section.modified {
  background: #fef3c7 !important;
  border-radius: 8px !important;
  padding: 0.2rem !important;
  margin: 0.2rem -0.3rem 0.2rem -0.3rem !important;
}

.dark .zigen-test-container .stats-section.modified {
  background: rgba(245, 158, 11, 0.1) !important;
}

.zigen-test-container .comparison-section {
  margin-top: 0.2rem !important;
  padding-top: 0.2rem !important;
  border-top: 2px solid #e5e7eb !important;
}

.dark .zigen-test-container .comparison-section {
  border-top-color: #374151 !important;
}

.zigen-test-container .comparison-item {
  margin-bottom: 0.2rem !important;
}

.zigen-test-container .change-list {
  margin: 0.05rem 0 !important;
  line-height: 1.2 !important;
  font-size: 0.75rem !important;
}

.zigen-test-container .change-list strong {
  display: inline-block !important;
  margin-right: 0.3rem !important;
  font-weight: 600 !important;
  font-size: 0.75rem !important;
}

.zigen-test-container .char-list {
  font-size: 0.85rem !important;
  letter-spacing: 0.05em !important;
}

.zigen-test-container .change-list.added {
  color: #b91c1c !important;
}

.dark .zigen-test-container .change-list.added {
  color: #fca5a5 !important;
}

.zigen-test-container .change-list.removed {
  color: #15803d !important;
}

.dark .zigen-test-container .change-list.removed {
  color: #4ade80 !important;
}

.zigen-test-container .no-change {
  color: #6b7280 !important;
  font-style: italic !important;
  font-size: 0.75rem !important;
}

.dark .zigen-test-container .no-change {
  color: #9ca3af !important;
}

/* 动态选重率样式 */
.zigen-test-container .dynamic-stats {
  margin-top: 0.1rem !important;
}

/* 紧凑统计表格 */
.zigen-test-container .compact-stats-table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 0.75rem !important;
  margin: 0 !important;
}

.zigen-test-container .compact-stats-table th,
.zigen-test-container .compact-stats-table td {
  padding: 0.2rem 0.3rem !important;
  text-align: center !important;
  border: 1px solid #e5e7eb !important;
}

.dark .zigen-test-container .compact-stats-table th,
.dark .zigen-test-container .compact-stats-table td {
  border-color: #374151 !important;
}
</style>
