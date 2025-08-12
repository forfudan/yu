<script setup lang="ts">
import { shallowRef, ref } from "vue";
import { watchThrottled, useUrlSearchParams } from "@vueuse/core";
import Card from "./Card.vue";
import { ChaifenMap, ZigenMap } from "./share";
const p = defineProps<{
    chaifenMap: ChaifenMap,
    zigenMap: ZigenMap,
    supplement: boolean,
    ming: boolean,
    /** 是否启用URL里的搜索Params */
    searchParam?: boolean,
}>()

const urlSearchParams = useUrlSearchParams()
const userInput = shallowRef(urlSearchParams?.q || '')
const searchZigens = shallowRef<string[]>()
watchThrottled(userInput, () => {
    const user = userInput.value as string
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
    <label class="input input-bordered bg-gray-100 dark:bg-slate-800 flex items-center gap-2 mt-2">
        <input type="text" class="grow" placeholder="輸入文本查詢拆分" v-model="userInput" />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-70">
            <path fill-rule="evenodd"
                d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                clip-rule="evenodd" />
        </svg>
    </label>

    <div v-if="!userInput" class="opacity-40 text-center p-9 tracking-widest">{{ poet }}</div>
    <div class="flex justify-center flex-wrap my-8" v-else>
        <Card v-for="zigen in searchZigens" :key="zigen" :chaifen="chaifenMap.get(zigen)" :zigenMap
            :supplement="p.supplement" :ming="p.ming" />
    </div>

</template>