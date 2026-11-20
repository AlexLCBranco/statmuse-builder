/**
 * The web fonts the page draws with (the same list as the Google Fonts link
 * in index.html). Drawing before they arrive means drawing in a stand-in
 * font and then jumping when the real one lands: chips change width and wrap
 * differently. So the first paint waits for them, but never long.
 */
const FACES = [
  '600 1em "Barlow Condensed"',
  '800 1em "Barlow Condensed"',
  '400 1em "IBM Plex Sans"',
  '500 1em "IBM Plex Sans"',
  '600 1em "IBM Plex Sans"',
  '400 1em "IBM Plex Mono"',
]

/** The longest the first paint waits. A slow or blocked font server never holds the page back for more. */
const MAX_WAIT_MS = 1200

/** Resolves when the fonts are in (at once when cached), or after `maxMs`. Never rejects. */
export function fontsReady(maxMs = MAX_WAIT_MS): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  const loaded = Promise.all(FACES.map((face) => document.fonts.load(face))).then(
    () => undefined,
    () => undefined,
  )
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, maxMs))
  return Promise.race([loaded, timeout])
}
