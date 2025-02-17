<template>
  <div>
    <navigation />
    <div :key="$route.params.question" class="question mt-3 mb-5">
      <b-badge class="question-badge shadow mb-2 bg-blue-600 text-white px-2" pill>Question {{$route.params.question}}</b-badge>
      <div class="image-box my-3" :class="question.has_padding ? 'p-3' : ''">
        <img 
          :src="question.image ? $store.getters['app/getImageAsset'](quiz.id, question) : './img/unknown.svg'" 
          alt="Questionable Image" 
          class="image"
        >
      </div>     
      <div class="mt-1 mb-3">
        <p class="incorrect-letters" v-if="showIncorrectCount">
          {{incorrectLetterPresses}} Letter{{incorrectLetterPresses===1?'':'s'}} undone
        </p>
      </div>
      <div class="word-container">
        <div class="d-flex word" v-for="(word, wordi) in getQuestionNames().words" :key="word">
          <div v-for="(letter, letteri) in word" :key="`${letteri}_${letter}`" class="display-letter" :class="letter === ' ' ? 'space' : ''"> 
            {{ getLetter(wordi, letteri) }}
          </div>
        </div>
      </div>
      <div v-if="isActiveQuestionCorrect" class="pt-4">
        <success-check-mark class="mt-3" />
        <div v-if="quizIsCompleted" class="mt-5">
          <p class="text-muted">Quiz Completed!</p>
          <router-link to="/quizzes" alt="Start another quiz" ref="next">
            <b-button class="mt-4" variant="neo" size="lg">
              start another
            </b-button>
          </router-link>
        </div>
        <div v-else-if="canProceed" class="mt-5">
          <router-link class="mt-5" :to="`/quizzes/${$route.params.quiz}/${nextIncompleteQuestionId}`" alt="Go to next question" ref="next">
            <b-button variant="neo" size="lg">
              Next Question <b-icon :icon="faCaretRight" aria-hidden="true"></b-icon>
            </b-button>
          </router-link>
        </div>
        <div v-else class="mt-5">
          <router-link :to="`/quizzes/${$route.params.quiz}`" class="View all questions" ref="next">
            <b-button class="mt-5" variant="neo" size="lg">
              <b-icon :icon="faCaretLeft" aria-hidden="true"></b-icon> Go Back 
            </b-button>
          </router-link>
        </div>
      </div>
      <div v-else>
        <div class="letters">
          <b-button 
            v-for="(letter, index) in getQuestionLetters()" 
            :key="`${index}_${letter}`"
            variant="transparent" 
            :disabled="activeLetters.includes(index)"
            class="letter neo-shadow"
            @click="letterClickIndex(index)">
            {{letter}}
          </b-button>
        </div>
        <div class="action-bar">
          <b-button size="sm" variant="neo" @click="letterUndo()">
            <b-icon :icon="faArrowRotateLeft" aria-label="Undo Last Letter"></b-icon> Undo Letter
          </b-button>
        </div>
        <small class="text-grey-600" v-if="isDevelopment">{{question.name}}</small>
      </div>
    </div>
  </div>
</template>

<script>
import charList from '@/quizzes/charList'
import Navigation from '@/components/Navigation.vue'
import SuccessCheckMark from '@/components/SuccessCheckMark.vue'
import { mapGetters } from 'vuex'
import { shuffleArray, getRandomString, stripSpaces } from '@/quizzes/methods'
import { faCaretRight, faCaretLeft, faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';

export default {
  components: { Navigation, SuccessCheckMark },
  data() { 
    const questionWithOffset = parseInt(this.$route.params.question) - 1
    return { 
      isDevelopment: import.meta.env.DEV,
      quiz: this.$store.getters['quiz/getQuiz'](this.$route.params.quiz),
      question: this.$store.getters['quiz/getQuestion'](this.$route.params.quiz, questionWithOffset),
      availableLetters: null,
      activeLetters: [], // Indexes
      // Icons
      faCaretRight,
      faCaretLeft,
      faArrowRotateLeft,
    }
  },
  computed: {
    ...mapGetters('quiz', ['getQuestionCount']),
    ...mapGetters('questions', ['isActiveQuestionCorrect','activeInteraction']),
    /**
     * If the next generated ID doesn't exist, don't allow proceeding.
     */
    canProceed(){ return this.nextIncompleteQuestionId <= this.questionCount },
    questionCount(){ return this.getQuestionCount(this.quiz.id) },
    quizIsCompleted() { return this.$store.getters['quiz/isQuizCompleted'](this.quiz.id) },
    nextIncompleteQuestionId(){ 
      const currentIndex = parseInt(this.$route.params.question)
      return this.$store.getters['questions/nextIncompleteQuestionId'](this.$route.params.quiz, currentIndex)
    },
    userAnswer() {
      let builtName = ""
      this.activeLetters.forEach(letterIndex => {
        builtName = builtName + this.availableLetters[letterIndex]
      })
      return builtName
    },
    incorrectLetterPresses() {
      return this.activeInteraction.key_presses-this.getQuestionNames().stripped.length
    },
    showIncorrectCount() {
      return this.isActiveQuestionCorrect && this.incorrectLetterPresses > 0
    },
  },
  methods: {
    keyHandler(e) {
      // Only use the last letter input
      const key = e.key.toUpperCase()

      // Process the key-press
      let isValidCharacter = charList.indexOf(key) !== -1 
      switch (key) {
        case 'ENTER':
          // Only proceed if the quesiton is correct
          if(this.isActiveQuestionCorrect) {
            if (this.quizIsCompleted) {
              this.$router.push(`/quizzes/${this.$route.params.quiz}`)
            } else if (this.canProceed) {
              this.$router.push(`/quizzes/${this.$route.params.quiz}/${this.nextIncompleteQuestionId}`)
            } else {
              this.$router.push(`/quizzes/${this.$route.params.quiz}`)
            }
          }
          break
        case 'BACKSPACE':
          // Only undo if the question is not already completed
          if(!this.isActiveQuestionCorrect)
            this.letterUndo()
          break
        default:
          // Only process if the question is not already completed
          if(isValidCharacter && !this.isActiveQuestionCorrect)
            this.findAndClickLetter(key)
          break
      }
    },
    getQuestionLetters() {
      if(this.availableLetters) return this.availableLetters
      let name = this.getQuestionNames().stripped
      let string = getRandomString( name.length * 2 )
      let letterArray = (name + string).toUpperCase().split("")
      this.availableLetters = shuffleArray(letterArray)
      return this.availableLetters
    },
    getQuestionNames() {
      return {
        'stripped': stripSpaces(this.question.name.toUpperCase()),
        'words': this.question.name.toUpperCase().split(/[\s-]/)
      }
    },
    letterClickIndex(letterIndex) {
      if(!this.availableLetters[letterIndex]) { throw `The selected letter doesn't exist` }
      if(this.userAnswer.length === this.getQuestionNames().stripped.length) return
      this.activeLetters.push(letterIndex)

      // Play a key-press sound
      this.$store.dispatch('app/playSound', 'key_press')

      // Log a key-press increment
      this.$store.commit('questions/incrementKeyPress')

      // Check to see if new interaction is correct.
      if(this.userAnswer.length === this.getQuestionNames().stripped.length) {
        this.$store.dispatch('questions/checkAnswer', this.userAnswer)
      }
    },
    letterUndo() {
      if(this.isActiveQuestionCorrect) return
      this.activeLetters = this.activeLetters.slice(0, -1)
    },


    findAndClickLetter(letter) {
      if(this.isActiveQuestionCorrect) return
      let letterIndex = this.getLetterIndex(letter)
      this.letterClickIndex(letterIndex)
    },
    getLetterIndex(letter, start = 0) {
      let index = this.getQuestionLetters().indexOf(letter, start)
      if(this.activeLetters.includes(index)) {
        index = this.getLetterIndex(letter, index + 1)
      }
      return index
    },

    // For built-name-question
    getLetter(wordi, letteri) {
      let offsetCount = 0
      this.getQuestionNames().words.forEach((word, i) => {
        if(i >= wordi) return
        offsetCount = offsetCount + word.length
      })
      let letterIndex = offsetCount ? offsetCount + letteri : letteri

      if(this.isActiveQuestionCorrect) return this.getQuestionNames().stripped[letterIndex]

      return this.userAnswer[letterIndex]
    },

  },
  created() {
    this.$store.commit('questions/setActiveQuizId', this.$route.params.quiz)
    this.$store.commit('questions/setActiveQuestionId', this.question.id)

    window.addEventListener('keydown', this.keyHandler)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.keyHandler)
  },
}

</script>

<style lang="scss" scoped>
.question {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  text-align: center;
}

.question-badge {
  margin-top: -1.5rem;
}

.image-box {
  background: #fff;
  border-radius: 5px;
  max-width: 300px;
  height: 200px;
  display: flex;
  align-items: center;
}

.image {
  height: auto;
  width: auto;
  max-width: 100%;
  max-height: 100%;
  display: block;
  margin: auto;
  border-radius:5px;
  pointer-events: none;
}

.built-name {
  font-weight: bold;
  margin-bottom: 15px;
  letter-spacing: 2px;
  font-size: 18px;
  margin: 20px 0;
  color: var(--gray);
}

.letters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: 16px 32px;
}

.action-bar {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 15px;
  background: #ececec;
  box-shadow: 0 -10px 10px -14px #000000a6
}

.neo-shadow[disabled] {
  opacity: 0.3;
  cursor: default;
  box-shadow: none;
  pointer-events: none;
}

//built-name
.word-container {
  display: flex !important;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 375px;
}

.word {
  margin: 0.2em 0.5em;
}

.letter,
.letter:hover {
  color: var(--gray);
}

.letter {
  --margin: 8px;
  flex-basis: calc(20% - (var(--margin) * 2));
  margin: var(--margin);

  min-height: 46px;
  max-width: 46px;

  padding: 5px;

  border: 1px solid transparent;
  text-shadow: 1px 1px 4px #c2bfbfab;
  font-size: 16px;
  cursor: pointer;
  overflow: hidden;
}

.display-letter {
  margin: 2px;
  min-width: 1.8em;
  min-height: 1.8em;
  color: var(--gray);
  background: white;
  border-radius: 5px;
  padding: 2px;
}

.letter.space {
  background: transparent;
}

.incorrect-letters {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
  box-shadow: 0px 3px 13px 2px #d6d6d6;
  border-radius: 50px;
  padding: 2px 12px;
  color: white;
  background: #ff2d2d99;
  margin: 0;
}
</style>