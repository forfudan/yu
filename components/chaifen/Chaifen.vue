<script setup lang="ts">
import { genIdentifier, getDivision } from "./share";
import { onMounted } from 'vue';

const p = defineProps({
    char: { type: String },
    parts: {
        type: [String, Array<number>],
        required: false
    },
    colors: {
        type: [String, Array<number>],
        required: false,
    },
    size: {
        type: Number,
        required: false,
        default: 75
    },
})

const randYu = genIdentifier(12);
var parts: Array<number>
var colors: Array<number>

if (typeof p.parts === "string") {
    if (p.parts === "") {
        parts = [99]
    } else {
        parts = p.parts.split(' ').map(function (item) { return parseInt(item, 10); })
    }
} else {
    parts = p.parts
};
if (typeof p.colors === "string") {
    if (p.colors === "") {
        colors = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    } else {
        colors = p.colors.split(' ').map(function (item) { return parseInt(item, 10); })
    }
} else {
    colors = p.colors
};

// Only call getDivision when component is mounted (client-side)
onMounted(() => {
    getDivision(randYu, p.char, parts, colors, p.size);
});

</script>

<template>
    <div v-bind='{ id: randYu }'></div>
</template>

<script lang="ts">

</script>