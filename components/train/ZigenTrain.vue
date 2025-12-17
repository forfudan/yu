<!--
    ZigenTrain.vue - 字根練習組件
    
    主要修改歷史:
    - 2025-09-01: 優化字根練習邏輯，支援同編碼字根分組顯示，改進記憶演算法
    - 之前: 單個字根練習模式
-->

<script setup lang="ts">
/** 字根練習 - 優化版 */
import { shallowRef, onMounted, ref, computed, nextTick } from "vue";
import { Card, cache, fetchChaifenOptimized, fetchZigen, makeCodesFromDivision } from "./share";
import { AdvancedSchedule } from "./advancedSchedule";
import TrainCardGroup from "./TrainCardGroup.vue";

interface ZigenGroup {
    /** 編碼 */
    code: string;
    /** 字根列表 */
    zigens: Array<{ font: string; ma: string }>;
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
}>()

let cardsName = p.name + '_zigen_grouped'
const range = p.range
if (range) {
    cardsName += `_${range[0]}_${range[1]}`
}

// 字頻序相關 - 添加狀態持久化
const storageKey = `zigen_sort_order_${p.name}`
const isFrequencyOrder = ref(false)
const originalCardGroups = shallowRef<ZigenGroup[]>()
const cardGroups = shallowRef<ZigenGroup[]>()
const chaifenMap = shallowRef()

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
const lowFreqZigens = ['鳥', '烏', '魚', '馬', '風', '來', '車', '長', '門', '鬥', '齒', '飛', '見', '貝', '鹵', '僉', '韋', '咼', '黽']

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
        const schedule = new AdvancedSchedule(cardsName)
        schedule.reset()

        // 重置排序狀態為字典序
        isFrequencyOrder.value = false
        saveSortOrder()

        // 重新應用排序（這會觸發 TrainCardGroup 的重新初始化）
        applySortOrder()

        console.log('訓練已重置，排序狀態重置為字典序')
    }
}

onMounted(async () => {
    // 首先載入保存的排序狀態
    loadSortOrder()

    // 获取方案对应的拆分文件URL
    const BaseSchemes = ['joy', 'light', 'star', 'ming', 'wafel'];
    const isBase = BaseSchemes.includes(p.name);
    const chaifenUrl = isBase ? '/chaifen.json' : `/chaifen-${p.name}.json`;

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
})
</script>

<template>
    <div v-if="cardGroups && chaifenMap">
        <TrainCardGroup :name="cardsName" :card-groups="cardGroups" :chaifen-map="chaifenMap" mode="g"
            :rule="p.rule || p.name" :is-frequency-order="isFrequencyOrder" :on-toggle-sort="toggleSortOrder"
            :on-reset="resetTraining" />
    </div>
    <h2 class="text-gray-700 dark:text-gray-300 text-center" v-else>
        下載資料中……
    </h2>
</template>