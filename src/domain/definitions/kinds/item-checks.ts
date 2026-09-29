import { INVENTORY_COLUMNS, INVENTORY_ROWS } from "../item-base-def";
import type { RegistryFault } from "../registry-checks";

/** Refuses a level below one at `path`: an item level, a quality or affix level, or a requirement starts at one. */
export const checkLevel = (
  faults: RegistryFault[],
  file: string,
  path: string,
  level: number,
): void => {
  if (level < 1) {
    faults.push({ file, path, message: "expected a level of 1 or more" });
  }
};

/** Refuses a range whose least value is above its greatest, at the greatest. */
export const checkRange = (
  faults: RegistryFault[],
  file: string,
  path: string,
  min: number,
  max: number,
): void => {
  if (min > max) {
    faults.push({
      file,
      path,
      message: `expected no less than the least value, ${String(min)}`,
    });
  }
};

/** Refuses a chance above one at `path`: a chance is a fraction of one. */
export const checkChance = (
  faults: RegistryFault[],
  file: string,
  path: string,
  chance: number,
): void => {
  if (chance > 1) {
    faults.push({
      file,
      path,
      message: "expected a chance no greater than 1",
    });
  }
};

/** Refuses a size at `path` outside one cell to `limit`, the inventory's extent that way. */
export const checkExtent = (
  faults: RegistryFault[],
  file: string,
  path: string,
  cells: number,
  limit: number,
): void => {
  if (cells < 1 || cells > limit) {
    faults.push({
      file,
      path,
      message: `expected 1 to ${String(limit)} cells, to fit the ${String(INVENTORY_COLUMNS)} by ${String(INVENTORY_ROWS)} inventory`,
    });
  }
};
