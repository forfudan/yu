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
  - 2025-09-08 by 朱複丹: 添加編碼位置切換功能
  - 2025-09-10 by 朱複丹: 移除編碼位置切換功能，統一使用編碼在下方的佈局
  - 2025-12-30 by 朱複丹: 允許依照編碼長度對字根進行排序，將短碼字根優先顯示
                          允許在字根圖模式下點擊按鈕顯示所有字根
  - 2025-12-31 by 朱複丹: 允許用戶在字根圖中點擊按鈕展開查看更多例字
-->

<script setup lang="ts">
// 統一例字數量限制（不含展開按钮）
const MAX_EXAMPLES = 7;
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { fetchZigen } from "../search/share";
import ChaiDataLoader from "../search/ChaiDataLoader";
import { ZigenExportService } from "./exportService";
import type { ZigenMap as ZigenMapType, ChaifenMap, Chaifen } from "../search/share";

const props = defineProps<{
    defaultScheme?: string
    columnMinWidth?: string
    zigenFontClass?: string // 自定義字根字體類名
    alwaysVisibleZigens?: string // 始終顯示的字根列表（不會被隱藏）
}>()

// 字根字體類名，默認為 'zigen-font'
const zigenFontClass = computed(() => props.zigenFontClass || 'zigen-font')

// 根據方案決定始終顯示的字根
const alwaysVisibleZigens = computed(() => {
    // 如果外部有傳入，優先使用外部傳入的值
    if (props.alwaysVisibleZigens) {
        return props.alwaysVisibleZigens
    }
    // 否則根據方案自動判斷
    switch (activeScheme.value) {
        case 'ling':
            return 'Q　W乚　R冫⺀虍　T乀龵用　P巴　S　F丆　G　H　J攵　K丄　L　X朩　C䒑　V　⺈肀　N⺌⺮　M'
        default:
            return '冫'
    }
})

const columnMinWidth = toRef(props, 'columnMinWidth')

// Dynamic grid template columns based on columnMinWidth parameter
const gridTemplateColumns = computed(() => {
    const width = columnMinWidth.value || '1.0rem'
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
const sortKeysByAlphabet = ref(true);

// 字根編碼長度排序模式切換（將短編碼排在前面）
const sortByCodeLength = ref(false);

// 是否顯示所有字根（包括隱藏的重碼字根）
const showAllZigens = ref(false);

// 檢測屏幕尺寸
// 小於此寬度則為移動端顯示模式
const checkMobileView = () => {
    isMobileView.value = window.innerWidth < 720;
};

// 切換桌面端佈局模式
const toggleDesktopLayout = () => {
    isListView.value = !isListView.value;
};

// 切換按鍵排序模式
const toggleKeyOrder = () => {
    sortKeysByAlphabet.value = !sortKeysByAlphabet.value;
};

// 切換編碼長度排序模式
const toggleCodeLengthSort = () => {
    sortByCodeLength.value = !sortByCodeLength.value;
};

// 切換顯示所有字根
const toggleShowAllZigens = () => {
    showAllZigens.value = !showAllZigens.value;
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
const BaseSchemes = ['joy', 'light', 'star', 'ming', 'wafel', 'ling'];

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
// 已經檢查的字符數量
const cachedCheckedCount = ref<number>(0);
// 固定彈窗狀態
const pinnedZigen = ref<string | null>(null);
const pinnedZigenInfo = ref<{ visible: Array<{ font: string, code: string, pinyin?: string }>, hidden: Array<{ font: string, code: string, pinyin?: string }> } | null>(null);
const pinnedZigenExampleChars = ref<{ [zigenFont: string]: string[] }>({});
const isPinned = ref(false);
// 跟踪哪些字根的例字已展开显示所有
const expandedZigens = ref<Set<string>>(new Set());

// 導出功能相關狀態
const isExporting = ref(false);
const exportMessage = ref('');

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

    const result: Record<string, {
        visible: Array<{ font: string, code: string }>,
        hidden: Array<{ font: string, code: string }>,
        all: Array<{ font: string, code: string, isHidden: boolean }>
    }> = {};

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
    // 注意：不在這裡排序，以保持 visible/hidden 判斷的正確性
    for (let i = 0; i < validZigens.length; i++) {
        const zigen = validZigens[i];
        const { font, ma, firstLetter, code } = zigen;

        if (!result[firstLetter]) {
            result[firstLetter] = { visible: [], hidden: [], all: [] };
        }

        // 檢查前一個字根是否有相同的編碼和按鍵
        const prevZigen = i > 0 ? validZigens[i - 1] : null;
        const isPrevSameCodeAndKey = prevZigen &&
            prevZigen.code === code &&
            prevZigen.firstLetter === firstLetter;

        // 檢查是否已經有相同編碼的字根在visible中
        const existingWithSameCode = result[firstLetter].visible.find(item => item.code === code);

        // 检查当前字根是否在始終顯示列表中
        const shouldAlwaysShow = alwaysVisibleZigens.value.includes(font);

        let isHidden = false;
        if (!existingWithSameCode) {
            // 第一個具有此編碼的字根，放在visible中
            result[firstLetter].visible.push({ font, code });
            isHidden = false;
        } else if (isPrevSameCodeAndKey && !shouldAlwaysShow) {
            // 只有當前字根與前一個字根編碼相同且連續時，且不在始終顯示列表中，才放在hidden中
            result[firstLetter].hidden.push({ font, code });
            isHidden = true;
        } else {
            // 編碼相同但不連續，或在始終顯示列表中，作為新的visible字根顯示
            result[firstLetter].visible.push({ font, code });
            isHidden = false;
        }

        // 將所有字根加入 all 數組，保持原始順序
        result[firstLetter].all.push({ font, code, isHidden });
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

    // 先收集所有有效的字根數據
    const validZigens: Array<{ font: string, ma: string, firstLetter: string, code: string }> = [];

    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();

        // 只檢查編碼必須存在，字根字段存在即可（因為某些字根是私有區）
        if (!ma || ma.length === 0) continue;
        if (font === null || font === undefined) continue;

        const firstLetter = ma[0].toLowerCase();
        const code = ma.slice(1);

        validZigens.push({ font, ma, firstLetter, code });
    }

    // 如果啟用了按編碼長度排序，先對validZigens進行排序
    if (sortByCodeLength.value) {
        validZigens.sort((a, b) => {
            // 首先按首字母排序（保持按鍵分組）
            if (a.firstLetter !== b.firstLetter) {
                return 0; // 不改變不同按鍵的順序
            }
            // 在同一個按鍵下，先按編碼長度排序（2碼在前，3碼在後）
            if (a.code.length !== b.code.length) {
                return a.code.length - b.code.length;
            }
            // 編碼長度相同時，保持原有順序（穩定排序）
            return 0;
        });
    }

    // 按按鍵分組並處理連續相同編碼的字根
    for (let i = 0; i < validZigens.length; i++) {
        const zigen = validZigens[i];
        const { font, ma, firstLetter, code } = zigen;

        // 檢查前一個字根是否有相同的編碼和按鍵
        const prevZigen = i > 0 ? validZigens[i - 1] : null;
        const isPrevSameCodeAndKey = prevZigen &&
            prevZigen.code === code &&
            prevZigen.firstLetter === firstLetter;

        // 檢查是否已經有相同編碼的字根在當前按鍵下
        const existingWithSameCode = result[firstLetter].find(item => item.code === code && !item.isHidden);

        // 检查当前字根是否在始終顯示列表中
        const shouldAlwaysShow = alwaysVisibleZigens.value.includes(font);

        let isHidden = false;
        if (!existingWithSameCode) {
            // 第一個具有此編碼的字根，顯示為可見
            isHidden = false;
        } else if (isPrevSameCodeAndKey && !shouldAlwaysShow) {
            // 只有當前字根與前一個字根編碼相同且連續時，且不在始終顯示列表中，才標記為隱藏
            isHidden = true;
        } else {
            // 編碼相同但不連續，或在始終顯示列表中，作為新的可見字根顯示
            isHidden = false;
        }

        result[firstLetter].push({ font, code, isHidden });
    }

    return result;
});

// 獲取包含指定字根的例字
const getExampleChars = async (zigen: string): Promise<string[]> => {
    // 確保字根是正確的 Unicode 字符串
    const normalizedZigen = zigen.normalize('NFC');

    let examples: Set<string> = new Set();

    // 檢查緩存中是否已有該字根的例字
    if (cachedExampleChars.value.has(normalizedZigen)) {
        examples = cachedExampleChars.value.get(normalizedZigen)!;
        console.log(`✅ 從緩存中獲取字根 "${normalizedZigen}" 的例字 ${examples.size} 個`);
        // 只返回前 MAX_EXAMPLES 个
        return Array.from(examples).slice(0, MAX_EXAMPLES);
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
                    // 每個字根最多緩存20個例字
                    if (set.size < 20) {
                        set.add(char);
                    }

                    if (zigenItem === normalizedZigen) {
                        examples = set;
                        console.log(`✅ 找到匹配: "${char}" 包含字根 "${normalizedZigen}", 拆分: "${charData.d}"`);
                    }
                }

                // 當前字根已經找到足夠多的例字時中斷
                if (examples.size >= 20) {
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
        console.error('獲取例字失敗:', error);
        if (error instanceof Error && error.message === '數據加載超時') {
            console.error('數據加載超時，請檢查網絡連接');
        }
        return Array.from(examples);
    }
}

// 獲取包含指定字根的所有例字（不限制數量）
const getAllExampleChars = async (zigen: string): Promise<string[]> => {
    const normalizedZigen = zigen.normalize('NFC');
    let examples: Set<string> = new Set();

    if (!chaifenLoader.value) {
        console.log('chaifenLoader 未初始化');
        return [];
    }

    try {
        console.log(`開始為字根 "${zigen}" 搜索所有例字...`);

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('數據加載超時')), 30000); // 30秒超時
        });

        const optimizedData = await Promise.race([
            chaifenLoader.value.loadData(),
            timeoutPromise
        ]);

        // 遍歷所有字符，不限制數量
        for (const [char, data] of Object.entries(optimizedData)) {
            const charData = data as { d?: string, dt?: string, r?: string };

            if (charData.d && charData.d.includes(normalizedZigen)) {
                examples.add(char);
            }
        }

        console.log(`字根 "${normalizedZigen}" 找到所有例字: ${examples.size} 個`);
        return Array.from(examples);

    } catch (error) {
        console.error('獲取所有例字失敗:', error);
        return Array.from(examples);
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

// 獲取鍵位標註文本
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
        newPinnedZigenExampleChars[z.font] = examples; // 保存所有例字，不限制數量
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
    expandedZigens.value.clear();
}

// 切換例字展開/收起
async function toggleExpandExamples(zigenFont: string) {
    if (expandedZigens.value.has(zigenFont)) {
        // 收起
        expandedZigens.value.delete(zigenFont);
    } else {
        // 展開 - 加載所有例字
        expandedZigens.value.add(zigenFont);

        // 如果當前只有 7 個例字，則加載所有例字
        if (pinnedZigenExampleChars.value[zigenFont]?.length <= MAX_EXAMPLES) {
            console.log(`正在加載字根 "${zigenFont}" 的所有例字...`);
            const allExamples = await getAllExampleChars(zigenFont);
            pinnedZigenExampleChars.value[zigenFont] = allExamples;
            console.log(`已加載字根 "${zigenFont}" 的 ${allExamples.length} 個例字`);
        }
    }
}

// 導出字根圖功能
async function exportZigenMap() {
    if (isExporting.value) return;

    isExporting.value = true;
    exportMessage.value = '';

    try {
        // 找到字根圖容器元素
        const containerElement = document.querySelector('.zigen-map-container') as HTMLElement;
        if (!containerElement) {
            throw new Error('找不到字根圖容器元素');
        }

        // 關閉任何開啟的彈窗，避免影響導出
        if (isPinned.value) {
            closePinnedPopup();
        }

        // 等待一下讓彈窗完全關閉
        await new Promise(resolve => setTimeout(resolve, 100));

        // 獲取方案顯示名稱
        const schemeName = ZigenExportService.getSchemeDisplayName(activeScheme.value);

        // 導出圖片
        const result = await ZigenExportService.exportZigenMapToPNG(
            containerElement,
            schemeName,
            isListView.value,
            {
                copyToClipboard: false, // 不复制到剪贴板
                download: true,
                scale: 3, // 提高分辨率
                addWatermark: true
            }
        );

        if (result.success) {
            exportMessage.value = result.message;
            // 3秒後清除消息
            setTimeout(() => {
                exportMessage.value = '';
            }, 3000);
        } else {
            exportMessage.value = result.message;
            // 5秒後清除錯誤消息
            setTimeout(() => {
                exportMessage.value = '';
            }, 5000);
        }

    } catch (error) {
        console.error('導出字根圖失敗:', error);
        exportMessage.value = `導出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        setTimeout(() => {
            exportMessage.value = '';
        }, 5000);
    } finally {
        isExporting.value = false;
    }
}

// 判斷是否為小根（總編碼長度為2的字根），僅對靈明和日月生效
function isSmallRoot(code: string): boolean {
    // 只對靈明和日月啟用小根標識
    if (!['ling', 'ming'].includes(activeScheme.value)) {
        return false;
    }
    // 判斷小碼部分的長度是否為1
    return code.length === 1;
}

// 輔助函數：找到所有相同完整編碼的字根
function findSameCodeZigens(targetFont: string, targetFullCode: string) {
    const visible: Array<{ font: string, code: string, pinyin?: string }> = [];
    const hidden: Array<{ font: string, code: string, pinyin?: string }> = [];

    if (!zigenMap.value || !targetFullCode) return { visible, hidden };

    for (const [key, data] of zigenMap.value) {
        const font = data.font;
        const ma = data.ma?.trim();
        const pinyin = data.pinyin?.trim();

        if (!ma || !font || font === null || font === undefined) continue;

        // 比较完整编码
        if (ma === targetFullCode) {
            if (font === targetFont) {
                // 當前懸停的字根放在最前面
                visible.unshift({ font, code: ma, pinyin }); // 使用完整編碼顯示
            } else {
                // 其他相同完整編碼的字根
                hidden.push({ font, code: ma, pinyin }); // 使用完整編碼顯示
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
        <div v-if="!isLoading" class="flex justify-between items-center mb-4 px-5">
            <div class="text-sm text-gray-500 dark:text-gray-400">
                點擊字根可查看例字
            </div>

            <!-- 桌面端控制按鈕 -->
            <div v-if="!isMobileView" class="flex items-center space-x-4">
                <!-- 導出按鈕 -->
                <div class="flex items-center space-x-2">
                    <button @click="exportZigenMap" class="export-btn layout-toggle-btn"
                        :class="{ 'layout-toggle-active': isExporting }" :disabled="isExporting"
                        :title="isExporting ? '導出中...' : '導出字根圖'">
                        <span v-if="!isExporting">📸</span>
                        <span v-else>⏳</span>
                    </button>
                    <span v-if="exportMessage" class="text-xs"
                        :class="exportMessage.includes('失敗') ? 'text-red-500' : 'text-green-500'">
                        {{ exportMessage }}
                    </span>
                </div>

                <!-- 編碼長度排序切換按鈕（網格和列表視圖都可用） -->
                <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">編碼長度</span>
                    <button @click="toggleCodeLengthSort" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': sortByCodeLength }"
                        :title="sortByCodeLength ? '恢復原始順序' : '短編碼優先（2碼→3碼）'">
                        <span v-if="!sortByCodeLength">🔢</span>
                        <span v-else>📏</span>
                    </button>
                </div>
                <!-- 桌面端列表視圖按鍵排序切換按鈕 -->
                <div v-if="isListView" class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">按鍵排序</span>
                    <button @click="toggleKeyOrder" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': sortKeysByAlphabet }"
                        :title="sortKeysByAlphabet ? '切換為鍵盤順序' : '切換為字母順序'">
                        <span v-if="sortKeysByAlphabet">🔤</span>
                        <span v-else>⌨️</span>
                    </button>
                </div>
                <!-- 網格視圖下的「全部顯示」按鈕 -->
                <div v-if="!isListView" class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">顯示模式</span>
                    <button @click="toggleShowAllZigens" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': showAllZigens }" :title="showAllZigens ? '隱藏重碼字根' : '顯示所有字根'">
                        <span v-if="!showAllZigens">👁️</span>
                        <span v-else>👁️‍🗨️</span>
                    </button>
                </div>
                <!-- 切換圖表形態按鈕（永遠在最右邊） -->
                <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">切換圖表形態</span>
                    <button @click="toggleDesktopLayout" class="layout-toggle-btn"
                        :class="{ 'layout-toggle-active': isListView }" :title="isListView ? '切換為網格布局' : '切換為列表布局'">
                        <span v-if="!isListView">☰</span>
                        <span v-else>⊞</span>
                    </button>
                </div>
            </div>

            <!-- 移動端按鍵排序切換按鈕 -->
            <div v-if="isMobileView" class="flex items-center space-x-2">
                <!-- 移動端導出按鈕 -->
                <button @click="exportZigenMap" class="export-btn layout-toggle-btn"
                    :class="{ 'layout-toggle-active': isExporting }" :disabled="isExporting"
                    :title="isExporting ? '導出中...' : '導出字根圖'">
                    <span v-if="!isExporting">📸</span>
                    <span v-else>⏳</span>
                </button>

                <span class="text-xs text-gray-400">按鍵排序</span>
                <button @click="toggleKeyOrder" class="layout-toggle-btn"
                    :class="{ 'layout-toggle-active': sortKeysByAlphabet }"
                    :title="sortKeysByAlphabet ? '切換為鍵盤順序' : '切換為字母順序'">
                    <span v-if="sortKeysByAlphabet">🔤</span>
                    <span v-else>⌨️</span>
                </button>

                <span class="text-xs text-gray-400">編碼長度</span>
                <button @click="toggleCodeLengthSort" class="layout-toggle-btn"
                    :class="{ 'layout-toggle-active': sortByCodeLength }"
                    :title="sortByCodeLength ? '恢復原始順序' : '短編碼優先（2碼→3碼）'">
                    <span v-if="!sortByCodeLength">🔢</span>
                    <span v-else>📏</span>
                </button>
            </div>

            <!-- 移動端導出消息 -->
            <div v-if="isMobileView && exportMessage" class="mt-2 text-center">
                <span class="text-xs" :class="exportMessage.includes('失敗') ? 'text-red-500' : 'text-green-500'">
                    {{ exportMessage }}
                </span>
            </div>
        </div>

        <!-- 鍵盤字根圖 - 桌面端網格佈局 -->
        <div v-if="!isLoading && zigenMap && !isMobileView && !isListView" class="keyboard-layout">
            <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
                <div v-for="key in row" :key="key" class="keyboard-key"
                    :class="{ 'empty-key': emptyKeys.includes(key) }">
                    <!-- 鍵位標籤 -->
                    <div class="key-label">{{ key.toUpperCase() }}</div>

                    <!-- 字根顯示 - 根據 showAllZigens 決定顯示哪些字根 -->
                    <div v-if="!emptyKeys.includes(key) && zigenByKey[key]?.visible.length > 0"
                        class="zigen-list text-indigo-800 dark:text-indigo-300" :style="{ gridTemplateColumns }">
                        <span v-for="(zigen, index) in (sortByCodeLength ?
                            [...(showAllZigens ? zigenByKey[key].all : zigenByKey[key].all.filter(z => !z.isHidden))].sort((a, b) => a.code.length - b.code.length) :
                            (showAllZigens ? zigenByKey[key].all : zigenByKey[key].all.filter(z => !z.isHidden)))"
                            :key="index" class="zigen-item" :class="{ 'small-root-zigen': isSmallRoot(zigen.code) }"
                            @click="handleZigenClick($event, zigen)">
                            <span :class="zigenFontClass">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code }}</span>
                        </span>
                        <!-- 如果有隱藏的字根且未顯示全部，顯示省略號 -->
                        <span v-if="!showAllZigens && zigenByKey[key].hidden.length > 0" class="more-indicator">⋯</span>
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
                            class="mobile-zigen-item" :class="{
                                'mobile-hidden-zigen': zigen.isHidden,
                                'mobile-small-root-zigen': !zigen.isHidden && isSmallRoot(zigen.code)
                            }" @click="handleZigenClick($event, zigen)">
                            <span :class="zigenFontClass">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code
                            }}</span>
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
                            class="zigen-row-wrapper">
                            <div class="zigen-row-inline">
                                <div class="zigen-header-inline current-zigen">
                                    <span :class="zigenFontClass">{{ zigen.font }}</span>
                                </div>
                                <!-- 該字根的例字 - 直接跟在字根後面 -->
                                <div v-if="pinnedZigenExampleChars[zigen.font]?.length > 0"
                                    class="example-chars-same-line">
                                    <span
                                        v-for="char in (expandedZigens.has(zigen.font) ? pinnedZigenExampleChars[zigen.font] : pinnedZigenExampleChars[zigen.font].slice(0, MAX_EXAMPLES))"
                                        :key="char" class="example-char zigen-font">{{ char }}</span>
                                    <!-- 總是顯示展開/收起按鈕 -->
                                    <button @click.stop="toggleExpandExamples(zigen.font)"
                                        class="example-char expand-btn" type="button"
                                        :title="expandedZigens.has(zigen.font) ? '收起' : '展開顯示所有例字'">
                                        {{ expandedZigens.has(zigen.font) ? '▲' : '▼' }}
                                    </button>
                                </div>
                                <div v-else class="example-chars-same-line">
                                    <span class="loading-text">正在加載...</span>
                                </div>
                            </div>
                            <!-- 顯示 pinyin 信息 -->
                            <div v-if="zigen.pinyin" class="pinyin-info">
                                {{ zigen.pinyin }}
                            </div>
                        </div>

                        <!-- 隱藏字根 -->
                        <div v-for="(zigen, index) in pinnedZigenInfo.hidden" :key="`pinned-hidden-${index}`"
                            class="zigen-row-wrapper">
                            <div class="zigen-row-inline">
                                <div class="zigen-header-inline other-zigen">
                                    <span :class="zigenFontClass">{{ zigen.font }}</span>
                                </div>
                                <!-- 該字根的例字 - 直接跟在字根後面 -->
                                <div v-if="pinnedZigenExampleChars[zigen.font]?.length > 0"
                                    class="example-chars-same-line">
                                    <span
                                        v-for="char in (expandedZigens.has(zigen.font) ? pinnedZigenExampleChars[zigen.font] : pinnedZigenExampleChars[zigen.font].slice(0, MAX_EXAMPLES))"
                                        :key="char" class="example-char zigen-font">{{ char }}</span>
                                    <!-- 總是顯示展開/收起按鈕 -->
                                    <button @click.stop="toggleExpandExamples(zigen.font)"
                                        class="example-char expand-btn" type="button"
                                        :title="expandedZigens.has(zigen.font) ? '收起' : '展開顯示所有例字'">
                                        {{ expandedZigens.has(zigen.font) ? '▲' : '▼' }}
                                    </button>
                                </div>
                                <div v-else class="example-chars-same-line">
                                    <span class="loading-text">正在加載...</span>
                                </div>
                            </div>
                            <!-- 顯示 pinyin 信息 -->
                            <div v-if="zigen.pinyin" class="pinyin-info">
                                {{ zigen.pinyin }}
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
    background: rgb(249 250 251);
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
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
    /* color: var(--fallback-nc, oklch(var(--nc)/0.8)); */
    border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc)/0.15));
    padding-bottom: 0.15rem;
    margin-bottom: 0.15rem;
    width: 100%;
    text-align: center;
}

.zigen-list {
    display: grid !important;
    /* grid-template-columns will be set dynamically via :style */
    justify-items: start !important;
    align-items: start !important;
    gap: 0.05rem 0.01rem !important;
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
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    font-size: 0.9rem;
    padding: 0.01rem 0.01rem !important;
    border-radius: 0.2rem;
    transition: all 0.15s ease;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.0 !important;
    margin: 0rem 0rem !important;
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

/* 编码长度换行样式 */
.code-length-break {
    width: 100%;
    height: 0;
    flex-basis: 100%;
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
    display: block !important;
    margin-top: 0.01rem !important;
    text-align: center !important;
    font-family: monospace;
    font-size: 0.6rem !important;
    color: #666666 !important;
    font-weight: 400;
    line-height: 1.0 !important;
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
    background-color: rgb(243 244 246);
    border: 1px solid rgb(209 213 219);
    color: rgb(107 114 128);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dark .layout-toggle-btn {
    background-color: rgb(55 65 81);
    border-color: rgb(75 85 99);
    color: rgb(156 163 175);
}

.layout-toggle-btn:hover {
    background-color: rgb(229 231 235);
    border-color: rgb(156 163 175);
    color: rgb(75 85 99);
}

.dark .layout-toggle-btn:hover {
    background-color: rgb(75 85 99);
    border-color: rgb(107 114 128);
    color: rgb(209 213 219);
}

.layout-toggle-active {
    background-color: rgb(59 130 246);
    border-color: rgb(59 130 246);
    color: white;
}

.dark .layout-toggle-active {
    background-color: rgb(59 130 246);
    border-color: rgb(59 130 246);
    color: white;
}

.layout-toggle-active:hover {
    background-color: rgb(37 99 235);
    border-color: rgb(37 99 235);
}

/* 導出按鈕特殊樣式 */
.export-btn {
    position: relative;
}

.export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.export-btn:disabled:hover {
    transform: none;
    background-color: rgb(243 244 246);
    border-color: rgb(209 213 219);
    color: rgb(107 114 128);
}

.dark .export-btn:disabled:hover {
    background-color: rgb(55 65 81);
    border-color: rgb(75 85 99);
    color: rgb(156 163 175);
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
.zigen-row-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 0.5rem;
}

.zigen-row-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem 0.5rem 0 0;
    background: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
}

.zigen-row-wrapper:not(:has(.pinyin-info)) .zigen-row-inline {
    border-radius: 0.5rem;
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

.example-chars-same-line .expand-btn {
    cursor: pointer;
    background: var(--fallback-info, oklch(var(--in)/0.15));
    color: var(--fallback-info, oklch(var(--in)/1));
    border: 1px solid var(--fallback-info, oklch(var(--in)/0.4));
    font-weight: bold;
    transition: all 0.2s ease;
    user-select: none;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.875rem;
    line-height: 1;
    min-width: 1.5rem;
}

.example-chars-same-line .expand-btn:hover {
    background: var(--fallback-info, oklch(var(--in)/0.25));
    transform: scale(1.1);
}

.example-chars-same-line .expand-btn:active {
    transform: scale(0.95);
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
    background: rgb(249 250 251);
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: all 0.2s ease;
}

.dark .mobile-key-row {
    background: rgb(15 23 42);
}

.mobile-key-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.empty-mobile-key {
    opacity: 0.3;
}

.mobile-key-label {
    flex-shrink: 0;
    width: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    /* color: var(--fallback-nc, oklch(var(--nc)/0.8)); */
    text-align: center;
    margin-right: 0.75rem;
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
    background: var(--fallback-bc, oklch(var(--bc)/0.1));
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

/* 小根樣式（編碼長度為2的字根）- 網格布局 */
.small-root-zigen {
    background: rgba(147, 197, 253, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.dark .small-root-zigen {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.small-root-zigen:hover {
    background: rgba(147, 197, 253, 0.15) !important;
    border-color: rgba(59, 130, 246, 0.3) !important;
}

.dark .small-root-zigen:hover {
    background: rgba(59, 130, 246, 0.12) !important;
    border-color: rgba(59, 130, 246, 0.35) !important;
}

/* 小根樣式（編碼長度為2的字根）- 移動端和列表布局 */
.mobile-small-root-zigen {
    background: rgba(147, 197, 253, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.15);
}

.dark .mobile-small-root-zigen {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.mobile-small-root-zigen:hover {
    background: rgba(147, 197, 253, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
}

.dark .mobile-small-root-zigen:hover {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.35);
}

.mobile-zigen-item .zigen-font {
    font-size: 1rem;
    line-height: 1.2;
}

.mobile-zigen-item .zigen-code {
    font-family: monospace;
    font-size: 0.55rem !important;
    color: #666666;
    margin-top: 0.05rem !important;
    line-height: 1.0 !important;
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

/* Pinyin 信息样式 */
.pinyin-info {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--fallback-bc, oklch(var(--bc)/0.7));
    background: var(--fallback-b3, oklch(var(--b3)/0.5));
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    border-top: none;
    border-radius: 0 0 0.5rem 0.5rem;
    font-style: normal;
}
</style>
