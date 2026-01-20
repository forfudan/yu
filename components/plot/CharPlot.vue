<script setup lang="ts">
import { genIdentifier, getDivision } from "./share";
import { onMounted, ref } from 'vue';

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

// Use ref to ensure the ID is consistent between SSR and client
const randYu = ref<string>('');
const isMounted = ref(false);

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

// Only generate ID and render on client side
onMounted(() => {
    randYu.value = genIdentifier(12);
    isMounted.value = true;
    // Use nextTick to ensure DOM is updated with the new ID
    setTimeout(() => {
        getDivision(randYu.value, p.char, parts, colors, p.size);
    }, 0);
});

</script>

<template>
    <div v-if="isMounted" v-bind='{ id: randYu }'></div>
</template>

<script lang="ts">

</script>
