import {
  visitWordleSite,
  closeInstructionsModal,
  solveWithoutTrying,
  turnOnHardMode,
  guessNewWord,
  evaluateGuess,
  wait,
} from './actions'
import { readWordsFromFile, getRandomWord } from './util'

const isCheatMode = process.env.CHEAT || false
const maximumGuesses = 6

async function solve() {
  await visitWordleSite()
  await closeInstructionsModal()

  if (isCheatMode) return await solveWithoutTrying()

  let words: string[] = await readWordsFromFile('words.txt')

  // Only serves to make sure wordle-bot is making optimal guesses
  await turnOnHardMode()

  const correctLettersIndex: Record<string, number> = {}
  const presentLettersIndices: Record<string, number[]> = {}
  const absentLetters: string[] = []

  for (let tries = 1; tries <= maximumGuesses; ++tries) {
    let newWord = getRandomWord(words)

    await guessNewWord(newWord)

    const evaluation: string[] = await evaluateGuess(tries)

    if (evaluation.every((value) => value === 'correct')) {
      await wait(5000)

      return {
        word: newWord,
        tries,
      }
    }

    // Process evaluation in order to shorten list of possible words
    for (const [index, value] of evaluation.entries()) {
      const letter = newWord[index]

      switch (value) {
        case 'correct':
          correctLettersIndex[letter] = index
          break
        case 'present':
          const isNewIndex =
            presentLettersIndices[letter] &&
            !presentLettersIndices[letter].includes(index)

          isNewIndex
            ? presentLettersIndices[letter].push(index)
            : (presentLettersIndices[letter] = [index])
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

    await wait(2000)
  }

  throw 'Unable to guess word in 6 tries 😬'
}

solve()
  .then(({ word, tries }) => {
    console.log('✨', word)
    console.log(`In ${tries} tries`)

    process.exit(0)
  })
  .catch((error) => console.log(error))