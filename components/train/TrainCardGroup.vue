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
    ming?: boolean
}>()

const { name, cardGroups, mode, supplement, ming } = p;

console.log(`載入分組練習會話: ${name}`);

// 使用改進的調度演算法
const schedule = new AdvancedSchedule(name);

const currentIndex = ref(0);
const inputElement = ref<HTMLInputElement>();
const inputValue = ref<string>('');
const showAnswer = ref(false);
const isCorrect = ref(true);
const wrongInputCount = ref(0);

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

/** 獲取相關字符 */
const getRelatedChars = (zigen: string): string => {
    const related = find8relativeChars(zigen, p.chaifenMap)
    return related.slice(0, 4).split('').join(' ')
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
        <div class="text-center text-sm text-gray-600">
            <div class="flex justify-between items-center mb-2">
                <span>練習進度: {{ currentIndex + 1 }} / {{ totalGroups }}</span>
                <span v-if="wrongInputCount > 0" class="text-red-600">錯誤次數: {{ wrongInputCount }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" :style="`width: ${progress}%`">
                </div>
            </div>
        </div>

        <!-- 練習區域 -->
        <div :class="[
            'w-full shadow-lg rounded-2xl transition-all duration-300 transform',
            { 'bg-red-50 border-red-200': !isCorrect, 'bg-blue-50 border-blue-200': isCorrect },
            'border-2 hover:shadow-xl'
        ]">
            <!-- 字根組顯示 -->
            <div class="text-center py-12">
                <!-- 字根組 - 響應式大小設計 -->
                <div class="flex justify-center items-center flex-wrap gap-8 lg:gap-12 mb-12">
                    <div v-for="(zigen, index) in currentGroup.zigens" :key="index"
                        class="flex flex-col items-center group">
                        <div :class="[
                            'mb-4 zigen-font transform transition-all duration-300 group-hover:scale-110',
                            'text-7xl sm:text-8xl lg:text-9xl',
                            { 'text-red-500': !isCorrect, 'text-blue-700': isCorrect }
                        ]">
                            {{ zigen.font }}
                        </div>
                        <div v-if="showAnswer" class="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            {{ zigen.ma }}
                        </div>
                        <!-- 顯示相關漢字 - 增大字體 -->
                        <div class="text-lg sm:text-xl text-gray-600 mt-3 font-medium"
                            v-if="getRelatedChars(zigen.font)">
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
                        'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50': !isCorrect,
                        'border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white': isCorrect
                    }
                ]" />
            </div>

            <!-- 答案顯示區域 -->
            <div :class="[
                'text-center pb-8 transition-all duration-300',
                { 'opacity-0 transform translate-y-2': !showAnswer, 'opacity-100': showAnswer }
            ]">
                <div class="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                    答案是 <span class="font-mono text-xl font-bold text-blue-600">{{ currentGroup.code }}</span>
                </div>
            </div>
        </div>

        <!-- 操作提示 -->
        <div class="text-center text-sm text-gray-500 space-y-1">
            <div v-if="!showAnswer" class="flex items-center justify-center gap-4">
                <span class="flex items-center gap-1">
                    <kbd class="px-2 py-1 text-xs bg-gray-100 rounded">輸入</kbd>
                    自動檢查
                </span>
                <span class="flex items-center gap-1">
                    <kbd class="px-2 py-1 text-xs bg-gray-100 rounded">Esc</kbd>
                    顯示答案
                </span>
            </div>
            <div v-else class="text-blue-600 font-medium">
                繼續輸入正確編碼
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
