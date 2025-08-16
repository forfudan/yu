<script setup lang="ts">
import { shallowRef } from "vue";
import { onMounted } from "vue";
import Chaifen from "./Chaifen.vue";
import { fetchCsvAsMap } from "../search/share";

const p = defineProps<{
    chars: string,
    size: number,
    loc: string,
}>()

interface ChaifenPlot {
    char: string,
    parts: string,
    colors: string,
}

type ChaifenPlotMap = Map<string, ChaifenPlot>
const chaifenPlotMap = shallowRef<ChaifenPlotMap>()
// const searchYuChaifenPlots = shallowRef<string[]>()

async function fetchChaifenPlot(url: string) {
    return await fetchCsvAsMap(url) as unknown as ChaifenPlotMap
}

onMounted(async () => {
    if (chaifenPlotMap.value) return;
    chaifenPlotMap.value = await fetchChaifenPlot("/zi-plot.csv")
    // searchYuChaifenPlots.value = [...p.chars].filter(zi => chaifenPlotMap.has(zi))
})

var desc_class: string;

if (p.loc === 'left') {
    var desc_class = "flex justify-left flex-wrap my-2";
} else {
    var desc_class = "flex justify-center flex-wrap my-2";
}

</script>

<template>
    <div v-bind='{ class: desc_class }'>
        <Chaifen v-if="chaifenPlotMap" v-for="item in [...p.chars].filter(zi => chaifenPlotMap.has(zi))" :char='item'
            :parts='chaifenPlotMap?.get(item).parts' :colors='chaifenPlotMap?.get(item).colors' :size="size" />
    </div>
    <template v-if="(chaifenPlotMap)" v-for="item in [...p.chars]">
        <template v-if="chaifenPlotMap?.get(item).parts === ''"> {{ item }} </template>
    </template>
    <!-- <p v-else> "宇浩拆分" </p> -->
</template>

<script lang="ts">

</script>