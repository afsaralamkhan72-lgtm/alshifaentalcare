/** Chhota .xlsx parhne wala (sirf pehli sheet ka matn). Koi bahari library nahi; browser ka DecompressionStream use hota hai. */

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const buf = new Uint8Array(data).buffer as ArrayBuffer
  const stream = new Blob([buf]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function unzipEntries(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const u8 = new Uint8Array(buf)
  const dv = new DataView(buf)
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Ye Excel file nahi lagti')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = new Map<string, Uint8Array>()
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true)
    const elen = dv.getUint16(p + 30, true)
    const clen = dv.getUint16(p + 32, true)
    const off = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen))
    const lnlen = dv.getUint16(off + 26, true)
    const lelen = dv.getUint16(off + 28, true)
    const start = off + 30 + lnlen + lelen
    const raw = u8.subarray(start, start + csize)
    if (/^xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml)$/.test(name)) out.set(name, method === 0 ? raw : await inflate(raw))
    p += 46 + nlen + elen + clen
  }
  return out
}

const dec = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const colNo = (ref: string) => {
  let n = 0
  for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzipEntries(buf)
  const text = (n: string) => (files.has(n) ? new TextDecoder().decode(files.get(n)!) : '')
  const shared: string[] = []
  for (const m of text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')))
  }
  const sheetName = [...files.keys()].filter((k) => k.startsWith('xl/worksheets/')).sort()[0]
  if (!sheetName) throw new Error('Is file mein koi sheet nahi mili')
  const rows: string[][] = []
  for (const rm of text(sheetName).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1]
      const ref = /r="([A-Z]+[0-9]+)"/.exec(attrs)?.[1]
      const type = /t="(\w+)"/.exec(attrs)?.[1]
      const inner = cm[2] ?? ''
      let val = ''
      if (type === 's') val = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])] ?? ''
      else if (type === 'inlineStr') val = dec([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))
      else val = dec(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '')
      const i = ref ? colNo(ref) : row.length
      while (row.length < i) row.push('')
      row[i] = val.trim()
    }
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x !== ''))
}
