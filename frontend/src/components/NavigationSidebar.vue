<template>
    <nav class="sidebar">
      <div class="sidebar-title">Campaign Notes</div>
      <ul>
        <li><router-link to="/characters">Characters</router-link></li>
        <li><router-link to="/items">Items</router-link></li>
        <li><router-link to="/organizations">Organizations</router-link></li>
        <li><router-link to="/places">Places</router-link></li>
        <li><router-link to="/events">Events</router-link></li>
      </ul>
    </nav>
</template>

<script setup>
</script>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: linear-gradient(135deg, #232526 0%, #414345 100%);
  color: #fff;
  padding: 0 0 2rem 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.sidebar-title {
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 1px;
  padding: 1.5rem 1rem 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 1rem;
}
.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar li {
  margin: 0.5rem 0;
}
.sidebar a {
  color: #fff;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  display: block;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
}
.sidebar a.router-link-exact-active {
  background: #4e54c8;
  color: #fff;
  font-weight: bold;
}
.sidebar a:hover {
  background: rgba(255,255,255,0.08);
  color: #ffd700;
}
</style>