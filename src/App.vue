<template>
  <router-view />
</template>

<script setup>
import { useQuasar } from 'quasar'

const $q = useQuasar()

$q.dark.set('auto') // light mode
</script>

<style></style>
