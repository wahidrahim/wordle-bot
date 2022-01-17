import fs from 'fs'
import readline from 'readline'
import path from 'path'
import puppeteer from 'puppeteer'
import {
  visitWordleSite,
  closeInstructionsModal,
  solveWithoutTrying,
  turnOnHardMode,
  guessNewWord,
  evaluateGuess,
  wait,
} from './puppeteer-actions'
import { getRandomWord, readWordsFromFile } from './util'

const isCheatMode = process.env.CHEAT || false

async function main() {
  // const browser = await puppeteer.launch({ headless: false })
  // const page = await browser.newPage()

  // await page.goto('https://www.powerlanguage.co.uk/wordle/')

  // Close instructions
  // await page.evaluate(() => {
  //   const $closeButton = document
  //     .querySelector('body > game-app')
  //     ?.shadowRoot?.querySelector('#game > game-modal')
  //     ?.shadowRoot?.querySelector('div > div > div > game-icon') as HTMLElement

  //   $closeButton.click()
  // })

  await visitWordleSite()
  await closeInstructionsModal()

  if (isCheatMode) return await solveWithoutTrying()

  // if (process.env.CHEAT) {
  //   const solution: string = await page.evaluate(() => {
  //     const gameState = localStorage.getItem('gameState')

  //     if (gameState) return JSON.parse(gameState).solution

  //     return ''
  //   })

  //   if (solution) {
  //     await page.keyboard.type(solution)
  //     await page.keyboard.press('Enter')

  //     return {
  //       word: solution,
  //       tries: 1,
  //     }
  //   }

  //   throw "Couldn't use cheatz"
  // }

  // let words: string[] = []

  let words: string[] = await readWordsFromFile('words.txt')

  // const fileStream = fs.createReadStream(path.resolve(__dirname, 'words.txt'))
  // const rl = readline.createInterface({
  //   input: fileStream,
  //   crlfDelay: Infinity,
  // })

  // for await (const line of rl) words.push(line)

  // // Turn on "Hard Mode"
  // await page.evaluate(() => {
  //   const $settingsButton = document
  //     .querySelector('body > game-app')
  //     ?.shadowRoot?.querySelector('#settings-button') as HTMLElement

  //   $settingsButton.click()

  //   const $hardMode = document
  //     .querySelector('body > game-app')
  //     ?.shadowRoot?.querySelector('#game > game-page > game-settings')
  //     ?.shadowRoot?.querySelector('#hard-mode') as HTMLElement

  //   $hardMode.click()

  //   const $closeButton = document
  //     .querySelector('body > game-app')
  //     ?.shadowRoot?.querySelector('#game > game-page')
  //     ?.shadowRoot?.querySelector(
  //       'div > div > header > game-icon'
  //     ) as HTMLElement

  //   $closeButton.click()
  // })

  // To make sure wordle-bot is making optimal guesses
  await turnOnHardMode()

  // const absentLetters: string[] = []
  // const presentLettersIndices: Record<string, number[]> = {}
  // const correctLettersIndex: Record<string, number> = {}

  const correctLettersIndex: Record<string, number> = {}
  const presentLettersIndices: Record<string, number[]> = {}
  const absentLetters: string[] = []

  // let inputWord = words[Math.floor(Math.random() * words.length)]
  // let row = 0

  let inputWord = getRandomWord(words)
  let row = 0
  // for (; row < 6; row++) {
  //   await page.keyboard.type(inputWord)
  //   await page.keyboard.press('Enter')
  for (; row < 6; ++row) {
    await guessNewWord(inputWord)

    //   const evaluation: string[] = await page.evaluate((row) => {
    //     const $game = document.querySelector('game-app')?.shadowRoot
    //     const $gameRows = $game?.querySelectorAll('game-row')

    //     if (!$gameRows) return

    //     return ($gameRows[row] as any).evaluation
    //   }, row)

    const evaluation: string[] = await evaluateGuess(row)

    //   // Break out of loop once solved
    //   if (evaluation.every((value) => value === 'correct')) break
    if (evaluation.every((value) => value === 'correct'))
      return {
        word: inputWord,
        tries: row + 1,
      }

    //   for (const [index, value] of evaluation.entries()) {
    //     const letter = inputWord[index]

    //     if (value === 'correct') {
    //       correctLettersIndex[letter] = index
    //     } else if (value === 'present') {
    //       if (
    //         presentLettersIndices[letter] &&
    //         !presentLettersIndices[letter].includes(index)
    //       ) {
    //         presentLettersIndices[letter].push(index)
    //       } else {
    //         presentLettersIndices[letter] = [index]
    //       }
    //     } else if (
    //       value === 'absent' &&
    //       !(letter in presentLettersIndices) &&
    //       !(letter in correctLettersIndex)
    //     ) {
    //       absentLetters.push(letter)
    //     }
    //   }

    for (const [index, value] of evaluation.entries()) {
      const letter = inputWord[index]

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

    inputWord = words[Math.floor(Math.random() * words.length)]

    await wait(2000)
  }

  return {
    word: inputWord,
    tries: row + 1,
  }
}

main()
  .then(({ word, tries }) => {
    console.log('✨', word)
    console.log(`In ${tries} tries`)
  })
  .catch((error) => console.log(error))
