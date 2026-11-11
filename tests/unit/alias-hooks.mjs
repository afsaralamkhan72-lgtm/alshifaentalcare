import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = pathToFileURL(process.cwd() + '/')
export async function resolve(specifier, context, next) {
  if (specifier === 'next/headers') return { url: 'data:text/javascript,export const cookies=async()=>({get(){return undefined}});export const headers=async()=>new Map()', shortCircuit: true }
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true }
  if (specifier.startsWith('@/')) {
    const base = new URL(specifier.slice(2), root)
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
      const p = fileURLToPath(base) + ext
      if (existsSync(p) && !p.endsWith('/')) return next(pathToFileURL(p).href, context)
    }
  }
  return next(specifier, context)
}
