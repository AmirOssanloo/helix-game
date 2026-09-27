/**
 * The words every value is hashed and compared through. Slots 0 and 1 of `floats` are the two
 * sides of a comparison, and `words` overlays them, so a float is read by its bits with no
 * number crossing a call. Word 4, past both floats, carries a small integer: a tag, a length,
 * or a character code.
 */
const buffer = new ArrayBuffer(24);
export const floats = new Float64Array(buffer, 0, 2);
const words = new Uint32Array(buffer);
const SMALL_WORD = 4;

/** The hash under way, in a typed array so a store never boxes it. */
const hashState = new Int32Array(1);

/** A tag hashed before a value that may be absent, so an absence never reads as a zero. */
export const ABSENT = 0;
export const PRESENT = 1;

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

/**
 * One step of MurmurHash3's body over the word at `index`. Each step is a bijection of the
 * hash for a fixed word, so two states that differ in one word never meet again.
 */
const mixWordAt = (index: number): void => {
  let k = Math.imul(words[index] ?? 0, C1);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, C2);

  let h = (hashState[0] ?? 0) ^ k;
  h = (h << 13) | (h >>> 19);
  hashState[0] = Math.imul(h, 5) + 0xe6546b64;
};

export const mixSmall = (value: number): void => {
  words[SMALL_WORD] = value;
  mixWordAt(SMALL_WORD);
};

/** Both words of the float in slot 0. */
export const mixFloat = (): void => {
  mixWordAt(0);
  mixWordAt(1);
};

export const mixText = (text: string | null): void => {
  if (text === null) {
    mixSmall(ABSENT);

    return;
  }

  mixSmall(PRESENT);
  mixSmall(text.length);

  for (let index = 0; index < text.length; index += 1) {
    mixSmall(text.charCodeAt(index));
  }
};

/** Whether the two floats in slots 0 and 1 have the same bits, so `-0` and `0` differ and a `NaN` equals itself. */
export const sameFloats = (): boolean =>
  words[0] === words[2] && words[1] === words[3];

/** Starts a hash. */
export const beginHash = (): void => {
  hashState[0] = 0;
};

/**
 * The hash so far, finished with MurmurHash3's mix and folded to 30 bits, so the value is a
 * small integer the engine never boxes and a log writes it as a plain number.
 */
export const finishHash = (): number => {
  let h = hashState[0] ?? 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return (h ^ (h >>> 30)) & 0x3fffffff;
};
