<!--
    ZigenTrain.vue - 字根練習組件
    
    實現分組字根訓練與改進的間隔重複算法。
    將相同編碼的字根歸為一組同時顯示。
    
    主要修改歷史:
    - 2025-12-31: 合併 TrainCardGroup.vue，統一為單一文件
    - 2025-09-01: 優化字根練習邏輯，支援同編碼字根分組顯示，改進記憶演算法
    - 之前: 單個字根練習模式
-->

<script setup lang="ts">
/** 字根練習 - 優化版 */
import { shallowRef, onMounted, ref, computed, nextTick, watch, onBeforeUnmount } from "vue";
import { Card, cache, fetchChaifenOptimized, fetchZigen, makeCodesFromDivision, find8relativeChars, ChaifenMap } from "./share";
import { AdvancedSchedule } from "./advancedSchedule";
import {
    useCellWidth,
    useVisibleOffset,
    useCenterPosition,
    useVisibleItems,
    useCurrentPositionInVisible,
    isInVisibleRange as checkIsInVisibleRange
} from "./cascadeStyles";

interface ZigenGroup {
    /** 編碼 */
    code: string;
    /** 字根列表 */
    zigens: Array<{ font: string; ma: string; pinyin?: string }>;
}

const p = defineProps<{
    /** 方案的名字 */
    name: string,
    /** 字根映射的csv文件URL */
    zigenUrl: string
    /** 練習的範圍，從第幾條到第幾條，不填则是全部 */
    range?: [start: number, end: number]
    /** 字根練習的模式 */
    mode: 'A' | 'a' | 'both'
    /** 編碼規則，可選值: joy, light, star, ming, wafel, ling */
    rule?: string
    /** 拆分數據的URL，默認根據方案名稱生成 */
    chaifenUrl?: string
}>()

let cardsName = p.name + '_zigen_grouped'
const range = p.range
if (range) {
    cardsName += `_${range[0]}_${range[1]}`
}

// 使用基於索引的調度演算法
const schedule = new AdvancedSchedule(cardsName);

// 字頻序相關 - 添加狀態持久化
const storageKey = `zigen_sort_order_${p.name}`
const isFrequencyOrder = ref(false)
const originalCardGroups = shallowRef<ZigenGroup[]>()
const cardGroups = shallowRef<ZigenGroup[]>()
const chaifenMap = shallowRef<ChaifenMap>()

// 練習相關狀態
const currentIndex = ref(0);
const inputElement = ref<HTMLInputElement>();
const inputValue = ref<string>('');
const showAnswer = ref(false);
const isCorrect = ref(true);
const wrongInputCount = ref(0);
const showResetConfirm = ref(false);
// 用於強制更新進度條的響應式狀態
const forceUpdate = ref(0);

// 響應式字根大小計算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const cascadeContainer = ref<HTMLElement>();

const handleResize = () => {
    windowWidth.value = window.innerWidth;
};

// Cascade 展示相關計算屬性 - 使用公用工具函數
const cellWidth = useCellWidth(cascadeContainer, windowWidth);
const visibleOffset = useVisibleOffset(windowWidth);
const centerPosition = useCenterPosition(windowWidth);

// 從 localStorage 載入排序狀態
function loadSortOrder() {
    try {
        const saved = localStorage.getItem(storageKey)
        if (saved !== null) {
            const savedValue = JSON.parse(saved)
            isFrequencyOrder.value = savedValue
            console.log('載入保存的排序狀態:', savedValue)
        }
    } catch (error) {
        console.warn('載入排序狀態失敗:', error)
    }
}

// 保存排序狀態到 localStorage
function saveSortOrder() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(isFrequencyOrder.value))
        console.log('排序狀態已保存:', isFrequencyOrder.value)
    } catch (error) {
        console.warn('保存排序狀態失敗:', error)
    }
}

// 高頻字根（按優先級排序）
const highFreqZigens = ['口', '一', '月', '丶', '日', '人', '亻', '扌', '白', '土', '丷', '二', '又', '丿', '宀', '木', '尚', '辶', '小', '冖', '厶', '心', '氵', '八', '女', '大', '艹', '𠂇', '匕', '寸', '也', '乙', '戈', '目', '讠', '不', '龰', '阝', '竹', '了', '十', '夂', '王', '刂', '儿', '力', '凵', '冂', '子', '斤', '火', '米', '丁', '彐', '纟', '文', '立', '士', '夕', '乂', '门', '卜', '自', '尤', '彳', '羊', '止', '禾', '贝', '尸', '工', '乚', '上', '囗', '至', '手', '𬺰', '艮', '车', '石', '田', '己', '几', '牛', '见', '走', '甲', '且', '彡', '犬', '巾', '西', '方', '刀', '殳', '七', '弓', '巴', '矢', '示']

// 低頻字根（排到最後）
const lowFreqZigens = ['鳥', '烏', '魚', '馬', '風', '來', '車', '長', '門', '鬥', '齒', '飛', '見', '貝', '鹵', '僉', '咼']

const getCode = (ma: string) => {
    switch (p.mode) {
        case 'A':
            return ma[0];
        case 'a':
            return ma[1];
        case 'both':
            return ma;
        default:
            return undefined;
    }
}

// 獲取字根組的頻率優先級
function getZigenGroupPriority(group: ZigenGroup): number {
    // 檢查組內是否包含高頻字根
    for (const zigen of group.zigens) {
        const highFreqIndex = highFreqZigens.indexOf(zigen.font)
        if (highFreqIndex !== -1) {
            return highFreqIndex // 越小優先級越高
        }
    }

    // 檢查組內是否包含低頻字根
    for (const zigen of group.zigens) {
        const lowFreqIndex = lowFreqZigens.indexOf(zigen.font)
        if (lowFreqIndex !== -1) {
            return 10000 + lowFreqIndex // 排到最後
        }
    }

    return 5000 // 中等優先級
}

// 按字頻排序字根組
function sortGroupsByFrequency(groups: ZigenGroup[]): ZigenGroup[] {
    return [...groups].sort((a, b) => {
        const priorityA = getZigenGroupPriority(a)
        const priorityB = getZigenGroupPriority(b)
        return priorityA - priorityB
    })
}

// 切換排序模式
function toggleSortOrder() {
    console.log('切換排序模式被調用，當前狀態:', isFrequencyOrder.value)
    isFrequencyOrder.value = !isFrequencyOrder.value
    console.log('切換後狀態:', isFrequencyOrder.value)
    saveSortOrder() // 保存狀態
    applySortOrder() // 應用排序
    console.log('排序應用完成，按鈕應該顯示為:', isFrequencyOrder.value ? '橙色（字頻序）' : '灰色（字典序）')

    // 自動刷新頁面以確保排序生效
    setTimeout(() => {
        window.location.reload();
    }, 100);
}

// 應用排序邏輯
function applySortOrder() {
    if (originalCardGroups.value) {
        if (isFrequencyOrder.value) {
            cardGroups.value = sortGroupsByFrequency(originalCardGroups.value)
            console.log('已切換到字頻序，重新排序了', cardGroups.value.length, '個字根組')
        } else {
            cardGroups.value = [...originalCardGroups.value] // 創建新數組以觸發響應式更新
            console.log('已切換到字典序，恢復原始順序')
        }
        // 確保響應式更新
        nextTick(() => {
            console.log('排序更新完成，當前順序:', cardGroups.value.slice(0, 3).map(g => g.code))
        })
    } else {
        console.warn('originalCardGroups 未初始化，無法應用排序')
    }
}

// 將字根按相同編碼分組，參考 ZigenMap.vue 的邏輯
function groupZigensByCode(zigenValues: Array<{ font: string; ma: string }>) {
    const groups: ZigenGroup[] = [];
    let skippedCount = 0;
    const skippedItems: Array<{ font: string; ma: string; reason: string }> = [];

    console.log('=== 开始分组字根 ===');
    console.log('输入字根总数:', zigenValues.length);
    console.log('练习模式:', p.mode);

    for (let i = 0; i < zigenValues.length; i++) {
        const current = zigenValues[i];
        const currentCode = getCode(current.ma)?.toLowerCase();

        if (!currentCode) {
            skippedCount++;
            skippedItems.push({
                font: current.font,
                ma: current.ma,
                reason: `getCode返回空值，mode=${p.mode}`
            });
            console.warn(`跳过字根 ${i}: ${current.font} (${current.ma}) - getCode返回: ${getCode(current.ma)}`);
            continue;
        }

        // 檢查是否與前一個字根編碼相同且連續
        const prev = i > 0 ? zigenValues[i - 1] : null;
        const prevCode = prev ? getCode(prev.ma)?.toLowerCase() : null;

        if (prevCode === currentCode && groups.length > 0 && groups[groups.length - 1].code === currentCode) {
            // 添加到現有組
            groups[groups.length - 1].zigens.push(current);
        } else {
            // 創建新組
            groups.push({
                code: currentCode,
                zigens: [current]
            });
        }
    }

    console.log('=== 分组完成 ===');
    console.log('有效组数:', groups.length);
    console.log('跳过的字根数:', skippedCount);
    if (skippedCount > 0) {
        console.log('跳过的字根详情:', skippedItems);
        console.log('前10个跳过的字根原因统计:');
        const reasons = skippedItems.slice(0, 10).map(item => `${item.font}(${item.ma}): ${item.reason}`);
        reasons.forEach(reason => console.log(`  - ${reason}`));
    }

    return groups;
}

// 重置訓練
function resetTraining() {
    // 重置調度系統需要等數據載入後
    if (originalCardGroups.value) {
        schedule.reset()

        // 重置排序狀態為字典序
        isFrequencyOrder.value = false
        saveSortOrder()

        // 重新應用排序
        applySortOrder()

        // 重置組件狀態
        currentIndex.value = 0;
        inputValue.value = '';
        showAnswer.value = false;
        isCorrect.value = true;
        wrongInputCount.value = 0;

        // 重新初始化
        schedule.initializeWithGroupCount(cardGroups.value.length);
        nextGroup();

        // 強制更新進度顯示
        forceUpdate.value++;

        console.log('訓練已重置，排序狀態重置為字典序')
    }
}

// 處理重置確認
const handleReset = () => {
    showResetConfirm.value = true;
}

const confirmReset = () => {
    resetTraining();
    showResetConfirm.value = false;
    // 強制刷新頁面以確保完全重置
    setTimeout(() => {
        window.location.reload();
    }, 100);
}

const cancelReset = () => {
    showResetConfirm.value = false;
}

// 計算字根大小類名
const zigenSizeClass = computed(() => {
    if (!currentGroup.value) return 'text-8xl';

    const zigenCount = currentGroup.value.zigens.length;
    const isSmallScreen = windowWidth.value < 768; // sm breakpoint
    const isMediumScreen = windowWidth.value < 720; // lg breakpoint

    if (isSmallScreen) {
        // 小屏幕：按字根數量調整
        if (zigenCount <= 2) return 'text-6xl';
        if (zigenCount <= 4) return 'text-5xl';
        return 'text-4xl';
    } else if (isMediumScreen) {
        // 中等屏幕：稍大一些
        if (zigenCount <= 2) return 'text-8xl';
        if (zigenCount <= 4) return 'text-7xl';
        return 'text-6xl';
    } else {
        // 大屏幕：最大字體
        if (zigenCount <= 2) return 'text-9xl';
        if (zigenCount <= 4) return 'text-8xl';
        return 'text-7xl';
    }
});

// 計算間距類名
const zigenGapClass = computed(() => {
    if (!currentGroup.value) return 'gap-8 lg:gap-12';

    const zigenCount = currentGroup.value.zigens.length;
    const isSmallScreen = windowWidth.value < 768;

    if (isSmallScreen) {
        // 手機端進一步減少間距
        return zigenCount > 4 ? 'gap-1' : zigenCount > 2 ? 'gap-2' : 'gap-3';
    } else {
        return zigenCount > 4 ? 'gap-6' : 'gap-8 lg:gap-12';
    }
});

const currentGroup = computed(() => cardGroups.value ? cardGroups.value[currentIndex.value] : null);
const totalGroups = computed(() => cardGroups.value ? cardGroups.value.length : 0);

// Cascade 展示：获取当前字根组前后的字根组 - 使用公用工具函數
const visibleGroups = computed(() => {
    if (!cardGroups.value || cardGroups.value.length === 0) return [];

    // 使用公用工具函數生成可見項目，並轉換為原有的格式
    const items = useVisibleItems(cardGroups, currentIndex).value;
    return items.map(item => ({
        group: item.item,
        offset: item.offset,
        index: item.index,
        isCurrent: item.isCurrent
    }));
});

// 计算当前元素在 visibleGroups 中的位置
const currentPositionInVisible = computed(() => {
    const idx = visibleGroups.value.findIndex(item => item.isCurrent);
    return idx >= 0 ? idx : 0;
});

// 判断元素是否在可视范围内（用于优化显示）
const isInVisibleRange = (offset: number) => {
    return checkIsInVisibleRange(offset, visibleOffset.value);
};

// 使用已練習的字根組數來顯示進度，確保進度穩定且準確
const practiceProgress = computed(() => {
    // 依賴 forceUpdate 來觸發重新計算
    forceUpdate.value;

    // 使用基於索引的調度系統統計
    const stats = schedule.getProgressStats();

    return {
        current: stats.practiced,
        total: stats.total,
        mastered: stats.mastered,
        percentage: stats.percentage.toFixed(1)
    };
});

const progress = computed(() =>
    practiceProgress.value.percentage
);

// 檢測當前字根組是否包含拼音信息
const hasPinyinData = computed(() => {
    if (!currentGroup.value) return false;
    return currentGroup.value.zigens.some(zigen =>
        zigen.font && zigen.font.trim() !== '' &&  // 確保字根不為空
        zigen.pinyin && zigen.pinyin.trim() !== ''  // 確保拼音有效
    );
});

// 獲取當前字根組的拼音列表
const pinyinList = computed(() => {
    if (!hasPinyinData.value || !currentGroup.value) return [];
    return currentGroup.value.zigens
        .filter(zigen =>
            zigen.font && zigen.font.trim() !== '' &&  // 確保字根不為空
            zigen.pinyin && zigen.pinyin.trim() !== '' && zigen.pinyin !== 'Ø'  // 確保拼音有效
        )
        .map(zigen => ({
            font: zigen.font,
            pinyin: zigen.pinyin
        }));
});

// 檢查是否已完成所有學習
const isCompleted = computed(() => {
    forceUpdate.value; // 依賴更新觸發器
    return schedule.isCompleted();
});

// 監聽輸入，自動處理正確答案或錯誤提示
watch(inputValue, (newValue) => {
    if (!currentGroup.value) return;

    const input = newValue.trim().toLowerCase();
    const expectedCode = currentGroup.value.code.toLowerCase();

    // 檢查輸入長度是否達到預期編碼長度
    if (input.length >= expectedCode.length) {
        if (input === expectedCode) {
            // 正確答案，直接進入下一組
            handleCorrectAnswer();
        } else if (!showAnswer.value) {
            // 錯誤答案且未顯示答案，顯示答案並記錄錯誤
            handleWrongAnswer();
        }
    }
});

const handleCorrectAnswer = () => {
    if (!currentGroup.value) return;

    isCorrect.value = true;

    // 使用基於索引的調度演算法記錄成功
    schedule.recordSuccess(currentIndex.value);
    // 觸發進度條更新
    forceUpdate.value++;

    // 立即進入下一組，無延遲
    nextGroup();
};

const handleWrongAnswer = () => {
    if (!currentGroup.value) return;

    isCorrect.value = false;
    wrongInputCount.value++;
    showAnswer.value = true;

    // 使用基於索引的調度演算法記錄失敗
    schedule.recordFailure(currentIndex.value);
    // 觸發進度條更新
    forceUpdate.value++;

    // 清空輸入，等待用戶重新輸入
    inputValue.value = '';
    nextTick(() => {
        inputElement.value?.focus();
    });
};

const nextGroup = () => {
    // 使用基於索引的調度系統獲取下一個需要練習的字根組
    const nextGroupIndex = schedule.getNextIndex();

    if (nextGroupIndex !== null) {
        currentIndex.value = nextGroupIndex;
    } else {
        // 調度系統返回null，說明所有字根組都已完成，停止練習
        return; // 不再選擇字根組
    }

    // 重置狀態
    isCorrect.value = true;
    wrongInputCount.value = 0;
    inputValue.value = '';

    // 檢查是否為第一次見到此字根組，如果是則直接顯示答案
    if (schedule.isFirstTime(currentIndex.value)) {
        showAnswer.value = true;
    } else {
        showAnswer.value = false;
    }

    nextTick(() => {
        inputElement.value?.focus();
    });
};

const restartTraining = () => {
    resetTraining();
};

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showAnswer.value) {
        // 顯示答案
        handleWrongAnswer();
        e.preventDefault();
    }
};

/** 獲取相關字符 - 響應式顯示 */
const getRelatedChars = (zigen: string): string => {
    if (!chaifenMap.value) return '';
    const related = find8relativeChars(zigen, chaifenMap.value)
    const isSmallScreen = windowWidth.value < 768;
    const isMediumScreen = windowWidth.value < 1024;

    let maxChars = 4; // 預設4個字符
    if (isSmallScreen) {
        maxChars = 2; // 小屏幕只顯示2個
    } else if (isMediumScreen) {
        maxChars = 3; // 中屏幕顯示3個
    }

    return related.slice(0, maxChars).split('').join('')
}

onMounted(async () => {
    // 首先載入保存的排序狀態
    loadSortOrder()

    // 获取方案对应的拆分文件URL
    const BaseSchemes = ['joy', 'light', 'star', 'ming', 'wafel', 'ling'];
    const isBase = BaseSchemes.includes(p.name);
    const chaifenUrl = p.chaifenUrl ? p.chaifenUrl : isBase ? '/chaifen.json' : `/chaifen-${p.name}.json`;

    console.log(`字根训练方案: ${p.name}, 使用拆分文件: ${chaifenUrl}`);

    chaifenMap.value = await fetchChaifenOptimized(chaifenUrl)
    const zigenMap = await fetchZigen(p.zigenUrl)

    let zigenValues = [...zigenMap.values()]

    if (range) {
        zigenValues = zigenValues.slice(range[0], range[1])
    }

    // 按編碼分組字根
    const groups = groupZigensByCode(zigenValues);
    originalCardGroups.value = groups;

    // 根據保存的狀態應用排序
    applySortOrder()

    console.log(`字根練習：共 ${groups.length} 個編碼組，包含 ${zigenValues.length} 個字根，當前${isFrequencyOrder.value ? '字頻序' : '字典序'}`);

    // 設置事件監聽
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }
    nextTick(() => {
        inputElement.value?.focus();
    });
    document.addEventListener('keydown', handleKeydown);

    // 初始化基於索引的調度系統
    schedule.initializeWithGroupCount(groups.length);

    // 初始化第一個字根組
    nextGroup();
})

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
    }
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <!-- 完成狀態顯示 -->
    <div v-if="isCompleted" class="text-center py-16">
        <div class="mb-8">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
                你已經完成了 {{ totalGroups }} 個字根組的練習。
                感謝你的努力和堅持，為中華文明和漢字的傳承又增添了一份力量！
            </p>
        </div>

        <div class="space-y-4">
            <button @click="restartTraining"
                class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium">
                想要再訓練一輪嗎？
            </button>
            <div class="text-sm text-gray-500 dark:text-gray-400">
                繼續練習以鞏固記憶
            </div>
        </div>
    </div>

    <!-- 練習進行中 -->
    <div :class="[
        'mx-auto p-6 space-y-6',
        windowWidth < 768 ? 'max-w-sm p-3 space-y-3' : 'max-w-2xl'  // 手機端縮小容器和間距
    ]" v-else-if="currentGroup && cardGroups && chaifenMap">
        <!-- 進度顯示 -->
        <div class="relative">
            <!-- 進度顯示 -->
            <div :class="[
                'text-center text-gray-600 dark:text-gray-400',
                windowWidth < 768 ? 'text-xs' : 'text-sm'  // 手機端縮小進度文字
            ]">
                <div :class="[
                    'flex justify-between items-center',
                    windowWidth < 768 ? 'mb-1' : 'mb-2'  // 手機端減少底部間距
                ]">
                    <span>已練習: {{ practiceProgress.current }} / {{ practiceProgress.total }} ({{
                        practiceProgress.percentage }}%) | 已掌握: {{ practiceProgress.mastered }}</span>
                    <span v-if="wrongInputCount > 0" class="text-red-600 dark:text-red-400">錯誤次數: {{ wrongInputCount
                    }}</span>
                </div>
                <div :class="[
                    'w-full bg-gray-200 dark:bg-gray-700 rounded-full',
                    windowWidth < 768 ? 'h-1.5' : 'h-2'  // 手機端縮小進度條高度
                ]">
                    <div :class="[
                        'bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300',
                        windowWidth < 768 ? 'h-1.5' : 'h-2'  // 手機端縮小進度條高度
                    ]" :style="`width: ${progress}%`">
                    </div>
                </div>
            </div>
        </div>

        <!-- 練習區域 -->
        <div :class="[
            'w-full shadow-lg rounded-2xl transition-all duration-300 transform relative overflow-hidden',
            {
                'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800': !isCorrect,
                'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800': isCorrect
            },
            'border-2 hover:shadow-xl'
        ]">
            <!-- Cascade 字根组展示条带 - 在卡片顶部 -->
            <div ref="cascadeContainer" class="relative overflow-hidden py-3"
                :style="{ height: windowWidth < 768 ? '60px' : '70px' }">
                <!-- 滚动内容 -->
                <div class="relative h-full flex items-center overflow-visible">
                    <!-- 响应式单元格，宽屏7个，窄屏5个，当前项永远在中间 -->
                    <div class="flex items-center h-full transition-transform duration-500 ease-out" :style="{
                        transform: `translateX(${(centerPosition - currentPositionInVisible) * cellWidth}px)`
                    }">
                        <div v-for="item in visibleGroups" :key="item.index"
                            class="cascade-item flex-shrink-0 transition-all duration-300" :style="{
                                width: cellWidth + 'px',
                                opacity: isInVisibleRange(item.offset) ? 1 : 0,
                                pointerEvents: isInVisibleRange(item.offset) ? 'auto' : 'none'
                            }">
                            <div class="h-10 md:h-12 px-2 flex items-center justify-center gap-1 md:gap-2 transition-all duration-300"
                                :class="{
                                    'scale-110': item.isCurrent,
                                    'scale-90': !item.isCurrent
                                }">
                                <div v-for="(zigen, idx) in item.group.zigens" :key="idx" class="text-center">
                                    <div class="zigen-font font-bold" :class="{
                                        'text-xl md:text-2xl text-blue-600 dark:text-blue-400': item.isCurrent,
                                        'text-base md:text-xl text-gray-600 dark:text-gray-400': !item.isCurrent
                                    }">
                                        {{ zigen.font }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 分隔线 -->
            <div class="border-b border-gray-200 dark:border-gray-700"></div>

            <!-- 卡片內控制按鈕 -->
            <div :class="[
                'absolute flex gap-2 z-10',
                windowWidth < 768 ? 'bottom-2 right-2' : 'bottom-4 right-4'  // 手機端移到右下角
            ]">
                <!-- 排序切換按鈕 -->
                <button @click="toggleSortOrder" :class="[
                    'rounded-full font-medium transition-all duration-200 flex items-center justify-center shadow-md',
                    windowWidth < 768 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs',  // 手機端縮小按鈕
                    isFrequencyOrder
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                ]" :title="isFrequencyOrder ? '字頻序 (點擊切換到字典序)' : '字典序 (點擊切換到字頻序)'">
                    <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                </button>

                <!-- 重置按鈕 -->
                <button @click="handleReset" :class="[
                    'rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 flex items-center justify-center shadow-md',
                    windowWidth < 768 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs'  // 手機端縮小按鈕
                ]" title="重新開始訓練">
                    <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <!-- 字根組顯示 -->
            <div :class="[
                'text-center flex items-center justify-center',
                windowWidth < 768 ? 'h-32' : 'h-48'  // 固定高度：手機端128px，桌面端192px
            ]">
                <!-- 字根組 - 響應式大小設計 -->
                <div :class="[
                    'flex justify-center items-center flex-wrap',
                    zigenGapClass
                ]">
                    <div v-for="(zigen, index) in currentGroup.zigens" :key="index"
                        class="flex flex-col items-center group">
                        <div :class="[
                            'zigen-font transform transition-all duration-300 group-hover:scale-110',
                            windowWidth < 768 ? 'mb-1' : 'mb-4',  // 手機端減少字根下方間距
                            zigenSizeClass,
                            {
                                'text-red-500 dark:text-red-400': !isCorrect,
                                'text-blue-700 dark:text-blue-300': isCorrect
                            }
                        ]">
                            {{ zigen.font }}
                        </div>
                        <!-- 顯示相關漢字 - 響應式大小和間距，使用 zigen-font -->
                        <div :class="[
                            'text-gray-600 dark:text-gray-300 font-medium tracking-tight zigen-font',
                            windowWidth < 768 ? 'mt-0.5' : 'mt-2',  // 手機端減少頂部間距
                            {
                                'text-xs': windowWidth < 768,  // 手機端更小的相關字
                                'text-base': windowWidth >= 768 && windowWidth < 1024,
                                'text-lg': windowWidth >= 1024
                            }
                        ]" v-if="getRelatedChars(zigen.font)">
                            {{ getRelatedChars(zigen.font) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 輸入區域 -->
            <div :class="[
                'flex justify-center',
                windowWidth < 768 ? 'pt-1 pb-1' : 'pt-2 pb-2'  // 大幅减少上下间距
            ]">
                <input ref="inputElement" v-model="inputValue" type="text" placeholder="編碼" :class="[
                    'text-center border-2 rounded-xl font-mono',
                    'transition-all duration-300 focus:outline-none focus:ring-4',
                    // 手機端縮小輸入框
                    windowWidth < 768 ? 'px-3 py-2 text-lg w-32' : 'px-6 py-4 text-2xl w-48',
                    {
                        'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-900/50 dark:bg-red-900/20 dark:text-white': !isCorrect,
                        'border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white dark:border-blue-700 dark:focus:border-blue-500 dark:focus:ring-blue-900/50 dark:bg-gray-800 dark:text-white': isCorrect
                    }
                ]" />
            </div>

            <!-- 答案顯示區域 -->
            <div :class="[
                'text-center transition-all duration-300',
                windowWidth < 768 ? 'pb-2' : 'pb-4',  // 压缩底部间距
                { 'opacity-0 transform translate-y-2': !showAnswer, 'opacity-100': showAnswer }
            ]">
                <div :class="[
                    'inline-block bg-gray-100 dark:bg-gray-800 rounded-lg',
                    windowWidth < 768 ? 'px-2 py-1' : 'px-4 py-2'  // 手機端縮小答案框
                ]">
                    <span :class="[
                        'text-gray-800 dark:text-gray-200',
                        windowWidth < 768 ? 'text-sm' : ''  // 手機端縮小文字
                    ]">答案是 </span>
                    <span :class="[
                        'font-mono font-bold text-blue-600 dark:text-blue-400',
                        windowWidth < 768 ? 'text-lg' : 'text-xl'  // 手機端縮小答案文字
                    ]">{{ currentGroup.code }}</span>
                </div>
            </div>
        </div>

        <!-- 聲碼韵碼解析區域 - 獨立顯示 -->
        <div v-if="hasPinyinData" :class="[
            'mx-auto max-w-md mt-4',
            windowWidth < 768 ? 'max-w-xs mt-2' : 'max-w-md mt-4'  // 手機端縮小最大寬度和間距
        ]">
            <div :class="[
                'border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 transition-all duration-300',
                windowWidth < 768 ? 'p-2' : 'p-3'  // 手機端減少內邊距
            ]">
                <!-- 標題 -->
                <div :class="[
                    'text-center font-medium text-blue-800 dark:text-blue-300 mb-2',
                    windowWidth < 768 ? 'text-xs mb-1' : 'text-sm mb-2'  // 手機端縮小標題
                ]">
                    拼音到音托之關係解析
                </div>
                <!-- 拼音列表 -->
                <div :class="[
                    'text-center space-y-1',
                    windowWidth < 768 ? 'text-xs space-y-0.5' : 'text-sm space-y-1'
                ]">
                    <div v-for="(item, index) in pinyinList" :key="`${item.font}-${item.pinyin}-${index}`" :class="[
                        'text-blue-700 dark:text-blue-300'
                    ]">
                        <span class="zigen-font">{{ item.font }}</span>
                        <span class="font-mono"> ({{ item.pinyin }})</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 操作提示 -->
        <div :class="[
            'text-center text-gray-500 dark:text-gray-400 space-y-1',
            windowWidth < 768 ? 'text-xs' : 'text-sm'  // 手機端縮小提示文字
        ]">
            <div v-if="!showAnswer" :class="[
                'flex items-center justify-center',
                windowWidth < 768 ? 'gap-2 flex-col' : 'gap-4'  // 手機端垂直排列提示
            ]">
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'  // 手機端縮小按鍵提示
                    ]">輸入</kbd>
                    自動檢查
                </span>
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'  // 手機端縮小按鍵提示
                    ]">Esc</kbd>
                    顯示答案
                </span>
            </div>
            <div v-else class="text-blue-600 dark:text-blue-400 font-medium">
                繼續輸入正確編碼
            </div>
        </div>
    </div>

    <!-- 加載中提示 -->
    <h2 class="text-gray-700 dark:text-gray-300 text-center" v-else>
        下載資料中……
    </h2>

    <!-- 重置確認對話框 -->
    <div v-if="showResetConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="cancelReset">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" @click.stop>
            <div class="flex items-center gap-3 mb-4">
                <div
                    class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">確認重置</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">您確定要重新開始訓練嗎？</p>
                </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                這將清除當前的學習進度和統計數據，無法恢復。
            </p>
            <div class="flex gap-3 justify-end">
                <button @click="cancelReset"
                    class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    取消
                </button>
                <button @click="confirmReset"
                    class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                    確認重置
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import './cascadeStyles.css';

/* 確保字根顯示使用正確字體 */
.zigen-font {
    font-family: 'Noto Serif SC', 'Noto Serif TC', 'Yuji Hentaigana Akari', 'Noto Serif Tangut', "Noto Serif Khitan Small Script",
        "Yuniversus", 'TH-Tshyn-P2', 'TH-Tshyn-P0', 'TH-Tshyn-P1', 'TH-Tshyn-P16',
        Georgia, "Nimbus Roman No9 L", "Songti SC Regular", "Noto Serif CJK SC", "Source Han Serif SC", "Source Han Serif CN", STSong, "AR PL New Sung", "AR PL SungtiL GB", NSimSun, SimSun, "TW\-Sung", "WenQuanYi Bitmap Song", "AR PL UMing CN", "AR PL UMing HK", "AR PL UMing TW", "AR PL UMing TW MBE", PMingLiU, MingLiU, serif;
    font-weight: 400;
    line-height: 1;
}

/* 現代化動畫效果 */
.transition-all {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 懸停效果 */
.group:hover .zigen-font {
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* 輸入框特殊效果 */
input::placeholder {
    color: #9ca3af;
    opacity: 0.8;
}

/* 鍵盤提示樣式 */
kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-weight: 600;
}

/* 響應式字體大小調整 */
@media (max-width: 640px) {
    .text-7xl {
        font-size: 4rem;
        line-height: 1;
    }

    /* 手機端額外的緊湊樣式 */
    .space-y-3>*+* {
        margin-top: 0.75rem;
    }
}

@media (min-width: 641px) and (max-width: 1024px) {
    .text-8xl {
        font-size: 6rem;
        line-height: 1;
    }
}

@media (min-width: 1025px) {
    .text-9xl {
        font-size: 8rem;
        line-height: 1;
    }
}

/* 手機端視窗高度優化 */
@media (max-width: 767px) and (max-height: 600px) {

    /* 在小屏幕且低高度的設備上進一步壓縮 */
    .zigen-font {
        line-height: 0.9;
    }
}

/* 卡片陰影動畫 */
.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.hover\:shadow-xl:hover {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>