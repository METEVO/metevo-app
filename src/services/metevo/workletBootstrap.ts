/**
 * The plain-script bootstrap that runs inside the Bare worklet before the
 * packed wallet bundle is loaded.
 *
 * Why it exists: bare-pack --linked records native addons as
 * "linked:libNAME.VERSION.so", which the device runtime (bare-kit 0.15.5)
 * resolves against its *compiled-in* addon registry only. The addons the
 * wallet needs (bare-thread, bare-type, sodium-native, the utexo RGB
 * Lightning node, ...) are not compiled into that registry - they are
 * staged as plain .so files in the APK's native library directory by the
 * gradle hook. The runtime happily loads those via file: URLs, so the
 * bootstrap rewrites every linked: reference in the bundle's resolutions
 * to file://<nativeLibraryDir>/... before loading the bundle.
 *
 * Protocol (JSON lines, gateway -> bootstrap):
 *   {"method":"load","params":{"bundle":"<full bundle source>"}}\n
 * bootstrap -> gateway:
 *   {"event":"bootstrap-loaded","libDir":"..."}\n
 *   {"event":"bootstrap-error","message":"..."}\n
 *
 * After a successful load the wallet worklet (loaded from the bundle)
 * attaches its own IPC listener and takes over; this bootstrap keeps its
 * listener attached but inert, so late duplicates of the load frame are
 * ignored instead of double-loading the bundle.
 */
export const WORKLET_BOOTSTRAP_SOURCE = String.raw`
const fs = require('bare-fs')
const { pathToFileURL } = require('bare-url')
const Module = require('bare-module')

const { IPC } = BareKit

let loaded = false

function reply(frame) {
  try {
    IPC.write(JSON.stringify(frame) + '\n')
  } catch {
    /* IPC gone - nothing more we can do */
  }
}

// The worklet thread shares the app process, so its own memory map lists
// every loaded native library with its full path - including libbare-kit.so
// inside the APK's native library directory.
function nativeLibraryDir() {
  const maps = fs.readFileSync('/proc/self/maps', 'utf8')
  const lines = maps.split('\n')
  for (const line of lines) {
    const m = line.match(/(\/data\/app\/[^\s]+\/lib\/arm64)\/[^\s/]+\.so/)
    if (m) return m[1]
  }
  for (const line of lines) {
    const m = line.match(/(\/data\/user\/[^\s]+\/lib\/arm64)\/[^\s/]+\.so/)
    if (m) return m[1]
  }
  throw new Error('could not locate the native library directory from /proc/self/maps')
}

// A bare bundle is "<headerLength>\n<JSON header><blob>", where the length
// includes the newline. Rewriting the header means recomputing the prefix;
// the blob is left untouched.
function rewriteLinkedAddons(source, libDir) {
  const nl = source.indexOf('\n')
  const headerLen = parseInt(source.slice(0, nl), 10)
  const jsonStart = nl + 1

  let depth = 0
  let inString = false
  let escaped = false
  let jsonEnd = -1
  for (let i = jsonStart; i < source.length; i++) {
    const c = source[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
    } else {
      if (c === '"') inString = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          jsonEnd = i + 1
          break
        }
      }
    }
  }
  if (jsonEnd === -1) throw new Error('bundle header is malformed')

  const header = JSON.parse(source.slice(jsonStart, jsonEnd))
  const linked = /^linked:(.+)$/

  let rewritten = 0
  if (header.resolutions) {
    for (const entry of Object.values(header.resolutions)) {
      for (const key of Object.keys(entry)) {
        const value = entry[key]
        if (value !== null && typeof value === 'object' && typeof value.addon === 'string') {
          const m = value.addon.match(linked)
          if (m) {
            entry[key] = { addon: 'file://' + libDir + '/' + m[1] }
            rewritten++
          }
        }
      }
    }
  }
  if (Array.isArray(header.addons)) {
    header.addons = header.addons.map((name) => {
      const m = typeof name === 'string' ? name.match(linked) : null
      if (m) {
        rewritten++
        return 'file://' + libDir + '/' + m[1]
      }
      return name
    })
  }
  if (rewritten === 0) throw new Error('no linked addons found in the bundle')

  const newHeader = JSON.stringify(header)
  return String(newHeader.length + 1) + '\n' + newHeader + source.slice(jsonEnd)
}

let buffer = ''

function onChunk(chunk) {
  buffer += Buffer.from(chunk).toString('utf8')
  let newlineIndex = buffer.indexOf('\n')
  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex)
    buffer = buffer.slice(newlineIndex + 1)
    if (line.length > 0) void handleLine(line)
    newlineIndex = buffer.indexOf('\n')
  }
}

async function handleLine(line) {
  if (loaded) return
  let frame
  try {
    frame = JSON.parse(line)
  } catch {
    return
  }
  if (frame.method !== 'load') return

  try {
    const libDir = nativeLibraryDir()
    const source = rewriteLinkedAddons(frame.params.bundle, libDir)
    Module.loadSync(pathToFileURL('/wallet.bundle'), source, { protocol: module.protocol })
    loaded = true
    reply({ event: 'bootstrap-loaded', libDir })
  } catch (cause) {
    reply({
      event: 'bootstrap-error',
      message: cause instanceof Error ? cause.name + ': ' + cause.message : String(cause),
    })
  }
}

IPC.on('data', onChunk)
`;
