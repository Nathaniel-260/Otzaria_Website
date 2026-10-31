import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { BROKER_ROOT } from './config.js'

const REPO_ROOT = path.resolve(BROKER_ROOT, '..', '..')

/** מה שהמתווך טוען בזמן ריצה: הקוד, המדיניות, קובץ החבילה, וקובצי האתר ש-pluginSource.js מייבא. */
export const CODE_PATHS = [
  path.join(BROKER_ROOT, 'src'),
  path.join(BROKER_ROOT, 'policy'),
  path.join(BROKER_ROOT, 'package.json'),
  path.join(REPO_ROOT, 'src', 'lib', 'pluginArchive.js'),
  path.join(REPO_ROOT, 'src', 'lib', 'pluginLimits.js'),
]

async function listFiles(entry) {
  let names
  try {
    names = await readdir(entry, { withFileTypes: true })
  } catch (err) {
    if (err?.code === 'ENOTDIR' || err?.code === 'ENOENT') return [entry]
    throw err
  }
  const files = []
  for (const d of names) files.push(...await listFiles(path.join(entry, d.name)))
  return files
}

/** טביעת אצבע של הקוד שבדיסק. קובץ חסר נספר כחסר — כך שגם מחיקה משנה את הטביעה. */
export async function codeFingerprint(paths = CODE_PATHS) {
  const hash = createHash('sha256')
  const files = (await Promise.all(paths.map(listFiles))).flat().sort()
  for (const file of files) {
    hash.update(file).update('\0')
    hash.update(await readFile(file).catch(() => '\u0000missing')).update('\0')
  }
  return hash.digest('hex')
}
