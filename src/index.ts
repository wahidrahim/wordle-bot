import fs from 'fs'
import readline from 'readline'
import path from 'path'
import puppeteer from 'puppeteer'

type Evaluation = 'absent' | 'present' | 'correct'

let words: string[] = []

async function getWords(path: fs.PathLike) {
  const fileStream = fs.createReadStream(path)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) words.push(line)
}

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)]
}

async function main() {
  await getWords(path.resolve(__dirname, 'words.txt'))

  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto('https://www.powerlanguage.co.uk/wordle/')

  // Close instructions
  await page.evaluate(() => {
    const $closeButton = document
      .querySelector('body > game-app')
      ?.shadowRoot?.querySelector('#game > game-modal')
      ?.shadowRoot?.querySelector('div > div > div > game-icon') as HTMLElement

    $closeButton.click()
  })

  // Turn on "Hard Mode"
  await page.evaluate(() => {
    const $settingsButton = document
      .querySelector('body > game-app')
      ?.shadowRoot?.querySelector('#settings-button') as HTMLElement

    $settingsButton.click()

    const $hardMode = document
      .querySelector('body > game-app')
      ?.shadowRoot?.querySelector('#game > game-page > game-settings')
      ?.shadowRoot?.querySelector('#hard-mode') as HTMLElement

    $hardMode.click()

    const $closeButton = document
      .querySelector('body > game-app')
      ?.shadowRoot?.querySelector('#game > game-page')
      ?.shadowRoot?.querySelector(
        'div > div > header > game-icon'
      ) as HTMLElement

    $closeButton.click()
  })

  const absentLetters: string[] = []
  const presentLettersIndices: Record<string, number[]> = {}
  const correctLettersIndex: Record<string, number> = {}

  let inputWord = getRandomWord()
  let row = 0

  for (; row < 6; row++) {
    await page.keyboard.type(inputWord)
    await page.keyboard.press('Enter')

    const evaluation: string[] = await page.evaluate((row) => {
      const $game = document.querySelector('game-app')?.shadowRoot
      const $gameRows = $game?.querySelectorAll('game-row')

      if (!$gameRows) return

      return ($gameRows[row] as any).evaluation
    }, row)

    // Break out of loop once solved
    if (evaluation.every((value) => value === 'correct')) break

    for (const [index, value] of evaluation.entries()) {
      const letter = inputWord[index]

      if ((value as Evaluation) === 'correct') {
        correctLettersIndex[letter] = index
      } else if ((value as Evaluation) === 'present') {
        if (
          presentLettersIndices[letter] &&
          !presentLettersIndices[letter].includes(index)
        ) {
          presentLettersIndices[letter].push(index)
        } else {
          presentLettersIndices[letter] = [index]
        }
      } else if (
        (value as Evaluation) === 'absent' &&
        !(letter in presentLettersIndices) &&
        !(letter in correctLettersIndex)
      ) {
        absentLetters.push(letter)
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
      for (const letter in presentLettersIndices) {
        if (word.indexOf(letter) === -1) return false
      }

      return true
    })

    // Remove words that have present letters in the incorrect place
    words = words.filter((word) => {
      for (const letter in presentLettersIndices) {
        const checkedIndices = presentLettersIndices[letter]

        for (const index of checkedIndices) {
          if (word[index] === letter) return false
        }
      }

      return true
    })

    // Remove words that have absent letters
    words = words.filter((word) => {
      for (const letter of absentLetters) {
        if (word.indexOf(letter) !== -1) return false
      }

      return true
    })

    inputWord = getRandomWord()

    await page.waitForTimeout(2000)
  }

  return {
    word: inputWord,
    tries: row,
  }
}

main()
  .then(({ word, tries }) => {
    console.log('✨', word)
    console.log(`In ${tries} tries`)
  })
  .catch((error) => console.log(error))
