<template>
  <nav class="nav">
    <router-link class="link-icon" :to="parentUrl" :disabled="hideBack">
      <b-icon icon="caret-left" aria-hidden="true"></b-icon>
    </router-link>
    <h1 class="app-title">Quizzi</h1>
    <router-link class="link-icon" to="/quizzes" alt="View all Quizzes" :disabled="hideHome">
      <b-icon icon="house" aria-hidden="true"></b-icon>
    </router-link>
  </nav>
</template>

<script>
export default {
  name: 'navigation',
  props: {
    hideHome: {
      type: Boolean,
      default: false
    },
    hideBack: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    parentUrl() {
      let splitUrl = this.$route.fullPath.split('/')
      splitUrl.pop()
      let parentUrl = splitUrl.join('/')
      return parentUrl ? parentUrl : '/'
    }
  }
}
</script>

<style>
.nav {
  display: flex;
  justify-content: space-between;
  padding: 20px 10px;
  color: var(--gray);
}

.link-icon {
  color: var(--gray);
  margin: 5px 20px;
  font-size: 26px;
}

.link-icon:hover {
  color: var(--blue);
}

.link-icon[disabled] {
  pointer-events: none;
  opacity: 0.25;
}

.app-title {
  text-transform: uppercase;
  letter-spacing: 16px;
  font-size: 16px;
  margin: 0;
  align-self: center;
}
</style>