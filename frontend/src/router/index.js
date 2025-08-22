import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../components/HomePage.vue';
// import other pages as needed

const routes = [
  { path: '/', component: HomePage },
  // { path: '/characters', component: CharactersPage }, etc.
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;