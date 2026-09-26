import type { TuningDef } from "@domain/public";

/**
 * The tuning table: every number the mechanics spec exposes for design to retune, with the
 * spec's default, plus the numbers the architecture exposes for the same reason, all in the
 * designer's units. Speeds are world units per second, durations are seconds, the action cone
 * is a half-angle in degrees, the turn rate is radians per 0.03 s as the spec publishes it,
 * the respawn delay and the corpse delay are seconds, the armour constant is what one point
 * of armour is worth before the curve flattens it, an enemy at rest wanders the wander radius
 * around its spawn point once every wander interval, in seconds, a chasing one asks for a
 * path at most once every re-path interval, in seconds, and a ranged one stands the hold
 * margin inside its reach, in world units, a dormant pack spawns once the hero is inside
 * the activation radius of it, in world units, an elite's and a boss's health are the
 * definition's times the tier's multiplier, read at spawn, and the experience it pays is the
 * definition's times the tier's own experience multiplier, read at its death, the three radii, the two cell sizes, and
 * the three radius classes are world units, the push-out passes and the re-path budget are
 * counts per tick, the hero's push share is the fraction of an overlap with a unit that is not
 * the hero that moves the hero, the rest moving the other, and the orb tables hold what one held instance grants at each level:
 * Quartz health regeneration per second, Whorl a fraction of one of movement speed and a
 * fraction of one off every cooldown that starts while it is held, Ember attack damage.
 * The feedback timings are read by presentation alone, through the world like the rest: how
 * long a hit flash and a refusal flash show, in seconds, how far a damage number rises, in
 * screen pixels, and over how many seconds it rises and fades, how many steps a cooldown
 * wedge sweeps in, at most the wedge sheet's, and the fraction of the distance to the hero
 * the camera closes each frame.
 * The world converts the table into per-tick rates,
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
  push_out_passes: 4,
  hero_push_share: 0.5,
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
  corpse_delay: 1,
  armour_constant: 0.06,
  wander_radius: 64,
  wander_interval: 4,
  chase_repath_interval: 0.5,
  ranged_hold_margin: 50,
  pack_activation_radius: 1600,
  elite_health_multiplier: 3,
  boss_health_multiplier: 10,
  elite_experience_multiplier: 3,
  boss_experience_multiplier: 10,
  hit_flash_duration: 0.133,
  refusal_flash_duration: 0.333,
  damage_number_rise: 56,
  damage_number_fade_duration: 1,
  cooldown_wedge_steps: 64,
  camera_follow_lerp: 0.1,
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
