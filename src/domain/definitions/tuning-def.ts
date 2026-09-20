/** One key per Whorl level, the array index verbatim after the colon: `:0` is Whorl level 1. */
export type WhorlSpeedKey =
  `whorl_ms_per_instance:${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

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
  | "hash_cell_size"
  | "sim_hz"
  | "orb_capacity"
  | "prepared_slots"
  | "invoke_cd_base"
  | "invoke_cd_per_orb_level"
  | "invoke_mana"
  | WhorlSpeedKey;

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
  hash_cell_size: "world_units",
  sim_hz: "hertz",
  orb_capacity: "count",
  prepared_slots: "count",
  invoke_cd_base: "seconds",
  invoke_cd_per_orb_level: "seconds",
  invoke_mana: "count",
  "whorl_ms_per_instance:0": "fraction",
  "whorl_ms_per_instance:1": "fraction",
  "whorl_ms_per_instance:2": "fraction",
  "whorl_ms_per_instance:3": "fraction",
  "whorl_ms_per_instance:4": "fraction",
  "whorl_ms_per_instance:5": "fraction",
  "whorl_ms_per_instance:6": "fraction",
};

/** Every key, in the table's order. `Object.keys` forgets the key type; the schema above is what fixes it. */
export const TUNING_KEYS: readonly TuningKey[] = Object.keys(
  TUNING_UNITS,
) as TuningKey[];
