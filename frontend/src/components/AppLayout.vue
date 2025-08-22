<template>
  <div id="app">
    <NavigationSidebar />
    <router-view />
  </div>
</template>

<script setup>
import NavigationSidebar from './NavigationSidebar.vue';
</script>

<style>
#app {
  display: flex;
}
</style>
