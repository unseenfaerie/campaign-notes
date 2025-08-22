import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../components/HomePage.vue';
import CharacterIndex from '../components/CharacterIndex.vue';
import CharacterDetail from '../components/CharacterDetail.vue';
// import other pages as needed

const routes = [
  { path: '/', component: HomePage },
  { path: '/characters', component: CharacterIndex },
  { path: '/characters/:id', component: CharacterDetail },
  // { path: '/characters', component: CharactersPage }, etc.
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;