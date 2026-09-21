/** The HUD's colours: every one a tint on a white frame. */

/** Placeholder art: Quartz blue, Whorl purple, Ember orange, by orb index in slot-key order. */
export const ORB_TINTS: readonly number[] = [0x6fb7ff, 0xb388ff, 0xff7a45];
export const UNKNOWN_ORB_TINT = 0xffffff;

/** The tint of orb `orb`, white for an index no orb has. */
export const orbTint = (orb: number): number =>
  ORB_TINTS[orb] ?? UNKNOWN_ORB_TINT;

export const WHITE = 0xffffff;
export const BACKDROP_TINT = 0x101010;
export const SOCKET_TINT = 0x5a5a5a;
export const COMPOSER_TINT = 0xe0c060;
export const KEY_LABEL_TINT = 0xffffff;
export const DIMMED_TINT = 0x404040;
export const WEDGE_TINT = 0x000000;
export const HEALTH_TINT = 0x4caf50;
export const MANA_TINT = 0x3f7fff;
export const EXPERIENCE_TINT = 0xffd166;
export const MARKER_TINT = 0xffd166;
export const FLASH_MANA_TINT = 0xff3030;
export const FLASH_COOLDOWN_TINT = 0x9a9a9a;
export const FLASH_DISABLE_TINT = 0xffffff;
export const FLASH_REFUSED_TINT = 0xffffff;

export const OPAQUE = 1;
export const BACKDROP_ALPHA = 0.7;
export const WEDGE_ALPHA = 0.6;
export const FLASH_ALPHA = 0.7;
export const GREYED_ALPHA = 0.35;
