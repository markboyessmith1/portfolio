/* The slice of the c26 prototype's canvas palette the soundscape uses: the
   sticky fills it picks from, the board surface and its dot grid, and the
   cursor hues (Miro design-system "new light" values, resolved to hex so no
   token layer is needed here). */

export type StickyColor = { fill: string; text: string };

const DARK_TEXT = '#222428'

export const STICKY_BY_ID: Readonly<Record<string, StickyColor>> = {
  'light-sunshine': { fill: '#FFF79E', text: DARK_TEXT },
  cyan: { fill: '#9CE6FF', text: DARK_TEXT },
  'light-pink': { fill: '#FFD2F2', text: DARK_TEXT },
  lilac: { fill: '#B8ACFB', text: DARK_TEXT },
  teal: { fill: '#81E7DE', text: DARK_TEXT },
  'light-lime': { fill: '#D1F09F', text: DARK_TEXT },
}

export const BOARD_BG_DEFAULT = '#F2F2F2'
export const GRID_DOT_COLOR = '#D2D2D2'

/** Cursor border hues (`--colors-*-cursor-border` in the prototype). */
export const CURSOR = {
  coral: '#C52C2C',
  cyan: '#049BCD',
  sunshine: '#BA8A12',
  lilac: '#7C59DF',
  orange: '#D76F1A',
  teal: '#0A9285',
  lime: '#759F38',
  moss: '#069330',
  ocean: '#4978C0',
  coal: '#888888',
} as const

export const ACTOR_COLOR = {
  ana: CURSOR.coral,
  ben: CURSOR.cyan,
  sidekick: CURSOR.sunshine,
} as const
