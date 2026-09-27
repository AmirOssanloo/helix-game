/**
 * The words every value is hashed and compared through, and the hash under way. Slots 0 and 1
 * of `floats` are the two sides of a comparison, and `words` overlays them, so a float is read
 * by its bits with no number crossing a call. Word 4, past both floats, carries a small
 * integer: a tag, a length, or a character code. The hash under way is in a typed array so a
 * store never boxes it. `mixEntry` hashes one entry of a table, made with the hasher so walking
 * a table with `forEach` makes no closure.
 *
 * Whoever takes checksums makes one and hands it down, so the module holds nothing and two
 * worlds hashed in turn share nothing but what their caller gives them.
 */
export type Hasher = Readonly<{
  floats: Float64Array;
  words: Uint32Array;
  state: Int32Array;
  mixEntry: (value: number, key: string) => void;
}>;

const SMALL_WORD = 4;

/** The bytes of the two floats and the small word past them. */
const HASHER_BYTES = 24;

/** A tag hashed before a value that may be absent, so an absence never reads as a zero. */
export const ABSENT = 0;
export const PRESENT = 1;

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

/**
 * One step of MurmurHash3's body over the word at `index`. Each step is a bijection of the
 * hash for a fixed word, so two states that differ in one word never meet again.
 */
const mixWordAt = (hasher: Hasher, index: number): void => {
  let k = Math.imul(hasher.words[index] ?? 0, C1);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, C2);

  let h = (hasher.state[0] ?? 0) ^ k;
  h = (h << 13) | (h >>> 19);
  hasher.state[0] = Math.imul(h, 5) + 0xe6546b64;
};

export const mixSmall = (hasher: Hasher, value: number): void => {
  hasher.words[SMALL_WORD] = value;
  mixWordAt(hasher, SMALL_WORD);
};

/** Both words of the float in slot 0. */
export const mixFloat = (hasher: Hasher): void => {
  mixWordAt(hasher, 0);
  mixWordAt(hasher, 1);
};

export const mixText = (hasher: Hasher, text: string | null): void => {
  if (text === null) {
    mixSmall(hasher, ABSENT);

    return;
  }

  mixSmall(hasher, PRESENT);
  mixSmall(hasher, text.length);

  for (let index = 0; index < text.length; index += 1) {
    mixSmall(hasher, text.charCodeAt(index));
  }
};

/** A hasher at the start of a hash. */
export const createHasher = (): Hasher => {
  const buffer = new ArrayBuffer(HASHER_BYTES);
  const floats = new Float64Array(buffer, 0, 2);
  const hasher: Hasher = {
    floats,
    words: new Uint32Array(buffer),
    state: new Int32Array(1),
    mixEntry: (value, key) => {
      mixText(hasher, key);
      floats[0] = value;
      mixFloat(hasher);
    },
  };

  return hasher;
};

/** Starts a hash. */
export const beginHash = (hasher: Hasher): void => {
  hasher.state[0] = 0;
};

/** Whether the two floats in slots 0 and 1 have the same bits, so `-0` and `0` differ and a `NaN` equals itself. */
export const sameFloats = (hasher: Hasher): boolean =>
  hasher.words[0] === hasher.words[2] && hasher.words[1] === hasher.words[3];

/**
 * The hash so far, finished with MurmurHash3's mix and folded to 30 bits, so the value is a
 * small integer the engine never boxes and a log writes it as a plain number.
 */
export const finishHash = (hasher: Hasher): number => {
  let h = hasher.state[0] ?? 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return (h ^ (h >>> 30)) & 0x3fffffff;
};
