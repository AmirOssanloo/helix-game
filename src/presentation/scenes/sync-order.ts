/**
 * The play scene's sync order: each step's place. A step reads what every step before it
 * wrote, so a new one takes a place after what it reads and before what reads it. The gaps
 * leave room for a step between two without renumbering.
 */
export const SYNC_ORDER = {
  camera: 100,
  mapLoad: 200,
  cameraFrame: 300,
  onScreen: 350,
  floor: 400,
  events: 500,
  obstacles: 600,
  checkpoints: 700,
  groundItems: 750,
  zones: 800,
  units: 900,
  outlines: 1000,
  statusIcons: 1100,
  projectiles: 1200,
  orbs: 1300,
  groundItemLabels: 1350,
  numbers: 1400,
  cursor: 1500,
  overlays: 1600,
} as const;
