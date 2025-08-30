<!--
    ZigenMap.vue - 字根圖生成組件

  Features:
  - 支持多個方案切換（卿雲、光華、星陳、日月）
  - 點擊顯示歸併字根和例字
  
  Major Modification History:
  - 2025-08-14 by 朱複丹: 初版，實現基礎功能和樣式
  - 2025-08-15 by 朱複丹: 添加字根列表模式
  - 2025-08-17 by 朱複丹: 移除懸停顯示功能，改為僅點擊顯示以提升性能
  - 2025-08-21 by 朱複丹: 允許字根列表模式下按鍵按照字母表順序排列
-->

<script setup lang="ts">
// 统一例字数量限制
const MAX_EXAMPLES = 8;
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { fetchZigen } from "../search/share";
import ChaiDataLoader from "../search/ChaiDataLoader";
import type { ZigenMap as ZigenMapType, ChaifenMap, Chaifen } from "../search/share";

const props = defineProps<{
    defaultScheme?: string
    columnMinWidth?: string
    zigenFontClass?: string // 新增：自定義字根字體類名
}>()

// 字根字體類名，默認為 'zigen-font'
const zigenFontClass = computed(() => props.zigenFontClass || 'zigen-font')

const columnMinWidth = toRef(props, 'columnMinWidth')

// Dynamic grid template columns based on columnMinWidth parameter
const gridTemplateColumns = computed(() => {
    const width = columnMinWidth.value || '2rem'
    return `repeat(auto-fill, minmax(${width}, max-content))`
})

// 鍵盤佈局 - QWERTY垂直排列
const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

// 需要顯示但暫時留空的鍵（移除 ,./; 四個鍵，讓它們顯示字根）
const emptyKeys = ["'"];

// 移動端檢測
const isMobileView = ref(false);

// 桌面端佈局模式切換
const isListView = ref(false);

// 列表視圖中按鍵排序模式切換（鍵盤順序 vs 字母順序）
const sortKeysByAlphabet = ref(false);

// 檢測屏幕尺寸
// 小於此寬度則為移動端顯示模式
const checkMobileView = () => {
    isMobileView.value = window.innerWidth < 1280;
};

// 切換桌面端佈局模式
const toggleDesktopLayout = () => {
    isListView.value = !isListView.value;
};

// 切換按鍵排序模式
const toggleKeyOrder = () => {
    sortKeysByAlphabet.value = !sortKeysByAlphabet.value;
};

onMounted(() => {
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkMobileView);
});

// 扁平化的按鍵列表（移動端和桌面端列表視圖用）
const flatKeyList = computed(() => {
    const keys = keyboardLayout.flat();

    // 如果是列表視圖且需要字母排序，則按字母順序排序
    if (sortKeysByAlphabet.value) {
        return keys.slice().sort((a, b) => {
            // 判斷是否為字母
            const isAlphaA = /^[a-zA-Z]$/.test(a);
            const isAlphaB = /^[a-zA-Z]$/.test(b);

            // 字母優先，非字母按鍵放在後面
            if (isAlphaA && !isAlphaB) return -1;
            if (!isAlphaA && isAlphaB) return 1;

            // 都是字母或都不是字母，則按字典序排序
            return a.localeCompare(b);
        });
    }

    // 否則保持鍵盤佈局順序
    return keys;
});

// 宇浩輸入法系列方案
// 共用拆分哦！
const BaseSchemes = ['joy', 'light', 'star', 'ming', 'wafel'];

// 獲取方案對應的文件URL
function getSchemeUrls(schemeId: string) {
    // 判断 defaultScheme 是否在 BaseSchemes 中
    const isBase = BaseSchemes.includes(schemeId);
    return {
        zigenUrl: `/zigen-${schemeId}.csv`,
        chaifenUrl: isBase ? '/chaifen.json' : `/chaifen-${schemeId}.json`
    };
}

// 響應式狀態
// 使用傳入的 defaultScheme 或默認值，但不創建獨立的響應式狀態
const activeScheme = computed(() => props.defaultScheme || 'star');
const zigenMap = ref<ZigenMapType>();
const chaifenLoader = ref<ChaiDataLoader>();
const isLoading = ref(false);
// 例字緩存，key 為 normalizedZigen，value 為 examples Set
const cachedExampleChars = ref<Map<string, Set<string>>>(new Map());
// 已經检查的字符数量
const cachedCheckedCount = ref<number>(0);
// 固定彈窗狀態
const pinnedZigen = ref<string | null>(null);
const pinnedZigenInfo = ref<{ visible: Array<{ font: string, code: string }>, hidden: Array<{ font: string, code: string }> } | null>(null);
const pinnedZigenExampleChars = ref<{ [zigenFont: string]: string[] }>({});
const isPinned = ref(false);

// 監聽方案變化，清除拆分數據緩存
watch(() => props.defaultScheme, () => {
    // 清除已緩存的拆分數據加載器，讓新方案在第一次點擊時重新加載
    chaifenLoader.value = null;
    // 清除例字緩存，因為不同方案可能有不同的字根定義
    cachedExampleChars.value.clear();
    cachedCheckedCount.value = 0;
    console.log('方案已切換，已清除例字緩存');
});

// 按鍵分組的字根 - 優化版本，合併相同編碼的字根
const zigenByKey = computed(() => {
    if (!zigenMap.value) {
        console.log('No zigenMap data');
        return {};
    }

    console.log('ZigenMap has data, size:', zigenMap.value.size);

    const result: Record<string, { visible: Array<{ font: string, code: string }>, hidden: Array<{ font: string, code: string }> }> = {};

    // 先收集所有有效的字根數據
    const validZigens: Array<{ font: string, ma: string, firstLetter: string, code: string }> = [];

    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();

        // 只檢查編碼必須存在，字根字段存在即可（即使看起來是空白字符）
        if (!ma || ma.length === 0) continue;
        if (font === null || font === undefined) continue;

        const firstLetter = ma[0].toLowerCase();
        const code = ma.slice(1);

        validZigens.push({ font, ma, firstLetter, code });
    }

    console.log(`Found ${validZigens.length} valid zigens`);

    // 按按鍵分組並處理連續相同編碼的字根
    for (let i = 0; i < validZigens.length; i++) {
        const zigen = validZigens[i];
        const { font, ma, firstLetter, code } = zigen;

        if (!result[firstLetter]) {
            result[firstLetter] = { visible: [], hidden: [] };
        }

        // 检查前一个字根是否有相同的编码和按键
        const prevZigen = i > 0 ? validZigens[i - 1] : null;
        const isPrevSameCodeAndKey = prevZigen &&
            prevZigen.code === code &&
            prevZigen.firstLetter === firstLetter;

        // 检查是否已经有相同编码的字根在visible中
        const existingWithSameCode = result[firstLetter].visible.find(item => item.code === code);

        if (!existingWithSameCode) {
            // 第一个具有此编码的字根，放在visible中
            result[firstLetter].visible.push({ font, code });
        } else if (isPrevSameCodeAndKey) {
            // 只有当前字根与前一个字根编码相同且连续时，才放在hidden中
            result[firstLetter].hidden.push({ font, code });
        } else {
            // 编码相同但不连续，作为新的visible字根显示
            result[firstLetter].visible.push({ font, code });
        }
    }

    console.log('Final result:', result);
    return result;
});

// 按編碼排序的字根列表（用於列表模式）
const sortedZigenByKey = computed(() => {
    if (!zigenMap.value) return {};

    // 初始化所有 key 的空陣列
    const result: Record<string, Array<{ font: string, code: string, isHidden: boolean }>> = {};
    for (const key of flatKeyList.value) {
        result[key] = [];
    }

    // 嚴格依照 zigenMap.value 的原始順序分配
    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();
        if (!ma || font === null || font === undefined) continue;
        const firstLetter = ma[0].toLowerCase();
        const code = ma.slice(1);

        // 判斷是否為隱藏字根（同 key 下已出現過相同 code 則為隱藏）
        const isHidden = result[firstLetter].some(z => z.code === code);
        result[firstLetter].push({ font, code, isHidden });
    }

    // 保持鍵盤順序（原始文件順序），不再在這裡進行字根排序
    // 原始文件的排序是經過了一定的歸併處理的

    return result;
});

// 获取包含指定字根的例字
const getExampleChars = async (zigen: string): Promise<string[]> => {
    // 確保字根是正確的 Unicode 字符串
    const normalizedZigen = zigen.normalize('NFC');

    let examples: Set<string> = new Set();

    // 檢查緩存中是否已有該字根的例字
    if (cachedExampleChars.value.has(normalizedZigen)) {
        examples = cachedExampleChars.value.get(normalizedZigen)!;
        console.log(`✅ 從緩存中獲取字根 "${normalizedZigen}" 的例字 ${examples.size} 個`);
        if (examples.size >= MAX_EXAMPLES) {
            return Array.from(examples);
        }
    }

    if (!chaifenLoader.value) {
        console.log('chaifenLoader 未初始化');
        return [];
    }

    try {
        console.log(`開始為字根 "${zigen}(${normalizedZigen})" 搜索例字, cachedCheckedCount=${cachedCheckedCount.value}...`);

        // 添加超時處理
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('數據加載超時')), 10000); // 10秒超時
        });

        const optimizedData = await Promise.race([
            chaifenLoader.value.loadData(),
            timeoutPromise
        ]);

        // 檢查前幾個字符的數據格式
        const sampleEntries = Object.entries(optimizedData).slice(0, 3);
        console.log('數據樣本:', sampleEntries);

        let checkedCount = 0;
        for (const [char, data] of Object.entries(optimizedData).slice(cachedCheckedCount.value)) {
            checkedCount++;

            const charData = data as { d?: string, dt?: string, r?: string };

            // 調試：檢查特定字符
            if (checkedCount <= 5) {
                console.log(`字符 "${char}" 的拆分數據:`, charData.d);
            }

            // 將 charData.d 中的每個字根都加入對應的緩存集合
            if (charData.d) {
                for (const zigenItem of charData.d) {
                    // 確保緩存中有對應的集合
                    if (!cachedExampleChars.value.has(zigenItem)) {
                        cachedExampleChars.value.set(zigenItem, new Set());
                    }
                    const set = cachedExampleChars.value.get(zigenItem)!;
                    if (set.size < MAX_EXAMPLES) {
                        set.add(char);
                    }

                    if (zigenItem === normalizedZigen) {
                        examples = set;
                        console.log(`✅ 找到匹配: "${char}" 包含字根 "${normalizedZigen}", 拆分: "${charData.d}"`);
                    }
                }

                if (examples.size >= MAX_EXAMPLES) {
                    break;
                }
            }

            // 每檢查1000個字符輸出一次進度
            if (checkedCount % 1000 === 0) {
                console.log(`已檢查 ${checkedCount} 個字符，找到 ${examples.size} 個例字`);
            }
        }

        cachedCheckedCount.value += checkedCount;

        console.log(`字根 "${normalizedZigen}" 最終找到例字:`, Array.from(examples).slice(0, 5), `(總共${examples.size}個)`);

        return Array.from(examples);
    } catch (error) {
        console.error('获取例字失败:', error);
        if (error instanceof Error && error.message === '數據加載超時') {
            console.error('數據加載超時，請檢查網絡連接');
        }
        return [];
    }
};

// 加載數據
async function loadData() {
    isLoading.value = true;
    try {
        // 只加載字根數據，不初始化拆分數據加載器
        const urls = getSchemeUrls(activeScheme.value);
        const zigenData = await fetchZigen(urls.zigenUrl);
        zigenMap.value = zigenData;

        console.log('我就知道你會忍不住打開控制臺😏');
        console.log(`已加載字根數據，文件: ${urls.zigenUrl}`);
        console.log('注意：拆分數據將在第一次點擊字根時才加載');

    } catch (error) {
        console.error('加載字根數據失敗:', error);
    } finally {
        isLoading.value = false;
    }
}

// 获取键位标注文本
function getKeyLabel(key: string): string {
    switch (key) {
        case ';': return '次選';
        case ',': return '逗號';
        case '.': return '句號';
        default: return '无字根';
    }
}

// 處理字根點擊 - 固定彈窗
async function handleZigenClick(event: MouseEvent, zigen: { font: string, code: string }) {
    event.stopPropagation();

    // 確保 chaifenLoader 已初始化（手機端可能直接點擊而沒有懸停）
    if (!chaifenLoader.value) {
        console.log('點擊時初始化拆分數據加載器...');
        const urls = getSchemeUrls(activeScheme.value);
        chaifenLoader.value = ChaiDataLoader.getInstance(urls.chaifenUrl);
        console.log(`已初始化 ChaiDataLoader，使用文件: ${urls.chaifenUrl}`);
    }

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
}

// 關閉固定彈窗
function closePinnedPopup() {
    isPinned.value = false;
    pinnedZigen.value = null;
    pinnedZigenInfo.value = null;
    pinnedZigenExampleChars.value = {};
}

// 輔助函數：找到所有相同完整編碼的字根
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
                // 當前懸停的字根放在最前面
                visible.unshift({ font, code: ma }); // 使用完整編碼顯示
            } else {
                // 其他相同完整編碼的字根
                hidden.push({ font, code: ma }); // 使用完整編碼顯示
            }
        }
    }

    return { visible, hidden };
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

        <!-- 加載狀態 -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">正在加載字根數據...</span>
        </div>

        <!-- 使用提示和控制按鈕 -->
        <div v-if="!isLoading" class="flex justify-between items-center mb-4">
            <div class="text-sm text-gray-500 dark:text-gray-400">
                點擊字根可查看例字
            </div>

            <!-- 桌面端控制按鈕 -->
            <div v-if="!isMobileView" class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">切換字根圖和字根表：</span>
                    <button @click="toggleDesktopLayout" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': isListView }" :title="isListView ? '切換為網格布局' : '切換為列表布局'">
                        <span v-if="!isListView">☰</span>
                        <span v-else>⊞</span>
                    </button>
                </div>
                <!-- 桌面端列表視圖按鍵排序切換按鈕 -->
                <div v-if="isListView" class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">按鍵排序：</span>
                    <button @click="toggleKeyOrder" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': sortKeysByAlphabet }"
                        :title="sortKeysByAlphabet ? '切換為鍵盤順序' : '切換為字母順序'">
                        <span v-if="!sortKeysByAlphabet">🔤</span>
                        <span v-else>⌨️</span>
                    </button>
                </div>
            </div>

            <!-- 移動端按鍵排序切換按鈕 -->
            <div v-if="isMobileView" class="flex items-center space-x-2">
                <span class="text-xs text-gray-400">按鍵排序：</span>
                <button @click="toggleKeyOrder" class="layout-toggle-btn"
                    :class="{ 'layout-toggle-active': sortKeysByAlphabet }"
                    :title="sortKeysByAlphabet ? '切換為鍵盤順序' : '切換為字母順序'">
                    <span v-if="!sortKeysByAlphabet">🔤</span>
                    <span v-else>⌨️</span>
                </button>
            </div>
        </div>

        <!-- 鍵盤字根圖 - 桌面端網格佈局 -->
        <div v-if="!isLoading && zigenMap && !isMobileView && !isListView" class="keyboard-layout">
            <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
                <div v-for="key in row" :key="key" class="keyboard-key"
                    :class="{ 'empty-key': emptyKeys.includes(key) }">
                    <!-- 鍵位標籤 -->
                    <div class="key-label">{{ key.toUpperCase() }}</div>

                    <!-- 字根顯示 - 只顯示可見的字根 -->
                    <div v-if="!emptyKeys.includes(key) && zigenByKey[key]?.visible.length > 0"
                        class="zigen-list text-indigo-800 dark:text-indigo-300" :style="{ gridTemplateColumns }">
                        <span v-for="(zigen, index) in zigenByKey[key].visible" :key="index" class="zigen-item"
                            @click="handleZigenClick($event, zigen)">
                            <span :class="zigenFontClass">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code }}</span>
                        </span>
                        <!-- 如果有隱藏的字根，顯示省略號 -->
                        <span v-if="zigenByKey[key].hidden.length > 0" class="more-indicator">⋯</span>
                    </div>

                    <!-- 無字根提示 -->
                    <div v-else-if="!emptyKeys.includes(key)" class="text-xs text-gray-400 no-zigen-text">
                        <div v-if="key === '/'" class="vertical-text zigen-font">
                            <div>引導特殊符號</div>
                            <div>切換多重註解</div>
                        </div>
                        <div v-else-if="key === 'z'" class="vertical-text zigen-font">
                            <div>引導拼音反查</div>
                            <div>引導歷史輸入</div>
                        </div>
                        <div v-else-if="key === 'a'" class="vertical-text zigen-font">
                            <div></div>
                            <div>一碼上屏字　了</div>
                        </div>
                        <div v-else-if="key === 'e'" class="vertical-text zigen-font">
                            <div></div>
                            <div>一碼上屏字　的</div>
                        </div>
                        <div v-else-if="key === 'i'" class="vertical-text zigen-font">
                            <div></div>
                            <div>一碼上屏字　是</div>
                        </div>
                        <div v-else-if="key === 'o'" class="vertical-text zigen-font">
                            <div></div>
                            <div>一碼上屏字　我</div>
                        </div>
                        <div v-else-if="key === 'u'" class="vertical-text zigen-font">
                            <div></div>
                            <div>一碼上屏字　不</div>
                        </div>
                        <div v-else class="vertical-text single-line zigen-font">
                            {{ getKeyLabel(key) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 垂直列表布局（移動端或桌面端列表視圖） -->
        <div v-if="!isLoading && zigenMap && (isMobileView || isListView)" class="mobile-layout"
            :class="{ 'desktop-list-layout': !isMobileView && isListView }">
            <div v-for="key in flatKeyList" :key="key" class="mobile-key-row"
                :class="{ 'empty-mobile-key': emptyKeys.includes(key) }">
                <!-- 按鍵名稱 -->
                <div class="mobile-key-label">{{ key.toUpperCase() }}</div>

                <!-- 字根顯示 -->
                <div v-if="!emptyKeys.includes(key) && sortedZigenByKey[key]?.length > 0"
                    class="mobile-zigen-container">
                    <div class="mobile-zigen-list text-indigo-800 dark:text-indigo-300">
                        <!-- 顯示按編碼排序的所有字根 -->
                        <span v-for="(zigen, index) in sortedZigenByKey[key]" :key="`sorted-${index}`"
                            class="mobile-zigen-item" :class="{ 'mobile-hidden-zigen': zigen.isHidden }"
                            @click="handleZigenClick($event, zigen)">
                            <span :class="zigenFontClass">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code }}</span>
                        </span>
                    </div>
                </div>

                <!-- 无字根提示（移動端簡化版） -->
                <div v-else-if="!emptyKeys.includes(key)" class="mobile-no-zigen">
                    <span v-if="key === '/'" class="mobile-key-desc zigen-font">引導特殊符號</span>
                    <span v-else-if="key === 'z'" class="mobile-key-desc zigen-font">引導拼音反查</span>
                    <span v-else-if="['a', 'e', 'i', 'o', 'u'].includes(key)" class="mobile-key-desc zigen-font">
                        一碼上屏字
                    </span>
                    <span v-else class="mobile-key-desc">{{ getKeyLabel(key) }}</span>
                </div>
            </div>
        </div>

        <!-- 固定彈窗 - 點擊字根後顯示 -->
        <div v-if="isPinned && pinnedZigen && pinnedZigenInfo" class="pinned-popup">
            <div class="popup-container">
                <div class="popup-body">
                    <div class="popup-header">
                        <h3 class="popup-title">
                            編碼 {{ pinnedZigenInfo.visible[0]?.code || pinnedZigen }} 上的字根
                        </h3>
                        <button @click="closePinnedPopup" class="close-btn">✕</button>
                    </div>

                    <!-- 字根列表 - 每個字根一行，例字在同一行 -->
                    <div class="zigen-rows text-indigo-800 dark:text-indigo-300">
                        <!-- 可見字根 -->
                        <div v-for="(zigen, index) in pinnedZigenInfo.visible" :key="`pinned-visible-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline current-zigen">
                                <span :class="zigenFontClass">{{ zigen.font }}</span>
                            </div>
                            <!-- 該字根的例字 - 直接跟在字根後面 -->
                            <div v-if="pinnedZigenExampleChars[zigen.font]?.length > 0" class="example-chars-same-line">
                                <span v-for="char in pinnedZigenExampleChars[zigen.font].slice(0, MAX_EXAMPLES)"
                                    :key="char" class="example-char zigen-font">{{ char }}</span>
                            </div>
                            <div v-else class="example-chars-same-line">
                                <span class="loading-text">正在加載...</span>
                            </div>
                        </div>

                        <!-- 隱藏字根 -->
                        <div v-for="(zigen, index) in pinnedZigenInfo.hidden" :key="`pinned-hidden-${index}`"
                            class="zigen-row-inline">
                            <div class="zigen-header-inline other-zigen">
                                <span :class="zigenFontClass">{{ zigen.font }}</span>
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
    --mobile-key-padding: 0.2rem 0.1rem;
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
    background: rgb(250 245 255);
    border: 1px solid rgb(233 213 255);
    border-radius: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow: hidden;
}

.dark .keyboard-key {
    background: rgb(30 27 75);
    border-color: rgb(88 28 135);
}

.keyboard-key:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border-color: rgb(196 181 253);
    background: rgb(245 243 255);
}

.dark .keyboard-key:hover {
    background: rgb(55 48 163);
    border-color: rgb(147 51 234);
}

.empty-key {
    opacity: 0.3;
    cursor: not-allowed;
    box-shadow: none;
}

.key-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgb(88 28 135);
    border-bottom: 1px solid rgb(233 213 255);
    padding-bottom: 0.15rem;
    margin-bottom: 0.15rem;
    width: 100%;
    text-align: center;
}

.dark .key-label {
    color: rgb(196 181 253);
    border-bottom-color: rgb(147 51 234);
}

.zigen-list {
    display: grid !important;
    /* grid-template-columns will be set dynamically via :style */
    justify-items: start !important;
    align-items: start !important;
    gap: 0.01rem 0.01rem !important;
    width: 100% !important;
    margin-top: 0.0rem;
    line-height: 1.0;
    /* Column width controlled by columnMinWidth parameter */
}

.zigen-list::after {
    content: "";
    flex: auto;
}

.zigen-item {
    display: block !important;
    font-size: 0.9rem;
    padding: 0.01rem 0.01rem;
    border-radius: 0.2rem;
    transition: all 0.15s ease;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.0;
    margin: 0rem 0rem !important;
    text-align: left !important;
}

.zigen-item:hover {
    background: rgb(196 181 253);
    color: rgb(88 28 135);
    border-color: rgb(147 51 234);
    transform: scale(1.05);
}

.dark .zigen-item:hover {
    background: rgb(147 51 234);
    color: rgb(245 243 255);
    border-color: rgb(196 181 253);
}

.more-indicator {
    font-size: 0.4rem;
    color: rgb(168 85 247);
    margin-left: 0.1rem;
}

.dark .more-indicator {
    color: rgb(196 181 253);
}

/* 无字根文字竖排样式 */
.no-zigen-text {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.vertical-text {
    writing-mode: vertical-rl;
    text-orientation: upright;
    text-align: center;
    line-height: 1.2;
}

.vertical-text.single-line {
    /* 单行文字的特殊处理 */
    letter-spacing: 0.1em;
}

.vertical-text div {
    margin: 0.1rem 0;
}

/* ===== 字根字體樣式 ===== */
.zigen-font {
    font-weight: normal;
    font-size: inherit;
    /* 不定义颜色，继承父容器的颜色 */
}

.zigen-item:hover .zigen-font {
    color: white !important;
}

.zigen-code {
    font-family: monospace;
    font-size: 0.7rem;
    color: rgb(107 114 128) !important;
    font-weight: 400;
}

/* 在亮色模式下使用更深的顏色 */
@media (prefers-color-scheme: light) {
    .zigen-code {
        color: rgb(71 85 105) !important;
        /* 更深的灰色，使用 !important */
    }
}

/* 針對 zigen-item 內的編碼 */
@media (prefers-color-scheme: light) {
    .zigen-item .zigen-code {
        color: rgb(71 85 105) !important;
    }
}

.zigen-item:hover .zigen-code {
    color: rgb(245 243 255) !important;
}

.dark .zigen-item:hover .zigen-code {
    color: rgb(30 27 75) !important;
}

/* 彈出框樣式 - 與鍵位樣式一致 */
.popup-container {
    background: rgb(250 245 255);
    border: 1px solid rgb(233 213 255);
    border-radius: 1.25rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    transition: all 0.2s ease;
    overflow: hidden;
}

.dark .popup-container {
    background: rgb(30 27 75);
    border-color: rgb(88 28 135);
}

.popup-body {
    padding: 1rem;
}

.popup-title {
    font-size: 1rem;
    font-weight: 600;
    color: rgb(88 28 135);
    border-bottom: 1px solid rgb(233 213 255);
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
    text-align: center;
}

.dark .popup-title {
    color: rgb(196 181 253);
    border-bottom-color: rgb(147 51 234);
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
    background: rgb(254 226 226);
    border: 1px solid rgb(252 165 165);
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: rgb(220 38 38);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: 1rem;
}

.close-btn:hover {
    background: rgb(254 202 202);
    transform: scale(1.05);
}

.dark .close-btn {
    background: rgb(127 29 29);
    border-color: rgb(239 68 68);
    color: rgb(254 202 202);
}

.dark .close-btn:hover {
    background: rgb(153 27 27);
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
    background-color: rgb(254 243 199);
    font-size: 0.875rem;
    color: rgb(120 53 15);
    border: 1px solid rgb(251 191 36);
}

.dark .example-char {
    background-color: rgb(30 41 59);
    color: rgb(251 191 36);
    border-color: rgb(245 158 11);
}

/* 響應式設計 
手機和小屏幕設備上調整鍵位大小和字根字體大小 
*/
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

/* 佈局切換按鈕樣式 */
.layout-toggle-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    background-color: rgb(254 243 199);
    border: 1px solid rgb(251 191 36);
    color: rgb(120 53 15);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dark .layout-toggle-btn {
    background-color: rgb(30 41 59);
    border-color: rgb(245 158 11);
    color: rgb(251 191 36);
}

.layout-toggle-btn:hover {
    background-color: rgb(253 230 138);
    border-color: rgb(245 158 11);
    color: rgb(120 53 15);
}

.dark .layout-toggle-btn:hover {
    background-color: rgb(51 65 85);
    border-color: rgb(245 158 11);
    color: rgb(251 191 36);
}

.layout-toggle-active {
    background-color: rgb(196 181 253);
    border-color: rgb(147 51 234);
    color: rgb(88 28 135);
}

.dark .layout-toggle-active {
    background-color: rgb(147 51 234);
    border-color: rgb(196 181 253);
    color: rgb(245 243 255);
}

.layout-toggle-active:hover {
    background-color: rgb(167 139 250);
    border-color: rgb(126 34 206);
}

.scheme-button-active:hover {
    background-color: rgb(29 78 216);
    border-color: rgb(29 78 216);
}

.scheme-text {
    font-family: 'Noto Serif SC', serif;
    /* 使用宋體字體 */
}

/* 暗色模式下的圓形按鈕 */
@media (prefers-color-scheme: dark) {
    .scheme-button {
        background-color: rgb(37 99 235);
        border-color: rgb(37 99 235);
    }

    .scheme-button:hover {
        background-color: rgb(29 78 216);
        border-color: rgb(29 78 216);
    }

    .scheme-button-active {
        background-color: rgb(29 78 216);
        border-color: rgb(29 78 216);
        box-shadow: 0 0 0 3px rgba(59 130 246, 0.4);
    }
}

/* 懸停卡片中的字根列樣式 */
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
}

/* 移動端垂直列表樣式 */
.mobile-layout {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.mobile-key-row {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 2.5rem;
    padding: var(--mobile-key-padding);
    background: rgb(250 245 255);
    border: 1px solid rgb(233 213 255);
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: all 0.2s ease;
}

.dark .mobile-key-row {
    background: rgb(30 27 75);
    border-color: rgb(88 28 135);
}

.mobile-key-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    background: rgb(245 243 255);
    border-color: rgb(196 181 253);
}

.dark .mobile-key-row:hover {
    background: rgb(55 48 163);
    border-color: rgb(147 51 234);
}

.empty-mobile-key {
    opacity: 0.3;
}

.mobile-key-label {
    flex-shrink: 0;
    width: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(88 28 135);
    text-align: center;
    margin-right: 0.75rem;
}

.dark .mobile-key-label {
    color: rgb(196 181 253);
}

.mobile-zigen-container {
    flex: 1;
    display: flex;
    align-items: center;
}

.mobile-zigen-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.mobile-zigen-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    padding: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.375rem;
}

.mobile-zigen-item:hover {
    background: rgb(196 181 253);
    color: rgb(88 28 135);
}

.dark .mobile-zigen-item:hover {
    background: rgb(147 51 234);
    color: rgb(245 243 255);
}

/* 列表模式中的隱藏字根樣式 
隱藏字根即歸併在同一個編碼上的非主要字根
*/
.mobile-hidden-zigen {
    opacity: 0.7;
    background: var(--fallback-warning, oklch(var(--wa)/0.1));
    border: 1px solid var(--fallback-warning, oklch(var(--wa)/0.3));
}

.mobile-hidden-zigen:hover {
    opacity: 0.9;
    background: var(--fallback-warning, oklch(var(--wa)/0.2));
}

.mobile-zigen-item .zigen-font {
    font-size: 1rem;
    line-height: 1.2;
}

.mobile-zigen-item .zigen-code {
    font-family: monospace;
    font-size: 0.625rem;
    color: #666666;
    margin-top: 0.125rem;
}

.mobile-more-indicator {
    color: var(--fallback-bc, oklch(var(--bc)/0.5));
    font-size: 1rem;
    margin-left: 0.25rem;
}

.mobile-no-zigen {
    flex: 1;
    display: flex;
    align-items: center;
}

.mobile-key-desc {
    font-size: 0.75rem;
    color: var(--fallback-bc, oklch(var(--bc)/0.6));
    /* 移除斜体 */
}

/* 桌面端列表布局優化 */
.desktop-list-layout {
    width: 100%;
    min-width: 100%;
}

.desktop-list-layout .mobile-key-row {
    min-height: 3rem;
}

.desktop-list-layout .mobile-key-label {
    width: 2.5rem;
    font-size: 1rem;
    margin-right: 1rem;
}

.desktop-list-layout .mobile-zigen-item .zigen-font {
    font-size: 1.125rem;
}

.desktop-list-layout .mobile-zigen-item .zigen-code {
    font-size: 0.75rem;
}

.desktop-list-layout .mobile-key-desc {
    font-size: 0.875rem;
}
</style>
