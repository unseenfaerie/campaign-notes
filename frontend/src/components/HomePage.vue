<template>
  <div class="main-content">
    <h1>Campaign Notes</h1>
    <ul>
      <li><router-link to="/characters">Characters</router-link></li>
      <li><router-link to="/items">Items</router-link></li>
      <li><router-link to="/organizations">Organizations</router-link></li>
      <li><router-link to="/places">Places</router-link></li>
      <li><router-link to="/events">Events</router-link></li>
    </ul>
    <p>Welcome to your campaign management site!</p>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
};
</script>