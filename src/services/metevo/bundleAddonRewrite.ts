/**
 * Rewrites the linked: addon references of a packed bare bundle to file:
 * URLs inside the app's native library directory.
 *
 * Why: bare-pack --linked records addons as "linked:libNAME.VERSION.so",
 * which the device runtime (react-native-bare-kit) resolves only against
 * addons compiled into its own registry. The addons the wallet needs are
 * staged as plain .so files in the APK (see the gradle staging hook) and
 * are loadable via file: URLs. The native library directory is resolved
 * by scripts/push-device-config.cjs from the package manager and rides
 * the provisioned device config.
 *
 * A bare bundle is "<headerLength>\n<JSON header><blob>", where the
 * length includes the newline. Only the header changes, so the prefix is
 * recomputed and the blob is passed through untouched.
 */

const LINKED_ADDON_PATTERN = /^linked:(.+)$/

export type BundleAddonRewriteError = Error

/** The number of addons that were rewritten to file: URLs. */
export function rewriteLinkedAddons(
  bundleSource: string,
  nativeLibraryDir: string,
): { source: string; rewritten: number } {
  const newlineIndex = bundleSource.indexOf('\n')
  if (newlineIndex === -1) {
    throw new Error('the worklet bundle is malformed: no header length')
  }
  const jsonStart = newlineIndex + 1

  // Locate the end of the header JSON with a brace scan (the header
  // contains string escapes, so a naive search is not enough).
  let depth = 0
  let inString = false
  let escaped = false
  let jsonEnd = -1
  for (let i = jsonStart; i < bundleSource.length; i += 1) {
    const c = bundleSource[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (c === '\\') {
        escaped = true
      } else if (c === '"') {
        inString = false
      }
    } else if (c === '"') {
      inString = true
    } else if (c === '{') {
      depth += 1
    } else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        jsonEnd = i + 1
        break
      }
    }
  }
  if (jsonEnd === -1) {
    throw new Error('the worklet bundle is malformed: unterminated header')
  }

  let header: {
    resolutions?: Record<string, Record<string, unknown>>
    addons?: unknown[]
  }
  try {
    header = JSON.parse(bundleSource.slice(jsonStart, jsonEnd))
  } catch {
    throw new Error('the worklet bundle is malformed: invalid header JSON')
  }

  const toFileUrl = (name: string): string => {
    const match = name.match(LINKED_ADDON_PATTERN)
    return match === null
      ? name
      : `file://${nativeLibraryDir.replace(/\/$/, '')}/${match[1]}`
  }

  let rewritten = 0
  if (header.resolutions !== undefined) {
    for (const entry of Object.values(header.resolutions)) {
      for (const key of Object.keys(entry)) {
        const value = entry[key]
        if (
          value !== null &&
          typeof value === 'object' &&
          typeof (value as { addon?: unknown }).addon === 'string'
        ) {
          const addonName = (value as { addon: string }).addon
          if (LINKED_ADDON_PATTERN.test(addonName)) {
            entry[key] = { addon: toFileUrl(addonName) }
            rewritten += 1
          }
        }
      }
    }
  }
  if (Array.isArray(header.addons)) {
    header.addons = header.addons.map((name) => {
      if (typeof name === 'string' && LINKED_ADDON_PATTERN.test(name)) {
        rewritten += 1
        return toFileUrl(name)
      }
      return name
    })
  }
  if (rewritten === 0) {
    throw new Error(
      'the worklet bundle references no linked addons; it needs repacking',
    )
  }

  const newHeader = JSON.stringify(header)
  const source =
    String(newHeader.length + 1) +
    '\n' +
    newHeader +
    bundleSource.slice(jsonEnd)
  return { source, rewritten }
}
