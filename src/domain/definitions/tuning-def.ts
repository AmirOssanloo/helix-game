/** One key per radius class, the array index after the colon: `:0` is the small class, `:1` the hero class, `:2` the large class. */
export type RadiusClassKey = `radius_class:${0 | 1 | 2}`;

/** The array index of an orb level table's entry, written after the colon: `:0` is orb level 1. */
type OrbLevelIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One key per Quartz level: the health regeneration one held Quartz instance adds, per second. */
export type QuartzRegenKey = `quartz_regen_per_instance:${OrbLevelIndex}`;

/** One key per Whorl level: the fraction of movement speed one held Whorl instance adds. */
export type WhorlSpeedKey = `whorl_ms_per_instance:${OrbLevelIndex}`;

/** One key per Ember level: the attack damage one held Ember instance adds. */
export type EmberDamageKey = `ember_damage_per_instance:${OrbLevelIndex}`;

/**
 * The keys of the tuning table: the mechanics spec's parameter names verbatim, so a designer
 * reading the spec finds the same name on the panel and in the input log. A level table is one
 * key per entry with the array index after a colon. A key outside this union is a type error
 * in a tuning command.
 */
export type TuningKey =
  | "base_ms"
  | "ms_min"
  | "ms_max"
  | "turn_rate_T"
  | "turn_ramp_ticks"
  | "action_cone_deg"
  | "arrival_epsilon"
  | "collision_radius"
  | "bound_radius"
  | "selection_radius"
  | "push_out_passes"
  | "repath_budget"
  | "hash_cell_size"
  | "walkability_cell_size"
  | "sim_hz"
  | "orb_capacity"
  | "prepared_slots"
  | "invoke_cd_base"
  | "invoke_cd_per_orb_level"
  | "invoke_mana"
  | RadiusClassKey
  | QuartzRegenKey
  | WhorlSpeedKey
  | EmberDamageKey;

/** The tuning table as content writes it: every key, with its value in the designer's units. */
export type TuningDef = Readonly<Record<TuningKey, number>>;

/**
 * The designer's unit of a tunable. It decides how a value is converted when the table is
 * copied into a world and when a tuning command changes it: a per-second rate becomes a
 * per-tick rate, seconds become whole ticks, degrees become radians, and the turn rate's
 * radians per spec step become radians per tick. Every other unit is read as written.
 */
export type TuningUnit =
  | "count"
  | "world_units"
  | "units_per_second"
  | "seconds"
  | "ticks"
  | "degrees"
  | "radians_per_turn_step"
  | "fraction"
  | "hertz";

/** The unit of every tunable, which is the schema of the table. */
export const TUNING_UNITS: Readonly<Record<TuningKey, TuningUnit>> = {
  base_ms: "units_per_second",
  ms_min: "units_per_second",
  ms_max: "units_per_second",
  turn_rate_T: "radians_per_turn_step",
  turn_ramp_ticks: "ticks",
  action_cone_deg: "degrees",
  arrival_epsilon: "world_units",
  collision_radius: "world_units",
  bound_radius: "world_units",
  selection_radius: "world_units",
  push_out_passes: "count",
  repath_budget: "count",
  hash_cell_size: "world_units",
  walkability_cell_size: "world_units",
  sim_hz: "hertz",
  orb_capacity: "count",
  prepared_slots: "count",
  invoke_cd_base: "seconds",
  invoke_cd_per_orb_level: "seconds",
  invoke_mana: "count",
  "radius_class:0": "world_units",
  "radius_class:1": "world_units",
  "radius_class:2": "world_units",
  "quartz_regen_per_instance:0": "units_per_second",
  "quartz_regen_per_instance:1": "units_per_second",
  "quartz_regen_per_instance:2": "units_per_second",
  "quartz_regen_per_instance:3": "units_per_second",
  "quartz_regen_per_instance:4": "units_per_second",
  "quartz_regen_per_instance:5": "units_per_second",
  "quartz_regen_per_instance:6": "units_per_second",
  "whorl_ms_per_instance:0": "fraction",
  "whorl_ms_per_instance:1": "fraction",
  "whorl_ms_per_instance:2": "fraction",
  "whorl_ms_per_instance:3": "fraction",
  "whorl_ms_per_instance:4": "fraction",
  "whorl_ms_per_instance:5": "fraction",
  "whorl_ms_per_instance:6": "fraction",
  "ember_damage_per_instance:0": "count",
  "ember_damage_per_instance:1": "count",
  "ember_damage_per_instance:2": "count",
  "ember_damage_per_instance:3": "count",
  "ember_damage_per_instance:4": "count",
  "ember_damage_per_instance:5": "count",
  "ember_damage_per_instance:6": "count",
};

/** The Quartz table's keys by level, index zero being level one, so a lookup by level builds no string. */
export const QUARTZ_REGEN_KEYS: readonly QuartzRegenKey[] = [
  "quartz_regen_per_instance:0",
  "quartz_regen_per_instance:1",
  "quartz_regen_per_instance:2",
  "quartz_regen_per_instance:3",
  "quartz_regen_per_instance:4",
  "quartz_regen_per_instance:5",
  "quartz_regen_per_instance:6",
];

/** The Whorl table's keys by level, index zero being level one. */
export const WHORL_SPEED_KEYS: readonly WhorlSpeedKey[] = [
  "whorl_ms_per_instance:0",
  "whorl_ms_per_instance:1",
  "whorl_ms_per_instance:2",
  "whorl_ms_per_instance:3",
  "whorl_ms_per_instance:4",
  "whorl_ms_per_instance:5",
  "whorl_ms_per_instance:6",
];

/** The Ember table's keys by level, index zero being level one. */
export const EMBER_DAMAGE_KEYS: readonly EmberDamageKey[] = [
  "ember_damage_per_instance:0",
  "ember_damage_per_instance:1",
  "ember_damage_per_instance:2",
  "ember_damage_per_instance:3",
  "ember_damage_per_instance:4",
  "ember_damage_per_instance:5",
  "ember_damage_per_instance:6",
];

/** Every key, in the table's order. `Object.keys` forgets the key type; the schema above is what fixes it. */
export const TUNING_KEYS: readonly TuningKey[] = Object.keys(
  TUNING_UNITS,
) as TuningKey[];
