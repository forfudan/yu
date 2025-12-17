<script setup lang="ts">
/** 单字练习 */
import { shallowRef, onMounted } from "vue";
import { Card, cache, fetchChaifenOptimized, fetchZigen, makeCodesFromDivision } from "./share";
import Train from "./TrainCard.vue";

const p = defineProps<{
  /** 方案的名字 */
  name: string,
  /** 拆分的csv文件URL */
  chaifenUrl: string
  /** 字根映射的csv文件URL */
  zigenUrl: string
  /** 练习的范围，从第几条到第几条，不填则是全部 */
  range?: [start: number, end: number]
  rule: string
}>()

let cardsName = p.name + '_char'
const range = p.range
if (range) {
  cardsName += `_${range[0]}_${range[1]}`
}

const cards = shallowRef<Card[]>(cache[cardsName] as Card[])
const chaifenMap = shallowRef()

onMounted(async () => {
  if (cards.value && chaifenMap.value) return;

  // 使用优化的JSON格式读取拆分数据
  chaifenMap.value = await fetchChaifenOptimized(p.chaifenUrl)
  const zigenMap = await fetchZigen(p.zigenUrl)

  let chaifenValues = [...chaifenMap.value.values()]

  if (range) {
    chaifenValues = chaifenValues.slice(range[0], range[1])
  }

  cards.value = chaifenValues.map(cf => ({
    name: cf.char,
    key: makeCodesFromDivision(cf.division, zigenMap, p.rule)
  }))

  cache[cardsName] = cards.value
})
</script>

<template>
  <Train v-if="cards && chaifenMap" :name="cardsName" :cards :chaifenMap mode="z" :rule="p.rule" />
  <h2 class="text-gray-700 text-center" v-else>
    下载数据中……
  </h2>
</template>