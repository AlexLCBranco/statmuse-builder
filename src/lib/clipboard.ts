/**
 * Copies text, returning whether it worked. The Clipboard API needs a secure
 * page (https or localhost) and permission, so callers must handle `false`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Selects an element's text so the user can press Ctrl/Cmd+C themselves. */
export function selectContents(element: Element): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}
