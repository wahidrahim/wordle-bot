import { readWordsFromFile } from '.'

async function bestWords() {
  const words = await readWordsFromFile('words.txt')
  const lettersCount: Record<string, number> = {}

  words.reduce((lettersCount, word) => {
    for (const letter of word) {
      lettersCount[letter]
        ? (lettersCount[letter] += 1)
        : (lettersCount[letter] = 1)
    }

    return lettersCount
  }, lettersCount)

  const mostCommonLettersInOrder = Object.keys(lettersCount).sort(
    (letter1, letter2) => lettersCount[letter2] - lettersCount[letter1]
  )

  const top5Letters = mostCommonLettersInOrder.slice(0, 5)

  const wordsWithCommonLetters = words.filter((word) => {
    for (const letter of top5Letters) {
      if (!word.includes(letter)) return false
    }

    return true
  })

  console.log({ wordsWithCommonLetters })
}

bestWords()
