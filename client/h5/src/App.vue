<script setup lang="ts">
import { RouterView } from 'vue-router';
import TabBar from './components/TabBar.vue';
</script>

<template>
  <div class="app">
    <main class="app-content">
      <RouterView />
    </main>
    <TabBar />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>

