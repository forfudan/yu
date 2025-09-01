<!--
    TrainCardGroup.vue - 字根分組練習組件
    
    實現分組字根訓練與改進的間隔重複算法。
    將相同編碼的字根歸為一組同時顯示。
-->

<script setup lang="ts">
import { Ref, ref, shallowRef, onMounted, nextTick, computed, onBeforeUnmount, watch } from "vue";
import { makeCodesFromDivision, cache, find8relativeChars, ChaifenMap } from "./share";
import { AdvancedSchedule } from "./advancedSchedule";

interface ZigenGroup {
    /** 編碼 */
    code: string;
    /** 字根列表 */
    zigens: Array<{ font: string; ma: string }>;
}

const p = defineProps<{
    /** 資料庫名稱 */
    name: string,
    /** 字根分組 */
    cardGroups: ZigenGroup[],
    /** 字根映射表 */
    chaifenMap: ChaifenMap,
    /** 練習模式 */
    mode: 'c' | 'g' | 'b',
    /** 是否顯示補充，僅對單字練習有效 */
    supplement?: boolean,
    /** 是否顯示拆分名詞，僅對單字練習有效 */
    ming?: boolean,
    /** 是否為字頻序 */
    isFrequencyOrder?: boolean,
    /** 排序切換回調 */
    onToggleSort?: () => void,
    /** 重置訓練回調 */
    onReset?: () => void
}>()

const { name, cardGroups, mode, supplement, ming, isFrequencyOrder, onToggleSort, onReset } = p;

console.log(`載入分組練習會話: ${name}`);

// 使用改進的調度演算法
const schedule = new AdvancedSchedule(name);

const currentIndex = ref(0);
const inputElement = ref<HTMLInputElement>();
const inputValue = ref<string>('');
const showAnswer = ref(false);
const isCorrect = ref(true);
const wrongInputCount = ref(0);
const showResetConfirm = ref(false);

// 處理重置確認
const handleReset = () => {
    showResetConfirm.value = true;
}

const confirmReset = () => {
    if (onReset) {
        onReset();
        showResetConfirm.value = false;
        // 強制刷新頁面以確保完全重置
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}

const cancelReset = () => {
    showResetConfirm.value = false;
}

// 響應式字根大小計算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const handleResize = () => {
    windowWidth.value = window.innerWidth;
};

onMounted(() => {
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }
    nextTick(() => {
        inputElement.value?.focus();
    });
    document.addEventListener('keydown', handleKeydown);

    // 初始化第一個字根組
    nextGroup();
});

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
    }
    document.removeEventListener('keydown', handleKeydown);
});

// 計算字根大小類名
const zigenSizeClass = computed(() => {
    if (!currentGroup.value) return 'text-8xl';

    const zigenCount = currentGroup.value.zigens.length;
    const isSmallScreen = windowWidth.value < 768; // sm breakpoint
    const isMediumScreen = windowWidth.value < 1024; // lg breakpoint

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
        return zigenCount > 4 ? 'gap-3' : 'gap-4';
    } else {
        return zigenCount > 4 ? 'gap-6' : 'gap-8 lg:gap-12';
    }
});

const currentGroup = computed(() => cardGroups[currentIndex.value] || null);
const totalGroups = computed(() => cardGroups.length);
const progress = computed(() =>
    totalGroups.value > 0 ? (currentIndex.value / totalGroups.value * 100).toFixed(1) : '0'
);

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

    // 使用改進的調度演算法記錄成功
    schedule.recordSuccess(currentGroup.value.code);

    // 立即進入下一組，無延遲
    nextGroup();
};

const handleWrongAnswer = () => {
    if (!currentGroup.value) return;

    isCorrect.value = false;
    wrongInputCount.value++;
    showAnswer.value = true;

    // 記錄失敗
    schedule.recordFailure(currentGroup.value.code);

    // 清空輸入，等待用戶重新輸入
    inputValue.value = '';
    nextTick(() => {
        inputElement.value?.focus();
    });
};

const nextGroup = () => {
    // 獲取下一個需要練習的字根組
    const nextGroupData = schedule.getNext(cardGroups);

    if (nextGroupData) {
        currentIndex.value = cardGroups.findIndex(g => g.code === nextGroupData.code);
    } else {
        // 如果沒有更多需要練習的組，隨機選擇一個還需要加強的
        const needPractice = cardGroups.filter(g => {
            const stats = schedule.getItemStats(g.code);
            return !stats || stats.consecutiveCorrect < 3 || stats.errorCount > 0;
        });

        if (needPractice.length > 0) {
            const randomGroup = needPractice[Math.floor(Math.random() * needPractice.length)];
            currentIndex.value = cardGroups.findIndex(g => g.code === randomGroup.code);
        } else {
            // 全部掌握，隨機選擇
            currentIndex.value = Math.floor(Math.random() * cardGroups.length);
        }
    }

    // 重置狀態
    isCorrect.value = true;
    showAnswer.value = false;
    wrongInputCount.value = 0;
    inputValue.value = '';

    nextTick(() => {
        inputElement.value?.focus();
    });
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
    const related = find8relativeChars(zigen, p.chaifenMap)
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

/** 檢查字根是否正確 */
const checkZigen = (groupIndex: number, zigenIndex: number, userInput: string) => {
    const targetZigen = currentGroup.value?.zigens[zigenIndex]
    if (!targetZigen) return

    const isCorrect = userInput === targetZigen.ma

    if (isCorrect) {
        schedule.recordSuccess(targetZigen.ma)
        if (zigenIndex < currentGroup.value.zigens.length - 1) {
            // 移動到下一個字根
        } else {
            nextGroup()
        }
    } else {
        schedule.recordFailure(targetZigen.ma)
        wrongInputCount.value++
    }

    inputValue.value = ''
}

onMounted(() => {
    nextTick(() => {
        inputElement.value?.focus();
    });
    document.addEventListener('keydown', handleKeydown);

    // 初始化第一個字根組
    nextGroup();
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <div class="max-w-2xl mx-auto p-6 space-y-6" v-if="currentGroup">
        <!-- 進度顯示 -->
        <div class="relative">
            <!-- 進度顯示 -->
            <div class="text-center text-sm text-gray-600 dark:text-gray-400">
                <div class="flex justify-between items-center mb-2">
                    <span>練習進度: {{ currentIndex + 1 }} / {{ totalGroups }}</span>
                    <span v-if="wrongInputCount > 0" class="text-red-600 dark:text-red-400">錯誤次數: {{ wrongInputCount
                    }}</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                        :style="`width: ${progress}%`">
                    </div>
                </div>
            </div>
        </div>

        <!-- 練習區域 -->
        <div :class="[
            'w-full shadow-lg rounded-2xl transition-all duration-300 transform relative',
            {
                'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800': !isCorrect,
                'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800': isCorrect
            },
            'border-2 hover:shadow-xl'
        ]">
            <!-- 卡片內控制按鈕 -->
            <div class="absolute top-4 right-4 flex gap-2 z-10">
                <!-- 排序切換按鈕 -->
                <button v-if="onToggleSort"
                    @click="() => { console.log('排序按鈕被點擊，當前狀態:', isFrequencyOrder); onToggleSort(); }" :class="[
                        'w-8 h-8 rounded-full font-medium transition-all duration-200 flex items-center justify-center text-xs shadow-md',
                        isFrequencyOrder
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                    ]" :title="isFrequencyOrder ? '字頻序 (點擊切換到字典序)' : '字典序 (點擊切換到字頻序)'">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                </button>

                <!-- 重置按鈕 -->
                <button v-if="onReset" @click="handleReset"
                    class="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 flex items-center justify-center text-xs shadow-md"
                    title="重新開始訓練">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <!-- 字根組顯示 -->
            <div class="text-center py-12">
                <!-- 字根組 - 響應式大小設計 -->
                <div :class="['flex justify-center items-center flex-wrap mb-12', zigenGapClass]">
                    <div v-for="(zigen, index) in currentGroup.zigens" :key="index"
                        class="flex flex-col items-center group">
                        <div :class="[
                            'mb-4 zigen-font transform transition-all duration-300 group-hover:scale-110',
                            zigenSizeClass,
                            {
                                'text-red-500 dark:text-red-400': !isCorrect,
                                'text-blue-700 dark:text-blue-300': isCorrect
                            }
                        ]">
                            {{ zigen.font }}
                        </div>
                        <div v-if="showAnswer"
                            class="text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {{ zigen.ma }}
                        </div>
                        <!-- 顯示相關漢字 - 響應式大小和間距 -->
                        <div :class="[
                            'text-gray-600 dark:text-gray-300 mt-2 font-medium tracking-tight',
                            {
                                'text-sm': windowWidth < 768,
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
            <div class="flex justify-center pb-8">
                <input ref="inputElement" v-model="inputValue" type="text" placeholder="編碼" :class="[
                    'px-6 py-4 text-2xl text-center border-2 rounded-xl w-48 font-mono',
                    'transition-all duration-300 focus:outline-none focus:ring-4',
                    {
                        'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-900/50 dark:bg-red-900/20 dark:text-white': !isCorrect,
                        'border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white dark:border-blue-700 dark:focus:border-blue-500 dark:focus:ring-blue-900/50 dark:bg-gray-800 dark:text-white': isCorrect
                    }
                ]" />
            </div>

            <!-- 答案顯示區域 -->
            <div :class="[
                'text-center pb-8 transition-all duration-300',
                { 'opacity-0 transform translate-y-2': !showAnswer, 'opacity-100': showAnswer }
            ]">
                <div class="inline-block bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                    <span class="text-gray-800 dark:text-gray-200">答案是</span> <span
                        class="font-mono text-xl font-bold text-blue-600 dark:text-blue-400">{{ currentGroup.code
                        }}</span>
                </div>
            </div>
        </div>

        <!-- 操作提示 -->
        <div class="text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <div v-if="!showAnswer" class="flex items-center justify-center gap-4">
                <span class="flex items-center gap-1">
                    <kbd class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded">輸入</kbd>
                    自動檢查
                </span>
                <span class="flex items-center gap-1">
                    <kbd class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded">Esc</kbd>
                    顯示答案
                </span>
            </div>
            <div v-else class="text-blue-600 dark:text-blue-400 font-medium">
                繼續輸入正確編碼
            </div>
        </div>
    </div>

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
/* 確保字根顯示使用正確字體 */
.zigen-font {
    font-family: 'Noto Serif SC', 'Noto Serif TC', 'Yuji Hentaigana Akari', 'Noto Serif Tangut', "Noto Serif Khitan Small Script",
        "yuhao-font", 'TH-Tshyn-P2', 'TH-Tshyn-P0', 'TH-Tshyn-P1', 'TH-Tshyn-P16',
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

/* 卡片陰影動畫 */
.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.hover\:shadow-xl:hover {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>
