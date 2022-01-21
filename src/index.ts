import {
  visitWordleSite,
  closeInstructionsModal,
  solveWithoutTrying,
  turnOnHardMode,
  guessNewWord,
  evaluateGuess,
  wait,
  getStatistics,
  insertPreviousStats,
} from './actions'
import {
  readWordsFromFile,
  getRandomWord,
  removeFromArray,
  saveStatistics,
} from './util'

const isDevMode = process.env.NODE_ENV === 'development'
const isCheatMode = process.env.CHEAT === 'true'
const maximumGuesses = 6

// "AROSE" has all the most common letters from the 5-letter word list
const startingWord = 'arose'

async function solve() {
  await visitWordleSite()
  await insertPreviousStats()
  await closeInstructionsModal()

  if (isCheatMode) return await solveWithoutTrying()

  let words: string[] = await readWordsFromFile('words.txt')

  // Only serves to make sure wordle-bot is making optimal guesses
  await turnOnHardMode()

  const correctLettersIndex: Record<string, number> = {}
  const presentLettersIndices: Record<string, number[]> = {}
  const absentLetters: string[] = []

  for (let tries = 1; tries <= maximumGuesses; ++tries) {
    if (!words.length) throw 'Out of words 🐞'

    if (isDevMode) console.log(words)

    let newWord = tries === 1 ? startingWord : getRandomWord(words)

    await guessNewWord(newWord)

    const evaluation: string[] = await evaluateGuess(tries)

    if (evaluation.every((value) => value === 'correct')) {
      if (!isDevMode) await wait(10_000)

      const stats = await getStatistics()

      return {
        word: newWord,
        tries,
        stats,
      }
    }

    // Process evaluation in order to shorten list of possible words
    for (const [index, value] of evaluation.entries()) {
      const letter = newWord[index]

      switch (value) {
        case 'correct':
          correctLettersIndex[letter] = index

          if (absentLetters.includes(letter))
            removeFromArray(absentLetters, letter)
          break
        case 'present':
          const isNewIndex =
            presentLettersIndices[letter] &&
            !presentLettersIndices[letter].includes(index)

          isNewIndex
            ? presentLettersIndices[letter].push(index)
            : (presentLettersIndices[letter] = [index])

          if (absentLetters.includes(letter))
            removeFromArray(absentLetters, letter)
          break
        case 'absent':
          const isTotallyAbsent =
            !(letter in correctLettersIndex) &&
            !(letter in presentLettersIndices)

          if (isTotallyAbsent) absentLetters.push(letter)
      }
    }

    // Remove words without correctly placed letters
    words = words.filter((word) => {
      for (const letter in correctLettersIndex) {
        const index = correctLettersIndex[letter]

        if (word[index] !== letter) return false
      }

      return true
    })

    // Remove words that do not have present letters
    words = words.filter((word) => {
      for (const letter in presentLettersIndices)
        if (word.indexOf(letter) === -1) return false

      return true
    })

    // Remove words that have present letters in the incorrect place
    words = words.filter((word) => {
      for (const letter in presentLettersIndices) {
        const checkedIndices = presentLettersIndices[letter]

        for (const index of checkedIndices)
          if (word[index] === letter) return false
      }

      return true
    })

    // Remove words that have absent letters
    words = words.filter((word) => {
      for (const letter of absentLetters)
        if (word.indexOf(letter) !== -1) return false

      return true
    })

    // Remove the guessed word form
    words = words.filter((word) => word !== newWord)

    await wait(2000)
  }

  throw 'Unable to guess word in 6 tries 😬'
}

solve()
  .then(({ word, tries, stats }) => {
    console.log('✨', word)
    console.log(`In ${tries} tries`)

    if (stats) {
      const formattedStats = JSON.stringify(
        JSON.parse(stats),
        null,
        2
      )

      saveStatistics(formattedStats)

      console.log(JSON.parse(stats))
    }

    if (!isDevMode) process.exit(0)
  })
  .catch((error) => console.log(error))
