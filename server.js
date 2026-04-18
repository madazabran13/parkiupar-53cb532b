import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway:8080';

const app = express();

// ── Security headers ─────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// ── API proxy → gateway ──────────────────────────────────
app.use(
  '/api',
  createProxyMiddleware({
    target: GATEWAY_URL,
    changeOrigin: true,
  }),
);

// ── Static assets from client build ─────────────────────
const clientDist = path.resolve(__dirname, 'dist/client');
app.use(
  express.static(clientDist, {
    maxAge: '1y',
    immutable: true,
    index: false, // let SSR handle HTML
  }),
);

// ── SSR ──────────────────────────────────────────────────
const templatePath = path.resolve(clientDist, 'index.html');
const ssrEntryPath = path.resolve(__dirname, 'dist/ssr/entry-server.js');

// Browser-globals shim for SSR.
// Libraries like Leaflet, Framer-Motion, etc. access browser globals at module-load time.
if (typeof globalThis.window === 'undefined') {
  const noop = () => {};
  const noopEl = () => ({ style: {}, classList: { add: noop, remove: noop, contains: () => false }, setAttribute: noop, getAttribute: () => null });
  const doc = {
    createElement: noopEl,
    createElementNS: noopEl,
    createTextNode: (text) => ({ nodeValue: text, textContent: text }),
    createComment: (text) => ({ nodeValue: text }),
    createDocumentFragment: () => ({ appendChild: noop, childNodes: [] }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByTagName: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    body: { appendChild: noop, removeChild: noop, style: {}, classList: { add: noop, remove: noop } },
    head: { appendChild: noop },
    documentElement: { style: {}, classList: { add: noop, remove: noop, contains: () => false }, lang: 'es' },
  };
  globalThis.window = globalThis;
  globalThis.document = doc;
  globalThis.navigator = { userAgent: 'node', platform: 'node', language: 'es' };
  globalThis.location = { href: '/', pathname: '/', search: '', hash: '', origin: 'http://localhost', hostname: 'localhost', protocol: 'http:' };
  globalThis.self = globalThis;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.matchMedia = () => ({ matches: false, addListener: noop, removeEventListener: noop });
  globalThis.getComputedStyle = () => ({});
  globalThis.ResizeObserver = class { observe = noop; unobserve = noop; disconnect = noop; };
  globalThis.MutationObserver = class { observe = noop; disconnect = noop; takeRecords = () => []; };
  globalThis.IntersectionObserver = class { observe = noop; unobserve = noop; disconnect = noop; };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop };
  globalThis.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop };
  globalThis.CustomEvent = class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } };
  globalThis.Event = class Event { constructor(type) { this.type = type; } };
}

let template;
let renderFn;

try {
  template = fs.readFileSync(templatePath, 'utf-8');
  const { render } = await import(ssrEntryPath);
  renderFn = render;
  console.log('[frontend] SSR mode active');
} catch (err) {
  console.warn('[frontend] SSR bundle failed to load — falling back to CSR:', err.message);
  template = fs.readFileSync(templatePath, 'utf-8');
  renderFn = () => ''; // CSR fallback: serve empty shell, client takes over
}

app.get('*', (req, res) => {
  try {
    const appHtml = renderFn(req.originalUrl);
    const html = template.replace('<!--ssr-outlet-->', appHtml);
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (err) {
    console.error('[SSR] Render error:', err);
    // Fallback: send template as-is so client takes over
    res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
  }
});

app.listen(PORT, () => {
  console.log(`[frontend] SSR server listening on port ${PORT}`);
});
