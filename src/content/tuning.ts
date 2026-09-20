import type { TuningDef } from "@domain/public";

/**
 * The tuning table: every number the mechanics spec exposes for design to retune, with the
 * spec's default, in the designer's units. Speeds are world units per second, durations are
 * seconds, the action cone is a half-angle in degrees, the turn rate is radians per 0.03 s as
 * the spec publishes it, and the Whorl table holds a fraction of one per instance at each
 * level. The world converts the table into per-tick rates, ticks, and radians once at creation,
 * and a `set_tuning` command changes a value mid-session in these same units. A system reads a
 * tunable through the world, never through this file.
 */
export const tuningTable = {
  base_ms: 280,
  ms_min: 100,
  ms_max: 550,
  turn_rate_T: 0.6,
  turn_ramp_ticks: 3,
  action_cone_deg: 11.5,
  arrival_epsilon: 2,
  collision_radius: 27,
  bound_radius: 24,
  sim_hz: 30,
  orb_capacity: 3,
  prepared_slots: 2,
  invoke_cd_base: 7,
  invoke_cd_per_orb_level: 0.3,
  invoke_mana: 7,
  "whorl_ms_per_instance:0": 0.006,
  "whorl_ms_per_instance:1": 0.012,
  "whorl_ms_per_instance:2": 0.018,
  "whorl_ms_per_instance:3": 0.024,
  "whorl_ms_per_instance:4": 0.03,
  "whorl_ms_per_instance:5": 0.036,
  "whorl_ms_per_instance:6": 0.042,
} as const satisfies TuningDef;
