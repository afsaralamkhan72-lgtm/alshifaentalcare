import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register('./alias-hooks.mjs', import.meta.url)
export const root = pathToFileURL(process.cwd() + '/').href
