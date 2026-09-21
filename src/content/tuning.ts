import type { TuningDef } from "@domain/public";

/**
 * The tuning table: every number the mechanics spec exposes for design to retune, with the
 * spec's default, plus the numbers the architecture exposes for the same reason, all in the
 * designer's units. Speeds are world units per second, durations are seconds, the action cone
 * is a half-angle in degrees, the turn rate is radians per 0.03 s as the spec publishes it,
 * the respawn delay is seconds, the three radii, the two cell sizes, and the three radius classes are world units, the
 * push-out passes and the re-path budget are counts per tick, and the orb tables hold what
 * one held instance grants at each level: Quartz health regeneration per second, Whorl a
 * fraction of one of movement speed and a fraction of one off every cooldown that starts
 * while it is held, Ember attack damage. The world converts the table into per-tick rates,
 * ticks, and radians once at creation, and a `set_tuning` command changes a value
 * mid-session in these same units. A system reads a tunable through the world, never through
 * this file.
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
  selection_radius: 32,
  push_out_passes: 3,
  repath_budget: 8,
  hash_cell_size: 128,
  walkability_cell_size: 32,
  sim_hz: 30,
  orb_capacity: 3,
  prepared_slots: 2,
  invoke_cd_base: 7,
  invoke_cd_per_orb_level: 0.3,
  invoke_mana: 7,
  respawn_delay: 3,
  "radius_class:0": 16,
  "radius_class:1": 27,
  "radius_class:2": 50,
  "quartz_regen_per_instance:0": 1,
  "quartz_regen_per_instance:1": 2,
  "quartz_regen_per_instance:2": 3,
  "quartz_regen_per_instance:3": 4,
  "quartz_regen_per_instance:4": 5,
  "quartz_regen_per_instance:5": 6,
  "quartz_regen_per_instance:6": 7,
  "whorl_ms_per_instance:0": 0.006,
  "whorl_ms_per_instance:1": 0.012,
  "whorl_ms_per_instance:2": 0.018,
  "whorl_ms_per_instance:3": 0.024,
  "whorl_ms_per_instance:4": 0.03,
  "whorl_ms_per_instance:5": 0.036,
  "whorl_ms_per_instance:6": 0.042,
  "whorl_cdr_per_instance:0": 0.01,
  "whorl_cdr_per_instance:1": 0.02,
  "whorl_cdr_per_instance:2": 0.03,
  "whorl_cdr_per_instance:3": 0.04,
  "whorl_cdr_per_instance:4": 0.05,
  "whorl_cdr_per_instance:5": 0.06,
  "whorl_cdr_per_instance:6": 0.07,
  "ember_damage_per_instance:0": 3,
  "ember_damage_per_instance:1": 6,
  "ember_damage_per_instance:2": 9,
  "ember_damage_per_instance:3": 12,
  "ember_damage_per_instance:4": 15,
  "ember_damage_per_instance:5": 18,
  "ember_damage_per_instance:6": 21,
} as const satisfies TuningDef;
