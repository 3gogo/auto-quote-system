/**
 * 应用入口
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { initPlatform } from '@platform/index';
import './styles/global.css';

// 路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue')
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('./views/RecordsView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./views/SettingsView.vue')
    }
  ]
});

// 初始化应用
async function bootstrap() {
  // 初始化平台适配器
  await initPlatform();

  // 创建应用
  const app = createApp(App);

  // 状态管理
  const pinia = createPinia();
  app.use(pinia);

  // 路由
  app.use(router);

  // 挂载
  app.mount('#app');
}

bootstrap().catch(console.error);

