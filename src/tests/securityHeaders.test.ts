// Guards the Firebase Hosting security headers in `firebase.json`.
//
// The CSP's `script-src` authorizes the inline theme bootstrap in `index.html`
// by SHA-256 hash, so the two files are coupled: editing that <script> without
// updating the header silently blocks it on the deployed site (the app then
// paints light before Chakra restores the stored color mode). Vite copies the
// inline script into `dist/index.html` verbatim — it is never minified — so the
// source file is the right thing to hash.
import { describe, expect, it } from 'vitest'

const files = import.meta.glob(['../../index.html', '../../firebase.json'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Raw file contents for `root/<name>`, independent of the glob key shape. */
function read(name: string): string | undefined {
  return Object.entries(files).find(([path]) => path.endsWith(name))?.[1]
}

type HostingHeader = { key: string; value: string }
type HostingBlock = { source?: string; regex?: string; headers: HostingHeader[] }
interface FirebaseConfig {
  hosting: { headers?: HostingBlock[] }
}

// `firebase.json` is gitignored (see .gitignore and commit dc77543), so a fresh
// clone has no hosting config to check. The guard only runs where the file is
// kept — track it to have these headers verified and deployed everywhere.
const hostingConfig = read('firebase.json')
const config = JSON.parse(hostingConfig ?? '{"hosting":{}}') as FirebaseConfig
const blocks = config.hosting.headers ?? []
const headersOf = (source: string) =>
  blocks.find((block) => block.source === source)?.headers ?? []
const csp = headersOf('**').find((header) => header.key === 'Content-Security-Policy')?.value

/** Base64 SHA-256 of `text`, in the `'sha256-...'` form CSP expects. */
async function sha256Source(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return `sha256-${btoa(binary)}`
}

/**
 * Directive value as a list of sources with the CSP quote syntax removed, e.g.
 * `'self' https://example.com` -> ['self', 'https://example.com'] so callers can
 * compare a bare hash or keyword without re-quoting it.
 */
function cspSources(directive: string): string[] {
  const match = csp?.match(new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]+)`))
  return (match?.[1] ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((source) => source.replace(/^'([^']*)'$/, '$1'))
}

/**
 * Endpoints the app really talks to. Kept in sync with `src/lib/firebase.ts`
 * (App Check), `src/lib/analytics.ts` (GA4), and `VITE_AI_MODELS_URL` (catalog
 * Cloud Function). A new origin belongs here only when the code actually starts
 * calling it.
 */
const ALLOWED_CONNECT_ORIGINS = [
  'https://content-firebaseappcheck.googleapis.com',
  'https://asia-southeast2-token-calculator-43db8.cloudfunctions.net',
  'https://www.googletagmanager.com',
]

/**
 * The ONLY sanctioned wildcards: GA4 routes collect pings through regional
 * subdomains (region1/eu1/...), so Google's documented endpoint set is
 * wildcarded. Scoped to analytics domains only — nothing else earns one.
 */
const ALLOWED_CONNECT_WILDCARDS = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
]

describe.skipIf(hostingConfig === undefined)('firebase.json hosting security headers', () => {
  it('sends the security headers on every route', () => {
    // CSP only ever arrives as a response header, so it must cover the SPA
    // rewrite target (`**`) as well as the real asset paths.
    expect(blocks.map((block) => block.source)).toContain('**')

    const keys = headersOf('**').map((header) => header.key)
    for (const key of [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
    ]) {
      expect(keys, `missing response header: ${key}`).toContain(key)
    }

    // Hosting serves *.web.app itself; a second, weaker HSTS value here would
    // only duplicate Google's preload-grade one. Add it when a custom domain is
    // connected — that is where Hosting sets nothing.
    expect(keys).not.toContain('Strict-Transport-Security')
  })

  it('keeps authorizing the inline theme bootstrap by hash', async () => {
    expect(csp, 'no Content-Security-Policy on the "**" block').toBeTruthy()

    const inlineScript = read('index.html')?.match(/<script>([\s\S]*?)<\/script>/)?.[1]
    expect(inlineScript, 'index.html no longer has the bare inline theme script').toBeTruthy()

    const authorized = await sha256Source(inlineScript as string)
    expect(
      cspSources('script-src'),
      `CSP does not authorize the inline script in index.html. Add '${authorized}' to script-src.`,
    ).toContain(authorized)

    // An inline-script escape hatch would make the hash pointless.
    expect(cspSources('script-src')).not.toContain('unsafe-inline')
  })

  it('pins connect-src to this project instead of Google-wide wildcards', () => {
    const sources = cspSources('connect-src')
    expect(sources.length).toBeGreaterThan(1)

    for (const source of sources) {
      if (source === 'self') continue
      // Wildcards such as https://*.cloudfunctions.net are every project's
      // endpoints: a successful injection could exfil through them. Only the
      // pinned Google-analytics set (ALLOWED_CONNECT_WILDCARDS) is exempt.
      if (source.includes('*.')) {
        expect(
          ALLOWED_CONNECT_WILDCARDS,
          `unexpected connect-src wildcard: ${source}`,
        ).toContain(source)
        continue
      }
      expect(
        ALLOWED_CONNECT_ORIGINS,
        `unexpected connect-src origin: ${source}`,
      ).toContain(source)
    }
  })
})
