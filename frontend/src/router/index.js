import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../components/HomePage.vue';
import CharacterIndex from '../views/CharacterIndex.vue';
import CharacterDetail from '../views/CharacterDetail.vue';
import EventIndex from '../views/EventIndex.vue';
import EventDetail from '../views/EventDetail.vue';
import OrganizationIndex from '../views/OrganizationIndex.vue';
import OrganizationDetail from '../views/OrganizationDetail.vue';
import ItemIndex from '../views/ItemIndex.vue';
import ItemDetail from '../views/ItemDetail.vue';
import DeityIndex from '../views/DeityIndex.vue';
import DeityDetail from '../views/DeityDetail.vue';
import PlaceIndex from '../views/PlaceIndex.vue';
import PlaceDetail from '../views/PlaceDetail.vue';

const routes = [
  { path: '/', component: HomePage },
  { path: '/characters', component: CharacterIndex },
  { path: '/characters/:id', component: CharacterDetail },
  { path: '/events', component: EventIndex },
  { path: '/events/:id', component: EventDetail },
  { path: '/organizations', component: OrganizationIndex },
  { path: '/organizations/:id', component: OrganizationDetail },
  { path: '/items', component: ItemIndex },
  { path: '/items/:id', component: ItemDetail },
  { path: '/deities', component: DeityIndex },
  { path: '/deities/:id', component: DeityDetail },
  { path: '/places', component: PlaceIndex },
  { path: '/places/:id', component: PlaceDetail }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;