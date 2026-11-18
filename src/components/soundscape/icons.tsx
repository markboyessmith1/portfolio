/* Hand-copied glyphs from the Miro design-system icon set (24px grid,
   currentColor), standing in for IconSpeakerHigh / IconSpeakerCross /
   IconChevronDown. */

type P = { size?: number }

const Svg = ({ size = 24, d }: P & { d: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: 'block' }}>
    <path d={d} fill="currentColor" />
  </svg>
)

export const IconSpeakerHigh = (p: P) => (
  <Svg
    {...p}
    d="M20 12a7.978 7.978 0 0 0-2.667-5.963l1.334-1.49A9.978 9.978 0 0 1 22 12a9.979 9.979 0 0 1-3.333 7.454l-1.334-1.49A7.98 7.98 0 0 0 20 12Zm-4 0c0-.902-.298-1.731-.8-2.4l1.6-1.2A5.979 5.979 0 0 1 18 12a5.98 5.98 0 0 1-1.2 3.601l-1.6-1.2A3.98 3.98 0 0 0 16 12Zm-3-8 1 1v14l-1 1h-2.5l-.707-.293L6.086 16H5a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h1.086l3.707-3.707L10.5 4H13Zm-9 9a1 1 0 0 0 1 1h1.914l4 4H12V6h-1.086l-4 4H5a1 1 0 0 0-1 1v2Z"
  />
)

export const IconSpeakerCross = (p: P) => (
  <Svg
    {...p}
    d="m13 4 1 1v14l-1 1h-2.5l-.707-.293L6.086 16H5a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h1.086l3.707-3.707L10.5 4H13Zm-9 9a1 1 0 0 0 1 1h1.914l4 4H12V6h-1.086l-4 4H5a1 1 0 0 0-1 1v2Zm17.707-2.293L19.914 12.5l1.793 1.793-1.414 1.414-1.793-1.793-1.793 1.793-1.414-1.414 1.793-1.793-1.793-1.793 1.414-1.414 1.793 1.793 1.793-1.793 1.414 1.414Z"
  />
)

export const IconChevronDown = (p: P) => (
  <Svg {...p} d="M6.707 9.293 12 14.586l5.293-5.293 1.414 1.414-6 6h-1.414l-6-6 1.414-1.414Z" />
)
