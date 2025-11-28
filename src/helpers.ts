import {lowercase, numbers} from "nanoid-dictionary";
import {customAlphabet} from "nanoid";

export function getRandomId(length: number = 5): string {
  return customAlphabet(lowercase + numbers, length)();
}