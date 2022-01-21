import puppeteer from 'puppeteer'
import type { Browser, Page } from 'puppeteer'

let browser: Browser
let page: Page

export async function visitWordleSite() {
  browser = await puppeteer.launch({ headless: false })
  page = await browser.newPage()

  await page.goto('https://www.powerlanguage.co.uk/wordle/')
}

export async function insertPreviousStats() {
  try {
    const stats = require('./util/statistics.json')

    await page.evaluate((stats) => {
      localStorage.setItem('statistics', JSON.stringify(stats))
    }, stats)
  } catch (error) {
    console.log('No previous statistics found')
  }
}

export async function closeInstructionsModal() {
  await page.evaluate(() => {
    const $closeButton = document
      .querySelector('body > game-app')
      ?.shadowRoot?.querySelector('#game > game-modal')
      ?.shadowRoot?.querySelector('div > div > div > game-icon') as HTMLElement

    $closeButton.click()
  })
}

export async function solveWithoutTrying() {
  const solution: string = await page.evaluate(() => {
    const gameState = localStorage.getItem('gameState')

    if (gameState) return JSON.parse(gameState).solution

    return ''
  })

  if (solution) {
    await page.keyboard.type(solution)
    await page.keyboard.press('Enter')

    await wait(10_000)

    const stats = await getStatistics()

    return {
      word: solution,
      tries: 1,
      stats,
    }
  }

  throw 'Not able to find `solution` in localStorage 🤷'
}

export async function turnOnHardMode() {
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
}

export async function guessNewWord(word: string) {
  await page.keyboard.type(word)
  await page.keyboard.press('Enter')
}

export async function evaluateGuess(row: number) {
  return await page.evaluate((row) => {
    const $game = document.querySelector('game-app')?.shadowRoot
    const $gameRows = $game?.querySelectorAll('game-row')

    if (!$gameRows) return

    return ($gameRows[row - 1] as any).evaluation
  }, row)
}

export async function getStatistics() {
  return await page.evaluate((statistics) => localStorage.getItem('statistics'))
}

export async function wait(milliseconds: number) {
  await page.waitForTimeout(milliseconds)
}
