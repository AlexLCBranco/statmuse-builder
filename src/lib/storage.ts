/**
 * localStorage that never throws. Reading or writing can fail in private
 * windows, when storage is full or blocked, or when a saved value isn't valid
 * JSON; in every case the app should just carry on without saved data.
 */
export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not saved; the in-memory copy still works for this visit.
  }
}
