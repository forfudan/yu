---
aside: false
---

# 聲筆猛碼

<script setup>
import ZigenMap from "@/zigen/ZigenMap.vue"
</script>

<ZigenMap 
:default-scheme="'sbmm'"
column-min-width="1rem"
:read-examples-from-csv="true"
:customEmptyKeyLabels="{
',': '筆劃　横',
';': '筆劃　豎',
'/': '筆劃　撇',
'.': '筆劃　捺'
}"
schemeCnName="聲筆猛碼"
customFooter="官網鏈接: https://sbxlm.github.io/sbmm · 本圖鏈接: https://shurufa.app/ime/sbmm"
/>
