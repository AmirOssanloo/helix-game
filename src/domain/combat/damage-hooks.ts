import type { CastRecord } from "../abilities/cast-context";
import { createCastRecord, fillHookCast } from "../abilities/cast-context";
import { runEffects } from "../abilities/effect-runner";
import type { StatusHookRecord } from "../definitions/status-state";
import { amountAtOrbLevel } from "../definitions/status-state";
import type { UnitId } from "../entities/unit";
import type { Unit } from "../entities/unit";
import { STATUS_TABLE_SIZE } from "../entities/unit";
import type { StatusEntry } from "../entities/unit-tables";
import type { World } from "../entities/world-state";

/** Which of a status's two hooks a pass is running, and which ready tick on the row it reads. */
type HookSide = "taken" | "dealt";

/**
 * The hook pass's working memory, world-owned scratch: the context a hook's list runs with,
 * the rows a pass found ready, as indices into the unit's table, so a list that applies a
 * status does not lengthen the pass that ran it, and whether a hook is running. Damage a hook
 * deals runs no hooks, so a hook can neither trigger itself nor ping-pong with another, and
 * the depth an effect list nests to stays bounded. The flag is raised and lowered inside one
 * call, so no tick ever begins with it raised.
 */
export type HookScratch = {
  context: CastRecord;
  ready: number[];
  running: boolean;
};

/** The hook pass's scratch, nothing running. Made once, with the world. */
export const createHookScratch = (): HookScratch => {
  const ready: number[] = [];

  for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
    ready.push(0);
  }

  return { context: createCastRecord(), ready, running: false };
};

const hookOf = (
  record: Readonly<{
    onDamageTaken: StatusHookRecord | null;
    onDamageDealt: StatusHookRecord | null;
  }>,
  side: HookSide,
): StatusHookRecord | null =>
  side === "taken" ? record.onDamageTaken : record.onDamageDealt;

const readyAtTick = (entry: Readonly<StatusEntry>, side: HookSide): number =>
  side === "taken"
    ? entry.damageTakenReadyAtTick
    : entry.damageDealtReadyAtTick;

const startCooldown = (
  entry: StatusEntry,
  side: HookSide,
  tick: number,
): void => {
  if (side === "taken") {
    entry.damageTakenReadyAtTick = tick;

    return;
  }

  entry.damageDealtReadyAtTick = tick;
};

/**
 * The rows of `holder` whose hook on `side` fires for this hit, written into the scratch as
 * indices and counted back. Each one's internal cooldown is started as it is found, so a row
 * is taken once however its list ends, and the rows are read before any list runs, so a
 * status a hook applies waits for the next hit rather than firing for this one.
 */
const collectReady = (world: World, holder: Unit, side: HookSide): number => {
  let found = 0;

  for (let row = 0; row < holder.statuses.length; row += 1) {
    const entry = holder.statuses[row];

    if (entry === undefined || entry.definitionId === null) {
      continue;
    }

    const record = world.run.statuses.get(entry.definitionId);
    const hook = record === undefined ? null : hookOf(record, side);

    if (
      hook === null ||
      world.tick >= entry.endsAtTick ||
      world.tick < readyAtTick(entry, side)
    ) {
      continue;
    }

    startCooldown(
      entry,
      side,
      world.tick + amountAtOrbLevel(hook, entry.orbLevels),
    );
    world.scratch.hooks.ready[found] = row;
    found += 1;
  }

  return found;
};

/** Runs the list of every row the pass found ready, each with the holder's own context. */
const runReady = (
  world: World,
  holder: Unit,
  holderId: UnitId,
  damagedId: UnitId,
  side: HookSide,
  count: number,
): void => {
  for (let slot = 0; slot < count; slot += 1) {
    const row = world.scratch.hooks.ready[slot];
    const entry = row === undefined ? undefined : holder.statuses[row];
    const definitionId = entry === undefined ? null : entry.definitionId;
    const record =
      definitionId === null ? undefined : world.run.statuses.get(definitionId);
    const hook = record === undefined ? null : hookOf(record, side);

    if (entry === undefined || hook === null) {
      continue;
    }

    const cast = fillHookCast(
      world.scratch.hooks.context,
      entry.sourceId ?? holderId,
      entry.orbLevels,
      holder.curr.x,
      holder.curr.y,
      holder.facing,
      damagedId,
    );

    runEffects(world, cast, hook.effects);
  }
};

/** Every hook of one side on one holder: the rows that are ready, then their lists. */
const runSide = (
  world: World,
  holderId: UnitId,
  damagedId: UnitId,
  side: HookSide,
): void => {
  const holder = world.map.units.resolve(holderId);

  if (holder === null || holder.state === "dead") {
    return;
  }

  const count = collectReady(world, holder, side);

  runReady(world, holder, holderId, damagedId, side, count);
};

/**
 * The hooks one damage instance fires, once it has landed: the damaged unit's damage-taken
 * hooks, then the dealing unit's damage-dealt hooks, each at most once per its own internal
 * cooldown and each with the damaged unit as the target of its list. A hook running now fires
 * nothing, so damage a hook deals is the end of the chain.
 *
 * A status whose row has run out but has not been swept yet fires nothing, so a status's last
 * tick is the last hit it answers, whatever order the damage reached it in.
 */
export const runDamageHooks = (
  world: World,
  damagedId: UnitId,
  sourceId: UnitId | null,
): void => {
  const scratch = world.scratch.hooks;

  if (scratch.running) {
    return;
  }

  scratch.running = true;

  runSide(world, damagedId, damagedId, "taken");

  if (sourceId !== null) {
    runSide(world, sourceId, damagedId, "dealt");
  }

  scratch.running = false;
};
