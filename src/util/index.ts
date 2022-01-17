import fs from 'fs'
import readline from 'readline'
import path from 'path'

export async function readWordsFromFile(fileName: string) {
  const words: string[] = []

  const fileStream = fs.createReadStream(path.resolve(__dirname, fileName))
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) words.push(line)

  return words
}

export function getRandomWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)]
}

export function removeFromArray<T>(arr: T[], item: T): T[] {
  arr.splice(0, arr.length, ...arr.filter((_item) => _item !== item))

  return arr
}