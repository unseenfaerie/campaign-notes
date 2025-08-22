import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../components/HomePage.vue';
import CharacterIndex from '../views/CharacterIndex.vue';
import CharacterDetail from '../views/CharacterDetail.vue';
import EventIndex from '../views/EventIndex.vue';
import EventDetail from '../views/EventDetail.vue';
// import other pages as needed

const routes = [
  { path: '/', component: HomePage },
  { path: '/characters', component: CharacterIndex },
  { path: '/characters/:id', component: CharacterDetail },
  { path: '/events', component: EventIndex },
  { path: '/events/:id', component: EventDetail }
  // { path: '/characters', component: CharactersPage }, etc.
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;