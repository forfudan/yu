<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { onMounted } from "vue";
import Chaifen from "./Chaifen.vue";
import { fetchCsvAsMap } from "../search/share";

const p = defineProps<{
    chars: string,
    size?: number,
    loc?: string,
}>()

interface ChaifenPlot {
    char: string,
    parts: string,
    colors: string,
}

type ChaifenPlotMap = Map<string, ChaifenPlot>
const chaifenPlotMap = shallowRef<ChaifenPlotMap>()

async function fetchChaifenPlot(url: string) {
    return await fetchCsvAsMap(url) as unknown as ChaifenPlotMap
}

// 檢查字符數據並報警
function checkCharacterData() {
    if (!chaifenPlotMap.value) return;

    const chars = [...p.chars];
    chars.forEach(char => {
        // 檢查字符是否在數據庫中存在
        if (!chaifenPlotMap.value!.has(char)) {
            console.warn(`[MultiChaifen] 字符 "${char}" 在數據庫中不存在`);
            return;
        }

        // 檢查字符是否有parts信息
        const charData = chaifenPlotMap.value!.get(char);
        if (charData && (!charData.parts || charData.parts.trim() === '')) {
            console.warn(`[MultiChaifen] 字符 "${char}" 沒有檢索到 parts 信息`);
        }
    });
}

onMounted(async () => {
    if (chaifenPlotMap.value) return;
    chaifenPlotMap.value = await fetchChaifenPlot("/zi-plot.csv")
    checkCharacterData();
})

// 使用computed來動態計算樣式類
const desc_class = computed(() => {
    const loc = p.loc || 'center'; // 默認居中
    return loc === 'left'
        ? "flex justify-left flex-wrap my-2"
        : "flex justify-center flex-wrap my-2";
});

// 獲取默認大小
const defaultSize = computed(() => p.size || 48);

</script>

<template>
    <div :class="desc_class">
        <Chaifen v-if="chaifenPlotMap" v-for="item in [...p.chars].filter(zi => chaifenPlotMap.has(zi))" :char='item'
            :parts='chaifenPlotMap?.get(item)?.parts' :colors='chaifenPlotMap?.get(item)?.colors' :size="defaultSize" />
    </div>
    <template v-if="(chaifenPlotMap)" v-for="item in [...p.chars]">
        <template v-if="chaifenPlotMap?.get(item)?.parts === ''"> {{ item }} </template>
    </template>
    <!-- <p v-else> "宇浩拆分" </p> -->
</template>

<script lang="ts">

</script>