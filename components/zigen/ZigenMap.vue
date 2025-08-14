<!--
    ZigenMap.vue - 字根圖生成組件

  Features:
  - 支持多個方案切換（卿雲、光華、星陳、日月）
  - 懸停以顯示歸併字根和例字
  
  Modification History:
  - 2025-08-14 by 朱複丹: 初版，實現基礎功能和樣式
-->

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { fetchZigen } from "../search/share";
import ChaiDataLoader from "../search/ChaiDataLoader";
import type { ZigenMap as ZigenMapType, ChaifenMap, Chaifen } from "../search/share";

interface ZigenScheme {
    id: string
    name: string
    zigenUrl: string
    chaifenUrl: string
}

// 键盘布局 - QWERTY垂直排列
const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

// 需要显示但暂时留空的键
const emptyKeys = [',', '.', '/', ';', "'"];

// 支持的方案
const schemes: ZigenScheme[] = [
    {
        id: 'joy',
        name: '卿雲',
        zigenUrl: '/zigen-joy.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'light',
        name: '光華',
        zigenUrl: '/zigen-light.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'star',
        name: '星陳',
        zigenUrl: '/zigen-star.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'ming',
        name: '日月',
        zigenUrl: '/zigen-ming.csv',
        chaifenUrl: '/chaifen.json'
    }
];

// 响应式状态
const activeScheme = ref('star');
const zigenMap = ref<ZigenMapType>();
const chaifenLoader = ref<ChaiDataLoader>();
const isLoading = ref(false);
// 当前悬停的字根信息
const hoveredZigen = ref<string | null>(null);
const hoveredZigenInfo = ref<{ visible: Array<{ font: string, code: string }>, hidden: Array<{ font: string, code: string }> } | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });
// 每個字根的例字數據結構
const zigenExampleChars = ref<{ [zigenFont: string]: string[] }>({});
// 固定彈窗狀態
const pinnedZigen = ref<string | null>(null);
const pinnedZigenInfo = ref<{ visible: Array<{ font: string, code: string }>, hidden: Array<{ font: string, code: string }> } | null>(null);
const pinnedZigenExampleChars = ref<{ [zigenFont: string]: string[] }>({});
const isPinned = ref(false);

// 当前方案
const currentScheme = computed(() => {
    return schemes.find(s => s.id === activeScheme.value) || schemes[0];
});

// 按键分组的字根 - 优化版本，合并相同编码的字根
const zigenByKey = computed(() => {
    if (!zigenMap.value) {
        console.log('No zigenMap data');
        return {};
    }

    console.log('ZigenMap has data, size:', zigenMap.value.size);

    const result: Record<string, { visible: Array<{ font: string, code: string }>, hidden: Array<{ font: string, code: string }> }> = {};

    // 先收集所有有效的字根数据
    const validZigens: Array<{ font: string, ma: string, firstLetter: string, code: string }> = [];

    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();

        // 只检查编码必须存在，字根字段存在即可（即使看起来是空白字符）
        if (!ma || ma.length === 0) continue;
        if (font === null || font === undefined) continue;

        const firstLetter = ma[0].toLowerCase();
        const code = ma.slice(1);

        validZigens.push({ font, ma, firstLetter, code });
    }

    console.log(`Found ${validZigens.length} valid zigens`);

    // 按按键分组并处理相同编码
    for (const zigen of validZigens) {
        const { font, ma, firstLetter, code } = zigen;

        if (!result[firstLetter]) {
            result[firstLetter] = { visible: [], hidden: [] };
        }

        // 检查是否已经有相同编码的字根
        const existingWithSameCode = result[firstLetter].visible.find(item => item.code === code);

        if (!existingWithSameCode) {
            // 第一个具有此编码的字根，放在visible中
            result[firstLetter].visible.push({ font, code });
        } else {
            // 已有相同编码的字根，放在hidden中
            result[firstLetter].hidden.push({ font, code });
        }
    }

    console.log('Final result:', result);
    return result;
});

// 获取包含指定字根的例字
const getExampleChars = async (zigen: string): Promise<string[]> => {
    if (!chaifenLoader.value) {
        console.log('chaifenLoader 未初始化');
        return [];
    }

    try {
        console.log(`開始為字根 "${zigen}" 搜索例字...`);
        const optimizedData = await chaifenLoader.value.loadData();

        const examples: string[] = [];

        // 確保字根是正確的 Unicode 字符串
        const normalizedZigen = zigen.normalize('NFC');
        console.log(`搜索字根: "${normalizedZigen}"`);

        // 檢查前幾個字符的數據格式
        const sampleEntries = Object.entries(optimizedData).slice(0, 3);
        console.log('數據樣本:', sampleEntries);

        let checkedCount = 0;
        for (const [char, data] of Object.entries(optimizedData)) {
            checkedCount++;

            const charData = data as { d?: string, dt?: string, r?: string };

            // 調試：檢查特定字符
            if (checkedCount <= 5) {
                console.log(`字符 "${char}" 的拆分數據:`, charData.d);
            }

            // 檢查拆分數據是否包含指定字根
            if (charData.d?.includes(normalizedZigen)) {
                console.log(`✅ 找到匹配: "${char}" 包含字根 "${normalizedZigen}", 拆分: "${charData.d}"`);
                examples.push(char);
                if (examples.length >= 20) break;
            }

            // 每檢查1000個字符輸出一次進度
            if (checkedCount % 1000 === 0) {
                console.log(`已檢查 ${checkedCount} 個字符，找到 ${examples.length} 個例字`);
            }
        }

        console.log(`字根 "${normalizedZigen}" 最終找到例字:`, examples.slice(0, 5), `(總共${examples.length}個)`);
        return examples;
    } catch (error) {
        console.error('获取例字失败:', error);
        return [];
    }
};

// 加载数据
async function loadData() {
    isLoading.value = true;
    try {
        // 加载字根数据
        const zigenData = await fetchZigen(currentScheme.value.zigenUrl);
        zigenMap.value = zigenData;

        // 初始化拆分数据加载器
        chaifenLoader.value = ChaiDataLoader.getInstance(currentScheme.value.chaifenUrl);

        console.log(`已初始化 ChaiDataLoader，使用文件: ${currentScheme.value.chaifenUrl}`);

    } catch (error) {
        console.error('加载数据失败:', error);
    } finally {
        isLoading.value = false;
    }
}

// 处理字根悬停
async function handleZigenHover(event: MouseEvent, zigen: { font: string, code: string }) {
    hoveredZigen.value = zigen.font;
    hoverPosition.value = { x: event.clientX, y: event.clientY };

    // 找到所有相同完整编码的字根
    // 需要先找到当前字根的完整编码（首字母+剩余编码）
    let fullCode = '';
    if (zigenMap.value) {
        for (const [key, data] of zigenMap.value) {
            if (data.font === zigen.font && data.ma?.slice(1) === zigen.code) {
                fullCode = data.ma;
                break;
            }
        }
    }

    const sameCodeZigens = findSameCodeZigens(zigen.font, fullCode);
    hoveredZigenInfo.value = sameCodeZigens;

    // 為每個字根分別獲取例字
    console.log('開始獲取例字，字根數量:', [...sameCodeZigens.visible, ...sameCodeZigens.hidden].length);
    const newZigenExampleChars: { [zigenFont: string]: string[] } = {};

    const allZigens = [...sameCodeZigens.visible, ...sameCodeZigens.hidden];
    for (const z of allZigens) {
        console.log(`正在獲取字根 "${z.font}" 的例字...`);
        const examples = await getExampleChars(z.font);
        console.log(`字根 "${z.font}" 找到例字:`, examples.length, '個');
        newZigenExampleChars[z.font] = examples.slice(0, 8); // 每個字根最多8個例字
    }

    zigenExampleChars.value = newZigenExampleChars;
}

function handleZigenLeave() {
    // 如果彈窗已固定，不清除懸停狀態
    if (!isPinned.value) {
        hoveredZigen.value = null;
        hoveredZigenInfo.value = null;
        zigenExampleChars.value = {};
    }
}

// 處理字根點擊 - 固定彈窗
async function handleZigenClick(event: MouseEvent, zigen: { font: string, code: string }) {
    event.stopPropagation();

    // 如果已經固定了相同的字根，則取消固定
    if (isPinned.value && pinnedZigen.value === zigen.font) {
        closePinnedPopup();
        return;
    }

    // 固定新的字根
    pinnedZigen.value = zigen.font;
    isPinned.value = true;

    // 找到完整編碼
    let fullCode = '';
    if (zigenMap.value) {
        for (const [key, data] of zigenMap.value) {
            if (data.font === zigen.font && data.ma?.slice(1) === zigen.code) {
                fullCode = data.ma;
                break;
            }
        }
    }

    const sameCodeZigens = findSameCodeZigens(zigen.font, fullCode);
    pinnedZigenInfo.value = sameCodeZigens;

    // 為每個字根分別獲取例字
    console.log('開始獲取例字，字根數量:', [...sameCodeZigens.visible, ...sameCodeZigens.hidden].length);
    const newPinnedZigenExampleChars: { [zigenFont: string]: string[] } = {};

    const allZigens = [...sameCodeZigens.visible, ...sameCodeZigens.hidden];
    for (const z of allZigens) {
        console.log(`正在獲取字根 "${z.font}" 的例字...`);
        const examples = await getExampleChars(z.font);
        console.log(`字根 "${z.font}" 找到例字:`, examples.length, '個');
        newPinnedZigenExampleChars[z.font] = examples.slice(0, 10); // 固定彈窗每個字根最多10個例字
    }

    pinnedZigenExampleChars.value = newPinnedZigenExampleChars;
    console.log(`固定彈窗 - 字根 "${zigen.font}" 的最終例字:`, pinnedZigenExampleChars.value);

    // 清除懸停狀態
    hoveredZigen.value = null;
    hoveredZigenInfo.value = null;
    zigenExampleChars.value = {};
}

// 關閉固定彈窗
function closePinnedPopup() {
    isPinned.value = false;
    pinnedZigen.value = null;
    pinnedZigenInfo.value = null;
    pinnedZigenExampleChars.value = {};
}

// 辅助函数：找到所有相同完整编码的字根
function findSameCodeZigens(targetFont: string, targetFullCode: string) {
    const visible: Array<{ font: string, code: string }> = [];
    const hidden: Array<{ font: string, code: string }> = [];

    if (!zigenMap.value || !targetFullCode) return { visible, hidden };

    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();

        if (!ma || !font || font === null || font === undefined) continue;

        // 比较完整编码
        if (ma === targetFullCode) {
            if (font === targetFont) {
                // 当前悬停的字根放在最前面
                visible.unshift({ font, code: ma }); // 使用完整编码显示
            } else {
                // 其他相同完整编码的字根
                hidden.push({ font, code: ma }); // 使用完整编码显示
            }
        }
    }

    return { visible, hidden };
}// 切换方案
function switchScheme(schemeId: string) {
    activeScheme.value = schemeId;
}

// 監聽方案變化
watch(() => activeScheme.value, loadData);

// 監聽點擊事件，點擊空白處關閉固定彈窗
onMounted(() => {
    loadData();

    document.addEventListener('click', (event) => {
        if (isPinned.value) {
            const pinnedPopup = document.querySelector('.pinned-popup');
            if (pinnedPopup && !pinnedPopup.contains(event.target as Node)) {
                closePinnedPopup();
            }
        }
    });
});
</script>

<template>
    <div class="zigen-map-container">
        <!-- 方案切换标签 -->
        <div class="tabs tabs-boxed mb-4 bg-base-200">
            <button v-for="scheme in schemes" :key="scheme.id" @click="switchScheme(scheme.id)"
                :class="['tab tab-lg', { 'tab-active': activeScheme === scheme.id }]">
                {{ scheme.name }}
            </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">正在加载字根数据...</span>
        </div>

        <!-- 键盘字根图 -->
        <div v-else-if="zigenMap" class="keyboard-layout">
            <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
                <div v-for="key in row" :key="key" class="keyboard-key"
                    :class="{ 'empty-key': emptyKeys.includes(key) }">
                    <!-- 键位标签 -->
                    <div class="key-label">{{ key.toUpperCase() }}</div>

                    <!-- 字根显示 - 只显示可见的字根 -->
                    <div v-if="!emptyKeys.includes(key) && zigenByKey[key]?.visible.length > 0" class="zigen-list">
                        <span v-for="(zigen, index) in zigenByKey[key].visible" :key="index" class="zigen-item"
                            @mouseenter="handleZigenHover($event, zigen)" @mouseleave="handleZigenLeave"
                            @click="handleZigenClick($event, zigen)">
                            <span class="zigen-font">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code }}</span>
                        </span>
                        <!-- 如果有隐藏的字根，显示省略号 -->
                        <span v-if="zigenByKey[key].hidden.length > 0" class="more-indicator">⋯</span>
                    </div>

                    <!-- 无字根提示 -->
                    <div v-else-if="!emptyKeys.includes(key)" class="text-xs text-gray-400">
                        无字根
                    </div>
                </div>
            </div>
        </div>

        <!-- 悬停卡片 - 显示相同编码的字根 -->
        <div v-if="hoveredZigen && hoveredZigenInfo" class="hover-card" :style="{
            left: hoverPosition.x + 10 + 'px',
            top: hoverPosition.y + 10 + 'px'
        }">
            <div class="popup-container">
                <div class="popup-body">
                    <h3 class="popup-title">
                        編碼 "{{ hoveredZigenInfo.visible[0]?.code || hoveredZigen }}" 上的歸併字根
                    </h3>

                    <!-- 字根列表 - 每個字根一行，例字在同一行 -->
                    <div class="zigen-rows">
                        <!-- 可見字根 -->
                        <div v-for="(zigen, index) in hoveredZigenInfo.visible" :key="`visible-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline current-zigen">
                                <span class="zigen-font">{{ zigen.font }}</span>
                            </div>
                            <!-- 該字根的例字 - 直接跟在字根後面 -->
                            <div v-if="zigenExampleChars[zigen.font]?.length > 0" class="example-chars-same-line">
                                <span v-for="char in zigenExampleChars[zigen.font].slice(0, 8)" :key="char"
                                    class="example-char zigen-font">{{ char }}</span>
                            </div>
                            <div v-else class="example-chars-same-line">
                                <span class="loading-text">正在加載...</span>
                            </div>
                        </div>

                        <!-- 隱藏字根 -->
                        <div v-for="(zigen, index) in hoveredZigenInfo.hidden" :key="`hidden-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline other-zigen">
                                <span class="zigen-font">{{ zigen.font }}</span>
                            </div>
                            <!-- 該字根的例字 - 直接跟在字根後面 -->
                            <div v-if="zigenExampleChars[zigen.font]?.length > 0" class="example-chars-same-line">
                                <span v-for="char in zigenExampleChars[zigen.font].slice(0, 8)" :key="char"
                                    class="example-char zigen-font">{{ char }}</span>
                            </div>
                            <div v-else class="example-chars-same-line">
                                <span class="loading-text">正在加載...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 固定彈窗 - 點擊字根後顯示 -->
        <div v-if="isPinned && pinnedZigen && pinnedZigenInfo" class="pinned-popup">
            <div class="popup-container">
                <div class="popup-body">
                    <div class="popup-header">
                        <h3 class="popup-title">
                            字根 "{{ pinnedZigen }}" 的同编码字根
                        </h3>
                        <button @click="closePinnedPopup" class="close-btn">✕</button>
                    </div>

                    <!-- 字根列表 - 每個字根一行，例字在同一行 -->
                    <div class="zigen-rows">
                        <!-- 可見字根 -->
                        <div v-for="(zigen, index) in pinnedZigenInfo.visible" :key="`pinned-visible-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline current-zigen">
                                <span class="zigen-font">{{ zigen.font }}</span>
                            </div>
                            <!-- 該字根的例字 - 直接跟在字根後面 -->
                            <div v-if="pinnedZigenExampleChars[zigen.font]?.length > 0" class="example-chars-same-line">
                                <span v-for="char in pinnedZigenExampleChars[zigen.font].slice(0, 8)" :key="char"
                                    class="example-char zigen-font">{{ char }}</span>
                            </div>
                            <div v-else class="example-chars-same-line">
                                <span class="loading-text">正在加載...</span>
                            </div>
                        </div>

                        <!-- 隱藏字根 -->
                        <div v-for="(zigen, index) in pinnedZigenInfo.hidden" :key="`pinned-hidden-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline other-zigen">
                                <span class="zigen-font">{{ zigen.font }}</span>
                            </div>
                            <!-- 該字根的例字 - 直接跟在字根後面 -->
                            <div v-if="pinnedZigenExampleChars[zigen.font]?.length > 0" class="example-chars-same-line">
                                <span v-for="char in pinnedZigenExampleChars[zigen.font].slice(0, 8)" :key="char"
                                    class="example-char zigen-font">{{ char }}</span>
                            </div>
                            <div v-else class="example-chars-same-line">
                                <span class="loading-text">正在加載...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.zigen-map-container {
    width: 100%;
    min-width: 100%;
    margin: 0;
    position: relative;
    box-sizing: border-box;
}

.keyboard-layout {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border-radius: 0.75rem;
    width: 100%;
    min-width: 100%;
    box-sizing: border-box;
}

.keyboard-row {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
    width: 100%;
    flex-wrap: nowrap;
}

.keyboard-key {
    position: relative;
    flex: 1;
    min-width: 3rem;
    max-width: 8rem;
    min-height: 4.5rem;
    padding: 0.5rem 0.375rem;
    background: rgb(249 250 251);
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    border-radius: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
}

.dark .keyboard-key {
    background: rgb(15 23 42);
}

.keyboard-key:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border-color: var(--fallback-p, oklch(var(--p)/0.3));
}

.empty-key {
    opacity: 0.3;
    cursor: not-allowed;
    box-shadow: none;
}

.key-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fallback-nc, oklch(var(--nc)/0.8));
    border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc)/0.15));
    padding-bottom: 0.15rem;
    margin-bottom: 0.15rem;
    width: 100%;
    text-align: center;
}

.zigen-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 0.1rem;
    width: 100%;
    margin-top: 0.15rem;
    line-height: 1.0;
}

.zigen-item {
    font-size: 0.8rem;
    padding: 0.01rem 0.01rem;
    background: var(--fallback-n, oklch(var(--n)/0.05));
    border-radius: 0.2rem;
    color: var(--fallback-nc, oklch(var(--nc)/0.7));
    transition: all 0.15s ease;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.0;
    margin: 0.01rem;
}

/* 在亮色模式下為 zigen-item 設置深色文字 */
@media (prefers-color-scheme: light) {
    .zigen-item {
        color: rgb(0 0 0) !important;
    }
}

.zigen-item:hover {
    background: var(--fallback-p, oklch(var(--p)/0.1));
    color: var(--fallback-p, oklch(var(--p)/1));
    border-color: var(--fallback-p, oklch(var(--p)/0.3));
    transform: scale(1.05);
}

.more-indicator {
    font-size: 0.4rem;
    color: var(--fallback-nc, oklch(var(--nc)/0.5));
    margin-left: 0.1rem;
}

.zigen-font {
    font-family: 'Yuniversus', sans-serif;
    color: #45237c !important;
    /* 直接使用十六進制黑色並強制優先級 */
    font-weight: 500;
    font-size: inherit;
}

/* 在亮色模式下使用深色字體 */
@media (prefers-color-scheme: light) {
    .zigen-font {
        color: rgb(0 0 0) !important;
        /* 純黑色，使用 !important 提高優先級 */
    }
}

/* 也針對 zigen-item 內的字根字體設置 */
@media (prefers-color-scheme: light) {
    .zigen-item .zigen-font {
        color: rgb(0 0 0) !important;
    }
}

/* 針對鍵盤佈局中的所有字根字體 */
@media (prefers-color-scheme: light) {
    .keyboard-layout .zigen-font {
        color: rgb(0 0 0) !important;
    }
}

/* 在深色模式下使用主題色 */
.dark .zigen-font {
    color: var(--fallback-p, oklch(var(--p)/var(--tw-text-opacity))) !important;
}

.zigen-item:hover .zigen-font {
    color: var(--fallback-pc, oklch(var(--pc)/var(--tw-text-opacity)));
}

/* 懸停時在亮色模式下使用白色字體 */
@media (prefers-color-scheme: light) {
    .zigen-item:hover .zigen-font {
        color: white;
    }
}

.zigen-code {
    font-family: monospace;
    font-size: inherit;
    color: #666666 !important;
    /* 直接使用灰色並強制優先級 */
    font-weight: 400;
}

/* 在亮色模式下使用更深的顏色 */
@media (prefers-color-scheme: light) {
    .zigen-code {
        color: rgb(55 65 81) !important;
        /* 更深的灰色，使用 !important */
    }
}

/* 針對 zigen-item 內的編碼 */
@media (prefers-color-scheme: light) {
    .zigen-item .zigen-code {
        color: rgb(55 65 81) !important;
    }
}

.zigen-item:hover .zigen-code {
    color: var(--fallback-pc, oklch(var(--pc)/0.8));
}

.hover-card {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    max-width: 20rem;
}

/* 彈出框樣式 - 與鍵位樣式一致 */
.popup-container {
    background: rgb(249 250 251);
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    border-radius: 1.25rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    transition: all 0.2s ease;
    overflow: hidden;
}

.dark .popup-container {
    background: rgb(15 23 42);
}

.popup-body {
    padding: 1rem;
}

.popup-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--fallback-nc, oklch(var(--nc)/0.8));
    border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc)/0.15));
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
    text-align: center;
}

/* 固定彈窗樣式 */
.pinned-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    pointer-events: auto;
    max-width: 28rem;
    max-height: 80vh;
    overflow-y: auto;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
}

.close-btn {
    background: var(--fallback-error, oklch(var(--er)/0.1));
    border: 1px solid var(--fallback-error, oklch(var(--er)/0.3));
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--fallback-error, oklch(var(--er)/1));
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: 1rem;
}

.close-btn:hover {
    background: var(--fallback-error, oklch(var(--er)/0.2));
    transform: scale(1.05);
}

.example-chars {
    margin-top: 0.5rem;
}

.chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(1.5rem, 1fr));
    gap: 0.25rem;
    max-height: 8rem;
    overflow-y: auto;
}

.example-char {
    text-align: center;
    padding: 0.125rem;
    border-radius: 0.25rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    font-size: 0.875rem;
}

.hover-card {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    max-width: 20rem;
}

.example-chars {
    margin-top: 0.5rem;
}

.chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(1.5rem, 1fr));
    gap: 0.25rem;
    max-height: 8rem;
    overflow-y: auto;
}

.example-char {
    text-align: center;
    padding: 0.125rem;
    border-radius: 0.25rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .keyboard-key {
        min-width: 2.5rem;
        min-height: 3rem;
    }

    .zigen-item {
        font-size: 0.75rem;
    }

    .key-label {
        font-size: 0.625rem;
    }
}

/* Tab样式 */
.tab {
    transition: all 0.2s ease;
}

.tab:hover {
    background-color: var(--fallback-b3, oklch(var(--b3)/var(--tw-bg-opacity)));
}

.tab-active {
    background-color: var(--fallback-p, oklch(var(--p)/var(--tw-bg-opacity)));
    color: var(--fallback-pc, oklch(var(--pc)/var(--tw-text-opacity)));
}

/* 悬停卡片中的字根列样式 */
.zigen-columns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

/* 新的行式佈局樣式 */
.zigen-rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.zigen-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
}

/* 新的行內佈局樣式 - 字根和例字在同一行 */
.zigen-row-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
}

.zigen-header-inline {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--fallback-primary, oklch(var(--p)/0.1));
    border: 1px solid var(--fallback-primary, oklch(var(--p)/0.3));
    min-width: 2rem;
    justify-content: center;
}

.zigen-header-inline.other-zigen {
    opacity: 0.8;
}

.example-chars-same-line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    flex: 1;
}

.example-chars-same-line .example-char {
    display: inline-block;
    padding: 0.125rem 0.25rem;
    background: var(--fallback-success, oklch(var(--su)/0.1));
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--fallback-success, oklch(var(--su)/1));
    border: 1px solid var(--fallback-success, oklch(var(--su)/0.3));
}

.loading-text {
    font-size: 0.75rem;
    color: var(--fallback-bc, oklch(var(--bc)/0.5));
    font-style: italic;
}

.zigen-row .zigen-header {
    background: transparent;
    border: none;
    padding: 0;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
}

.example-chars-inline {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
}

.example-label {
    font-size: 0.75rem;
    color: var(--fallback-bc, oklch(var(--bc)/0.7));
    margin-right: 0.25rem;
}

.example-chars-inline .example-char {
    display: inline-block;
    padding: 0.125rem 0.25rem;
    background: var(--fallback-primary, oklch(var(--p)/0.1));
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--fallback-primary, oklch(var(--p)/1));
    border: 1px solid var(--fallback-primary, oklch(var(--p)/0.3));
}

.zigen-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 3rem;
}

.zigen-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
}

.hidden-zigen .zigen-header {
    background: var(--fallback-warning, oklch(var(--wa)/0.1));
    border-color: var(--fallback-warning, oklch(var(--wa)/0.3));
}

.zigen-code-display {
    font-family: monospace;
    font-size: 0.7rem;
    color: var(--fallback-bc, oklch(var(--bc)/0.6));
    margin-top: 0.25rem;
}

.zigen-header.current-zigen {
    background: var(--fallback-primary, oklch(var(--p)/0.1));
    border-color: var(--fallback-primary, oklch(var(--p)/0.3));
}

.zigen-header.other-zigen {
    background: var(--fallback-primary, oklch(var(--p)/0.1));
    border-color: var(--fallback-primary, oklch(var(--p)/0.3));
    opacity: 0.9;
    /* 稍微透明以示區別 */
}

.zigen-header.other-zigen .zigen-font {
    color: inherit;
    /* 使用繼承的顏色 */
}
</style>
