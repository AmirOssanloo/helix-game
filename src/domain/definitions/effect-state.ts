import { assertNever } from "@shared/public";
import type { DamageAreaEffectDef, EffectDef } from "./effect-def";

/** A damage-area entry with a rate per second as a rate per tick at `simHz`: every entry of its table and its per-level term divided once, here. */
const damageAreaPerTick = (
  entry: DamageAreaEffectDef,
  simHz: number,
): DamageAreaEffectDef => {
  const byLevel: number[] = [];

  for (let index = 0; index < entry.amount.byLevel.length; index += 1) {
    byLevel.push((entry.amount.byLevel[index] ?? 0) / simHz);
  }

  return {
    ...entry,
    amount: {
      orb: entry.amount.orb,
      byLevel,
      perLevel: entry.amount.perLevel / simHz,
    },
    rate: "per_tick",
  };
};

/** `entry` with every rate per second in it, and in the lists it carries, converted to a rate per tick. The entry itself when nothing in it names one. */
const entryPerTick = (entry: EffectDef, simHz: number): EffectDef => {
  switch (entry.kind) {
    case "damage_area":
      return entry.rate === "per_second"
        ? damageAreaPerTick(entry, simHz)
        : entry;

    case "spawn_projectile": {
      const onHit = effectsPerTick(entry.onHit, simHz);

      return onHit === entry.onHit ? entry : { ...entry, onHit };
    }

    case "spawn_zone": {
      const onActivate = effectsPerTick(entry.onActivate, simHz);
      const eachTick = effectsPerTick(entry.eachTick, simHz);

      return onActivate === entry.onActivate && eachTick === entry.eachTick
        ? entry
        : { ...entry, onActivate, eachTick };
    }

    case "apply_status":
    case "spawn_unit":
    case "displace":
    case "named":
      return entry;

    default:
      return assertNever(entry);
  }
};

/**
 * An effect list as run scope holds it at `simHz`: every damage rate content wrote per second
 * divided into a rate per tick, at any depth, in a zone's lists and a projectile's hit list
 * alike. Run with the rest of a spell's or a status's conversion, when a world is created and
 * when a tuning command changes one of its numbers, so no primitive divides by the tick rate.
 * A list that names no rate per second comes back as it was, not copied.
 */
export const effectsPerTick = (
  effects: readonly EffectDef[],
  simHz: number,
): readonly EffectDef[] => {
  let converted: EffectDef[] | null = null;

  for (let index = 0; index < effects.length; index += 1) {
    const entry = effects[index];

    if (entry === undefined) {
      continue;
    }

    const next = entryPerTick(entry, simHz);

    if (next !== entry && converted === null) {
      converted = effects.slice(0, index);
    }

    if (converted !== null) {
      converted.push(next);
    }
  }

  return converted ?? effects;
};
