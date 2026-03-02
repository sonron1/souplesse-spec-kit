import fs from 'fs'
import path from 'path'
import { BusinessConfigSchema } from '../validators/settings.schemas'

const CFG_PATH = path.join(process.cwd(), 'server', 'config', 'business.config.json')

let _config: any = null

export function loadConfig() {
  if (_config) return _config
  if (!fs.existsSync(CFG_PATH)) throw new Error('business.config.json not found')
  const raw = fs.readFileSync(CFG_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  const result = BusinessConfigSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Invalid business config: ' + JSON.stringify(result.error.format()))
  }
  _config = result.data
  return _config
}

export function reloadConfig() {
  _config = null
  return loadConfig()
}

export const businessConfig = loadConfig()
