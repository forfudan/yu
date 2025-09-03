<!--
  Search.vue - 搜索結果展示組件
  
  Modification History:
  - 2025-08-14 by 朱複丹: 优化组件间通信，使用v-model进行数据绑定
  - 2025-08-13 by 朱複丹: 增加參數 ming，允許對日月方案進行編碼
  - 2024-12-16 by yb6b: feat: Search component searchParm Prop
  - 2024-04-24 by 朱複丹: 增加對天碼的支持
  - 2024-03-27 by 朱複丹: 增加參數 supplement，判斷是否需要回頭碼
  - 2024-03-27 by yb6b: 製作拆分查詢的組件
-->

<script setup lang="ts">
import { shallowRef, ref, watch } from "vue";
import { watchThrottled, useUrlSearchParams } from "@vueuse/core";
import Card from "./Card.vue";
import { ChaifenMap, ZigenMap } from "./share";
const p = defineProps<{
    chaifenMap: ChaifenMap,
    zigenMap: ZigenMap,
    supplement: boolean,
    ming: boolean,
    wafel?: boolean,
    /** 是否启用URL里的搜索Params */
    searchParam?: boolean,
    /** 用户输入 */
    userInput?: string,
}>()

const emit = defineEmits<{
    'update:userInput': [value: string]
}>()

const urlSearchParams = useUrlSearchParams()
const localUserInput = shallowRef(p.userInput || urlSearchParams?.q || '')
const searchZigens = shallowRef<string[]>()

// Watch for changes in userInput prop
watch(() => p.userInput, (newInput) => {
    if (newInput !== undefined && newInput !== localUserInput.value) {
        localUserInput.value = newInput
    }
}, { immediate: true })

// Watch local input changes and emit to parent
watch(localUserInput, (newValue) => {
    emit('update:userInput', newValue as string)
}, { immediate: false })

watchThrottled(localUserInput, () => {
    const user = localUserInput.value as string
    if (p.searchParam) {
        urlSearchParams.q = user
    }
    searchZigens.value = [...user].filter(zi => p.chaifenMap.has(zi))
}, { throttle: 300, immediate: true })

let poets: string[] =
    ["小樓一夜聽春雨　深巷明朝賣杏花",
        "休對故人思故國　且將新火試新茶",
        "三十功名塵與土　八千里路雲和月",
        "落花人獨立　微雨燕雙飛",
        "玲瓏骰子安紅豆　入骨相思知不知",
        "兩情若是久長時　又豈在朝朝暮暮",
        "身無彩鳳雙飛翼　心有靈犀一點通",
        "自在飛花輕似夢　無邊絲雨細如愁",
        "醉後不知天在水　滿船清夢壓星河",
        "東風夜放花千樹　更吹落　星如雨",
        "鳳蕭聲動　玉壸光轉　一夜魚龍舞",
        "爲君持酒勸斜陽　且向花間留晚照",
        "綠楊煙外曉寒輕　紅杏枝頭春意鬧",
        '城中桃李愁風雨　春在溪頭薺菜花',
        '未是秋光奇绝　看十五十六',
    ];
const ind: number =
    Math.floor(Math.random() * poets.length);
const poet: string = poets[ind];

</script>

<template>
    <div v-if="!localUserInput" class="opacity-40 text-center p-9 tracking-widest">{{ poet }}</div>
    <div class="flex justify-center flex-wrap my-8" v-else>
        <Card v-for="zigen in searchZigens" :key="zigen" :chaifen="chaifenMap.get(zigen)" :zigenMap
            :supplement="p.supplement" :ming="p.ming" :wafel="p.wafel" />
    </div>

</template>