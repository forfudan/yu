<!--
    ZigenTrain.vue - 字根練習組件
    
    主要修改歷史:
    - 2025-09-01: 優化字根練習邏輯，支援同編碼字根分組顯示，改進記憶演算法
    - 之前: 單個字根練習模式
-->

<script setup lang="ts">
/** 字根練習 - 優化版 */
import { shallowRef, onMounted } from "vue";
import { Card, cache, fetchChaifen, fetchZigen, makeCodesFromDivision } from "./share";
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
    /** 練習的範圍，從第幾條到第幾條，不填則是全部 */
    range?: [start: number, end: number]
    /** 字根練習的模式 */
    mode: 'A' | 'a' | 'both'
    /** 是否顯示補充，保持向後兼容 */
    supplement?: boolean
    /** 是否顯示拆分名詞，保持向後兼容 */
    ming?: boolean
}>()

let cardsName = p.name + '_zigen_grouped'
const range = p.range
if (range) {
    cardsName += `_${range[0]}_${range[1]}`
}

const cardGroups = shallowRef<ZigenGroup[]>()
const chaifenMap = shallowRef()

const getCode = (ma: string) => {
    switch (p.mode) {
        case 'A':
            return ma[0]
        case 'a':
            return ma[1]
        case 'both':
            return ma
        default:
            break;
    }
}

// 將字根按相同編碼分組，參考 ZigenMap.vue 的邏輯
function groupZigensByCode(zigenValues: Array<{ font: string; ma: string }>) {
    const groups: ZigenGroup[] = [];

    for (let i = 0; i < zigenValues.length; i++) {
        const current = zigenValues[i];
        const currentCode = getCode(current.ma)?.toLowerCase();

        if (!currentCode) continue;

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

    return groups;
}

onMounted(async () => {
    if (cardGroups.value && chaifenMap.value) return;

    chaifenMap.value = await fetchChaifen('/chaifen.csv')
    const zigenMap = await fetchZigen(p.zigenUrl)

    let zigenValues = [...zigenMap.values()]

    if (range) {
        zigenValues = zigenValues.slice(range[0], range[1])
    }

    // 按編碼分組字根
    cardGroups.value = groupZigensByCode(zigenValues);

    console.log(`字根練習：共 ${cardGroups.value.length} 個編碼組，包含 ${zigenValues.length} 個字根`);
})
</script>

<template>
    <TrainCardGroup v-if="cardGroups && chaifenMap" :name="cardsName" :card-groups="cardGroups"
        :chaifen-map="chaifenMap" mode="g" :supplement="p.supplement ?? false" :ming="p.ming ?? false" />
    <h2 class="text-gray-700 text-center" v-else>
        下載資料中……
    </h2>
</template>