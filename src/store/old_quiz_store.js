import Vue from 'vue'
import Vuex from 'vuex'
// import VuexPersistence from 'vuex-persist'
import { Quiz } from '@/quizzes/classes'
import domain from '@/domain'

Vue.use(Vuex)

// const vuexLocal = new VuexPersistence({
//   storage: window.localStorage,
// })

export default new Vuex.Store({
  // plugins: [vuexLocal.plugin],
  state: {
    quizzes: {}
  },
  getters: {
    hasQuizzes: (state, getters) => {
      return getters.quizIds.length > 0
    },
    quizIds: state => {
      return Object.keys(state.quizzes)
    },
    quizzes: state => {
      return Object.values(state.quizzes)
    },
    getQuiz: state => id => {
      return state.quizzes[id]
    },
    getQuizSymbol: state => (id, symbolIndex) => {
      return state.quizzes[id].symbols[symbolIndex]
    }
  },
  actions: {
    async fetchQuizzes({ commit }) {
      var url = new URL(`${domain}/items/quizzi_quizzes`)

      var params = {
        fields: [
          'id',
          'sort',
          'date_created',
          'date_updated',
          'name',
          // 'questions.id'
        ],
        'filter[status][_eq]': 'published'
      }

      url.search = new URLSearchParams(params).toString()
  
      try {

        const cache = await caches.open(`v1__quiz-index`)
        cache.add(url)

        var response = await fetch(url)
        var data = await response.json()

        console.info('📜 Fetched Quizzes', data.data)
        commit('setQuizzes', data.data)
        return true
      } catch (e) {
        console.error('📜 Something went wrong!', e)
        return false
      }
    },
    async fetchQuiz({ commit }, id) {
      var url = new URL(`${domain}/items/quizzi_quizzes/${id}`)

      var params = {
        fields: [
          'id',
          'sort',
          'date_created',
          'date_updated',
          'name',
          'questions.id',
          'questions.sort',
          'questions.date_created',
          'questions.date_updated',
          'questions.name',
          'questions.has_padding',
          'questions.image.id'
        ],
        'filter[status][_eq]': 'published',
        'deep[questions][_filter][status][_eq]': 'published'
      }

      url.search = new URLSearchParams(params).toString()
  
      try {

        const cache = await caches.open(`v1__quiz__${id}`)
        cache.add(url)
        cache.add('./img/unknown.svg') // this needs to be cached globally // Cache broken image URL

        var response = await fetch(url)
        var data = await response.json()

        // Cache all Images
        const assetLinks = data.data.questions.map(i => `${domain}/assets/${i.image.id}`)
        cache.addAll(assetLinks)

        // Commit the result
        console.info('📜 Fetched Quiz', data.data.name, data.data)
        commit('setQuizQuestions', {id: data.data.id, questions: data.data.questions})
        return true
      } catch (e) {
        console.error('📜 Something went wrong!', e)
        return false
      }
    },
  },
  mutations: {
    setQuizQuestions(state, {id, questions}) {
      let quizSymbolIds = state.quizzes[id].symbols.map(s => s.id)
      questions.forEach(sym => {
        if(quizSymbolIds.indexOf(sym.id) < 0) { state.quizzes[id].addSymbol(sym) }
      })
    },
    setQuizzes(state, quizzes) {
      quizzes.forEach(q => {
        if(!(q.id in state.quizzes)) { Vue.set(state.quizzes, q.id, new Quiz(q)) } // create new quiz object if it doesnt exist already
      })
    }
  },
  modules: {
  }
})