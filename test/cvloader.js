'use strict';
/* ============================================================================
   cvloader.js - load a CrystalViewer HTML file in Node and expose its
   internal functions for testing.

   The viewer is a single self-contained HTML file whose <script> defines
   everything as top-level globals.  It touches the DOM only when the UI is
   initialised (initUI runs on DOMContentLoaded), so the script BODY can be
   evaluated in Node with a tiny DOM stub.  This loader:

     1. reads the HTML, extracts the single <script> block,
     2. evaluates it in a fresh function scope with a stub document/window
        (so nothing throws during load and the DOMContentLoaded hook is a
        no-op - initUI never runs),
     3. returns an object exposing the internal functions listed in EXPORTS.

   Usage:
       const cv = require('./cvloader').load('crystalviewer_2d_irreps_v2.2.29.html');
       const G  = cv.PG_closure([MX, MY]);
       const id = cv.PG_identifyGroup(G, cv.PG_conjugacyClasses(G).cls,
                                         cv.PG_conjugacyClasses(G).classes);
       assert.equal(id.name, 'C2v');

   Pass a path or an absolute filename.  `load()` also records cv.CV_VERSION
   and cv.CV_BUILD so tests can assert which build they ran against.
   ============================================================================ */

const fs = require('fs');
const path = require('path');

/* Names exposed from the viewer scope.  Keep this list explicit (rather than
   dumping every global) so the harness documents the tested surface and a
   rename in the viewer surfaces as a load-time error here. */
const EXPORTS = [
  // --- symmetry-engine core (PG_*) ---
  'PG_eye', 'PG_mm', 'PG_mT', 'PG_mv', 'PG_det', 'PG_trace', 'PG_key',
  'PG_snap', 'PG_roundM', 'PG_inv3', 'PG_order', 'PG_mClose', 'PG_closureFind',
  'PG_closure', 'PG_conjugacyClasses', 'PG_identifyGroup', 'PG_tableSig',
  'PG_canonicalRotation', 'PG_conjugateGroup', 'PG_repMatrix', 'PG_dimL',
  'PG_decompose', 'PG_salcVectors', 'PG_siteGroupOps', 'PG_planeAdaptedOps',
  'PG_TABLES',
  // --- space-group symbol engine (SG_*) ---
  'SG_parseSymbol', 'SG_generate', 'SG_expectedOrder', 'SG_close', 'SG_key',
  'SG_ckey', 'SG_mm', 'SG_CEN_SUBSETS', 'SG_TGEN', 'SG_PG',
  // --- structure parsing + classification ---
  'parseCIF', 'parseAny', 'parseQE', 'parseMPJSON',
  'classPartition', 'anchorClassId', 'symOpsHash',
  'orbitRelationOf', 'transportSALCCoefs', 'orientedSALCFor',
  'planeNormal', 'buildSlice', 'setHKL', 'reciprocalRows', 'PG_planeAdaptedOps',
  // --- site analysis (needs app state; see cvState below) ---
  'symAnalyze', 'symManifold', 'symClassList',
  // --- app state holders (tests may set these directly) ---
  'S', 'PLANE', 'SYM',
  // --- misc helpers tests may want ---
  'PG_fibDirs', 'PG_Y', 'vdot', 'vsub', 'vlen',
  'FRAC_TOL', 'CV_VERSION', 'CV_BUILD',
];

/* A DOM stub sufficient for the script body to evaluate.  Every method is a
   no-op / empty result; nothing here should ever be exercised by a unit test
   (if it is, that test is really an integration test and belongs elsewhere). */
function makeDomStub() {
  const noop = () => {};
  const classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
  const makeEl = () => ({
    style: {}, classList,
    addEventListener: noop, removeEventListener: noop, appendChild: noop,
    setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    querySelector: () => null, querySelectorAll: () => [],
    getContext: () => null, getBoundingClientRect: () => ({ width: 0, height: 0, left: 0, top: 0 }),
    innerHTML: '', textContent: '', value: '', checked: false, children: [],
    getElementsByClassName: () => [], getElementsByTagName: () => [],
  });
  const document = {
    addEventListener: noop, removeEventListener: noop,
    getElementById: () => null,
    createElement: () => makeEl(),
    createElementNS: () => makeEl(),
    querySelector: () => null, querySelectorAll: () => [],
    documentElement: makeEl(), body: makeEl(), head: makeEl(),
  };
  const window = {
    addEventListener: noop, removeEventListener: noop,
    devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { href: '', search: '' },
  };
  return { document, window };
}

function extractScript(html) {
  /* Match the REAL script block: a <script> tag at the start of a line (the
     viewer puts it alone on its own line).  A bare <script> mentioned inside
     an HTML comment (e.g. documentation text) must NOT be picked up, or the
     capture would start in the comment and run to the real </script>. */
  const m = html.match(/^<script>([\s\S]*?)^<\/script>/m);
  if (!m) throw new Error('cvloader: no <script> block found in the HTML file');
  return m[1];
}

function load(file) {
  const htmlPath = path.resolve(file);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const code = extractScript(html);
  const { document, window } = makeDomStub();
  const noop = () => {};
  const navigator = { userAgent: 'node-cvloader', platform: 'node' };
  const performance = { now: () => Date.now() };

  /* Build the return object defensively: an export that does not exist in
     this build (e.g. a helper introduced after the version under test) is
     returned as undefined instead of throwing a ReferenceError, so the
     harness can test ANY version.  Tests that need a missing symbol should
     assert its presence themselves (see cv.requireExport below). */
  const accessors = EXPORTS.map(n =>
    `try{ __out[${JSON.stringify(n)}] = ${n}; }catch(e){ __out[${JSON.stringify(n)}] = undefined; }`
  ).join('\n');
  const fn = new Function(
    'document', 'window', 'navigator', 'performance',
    'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'location',
    `${code}\n;var __out={};\n${accessors}\n;return __out;`
  );

  const api = fn(
    document, window, navigator, performance,
    noop, noop, window.localStorage, window.location
  );
  if (!api || !api.PG_closure) {
    throw new Error('cvloader: viewer scope did not expose PG_closure (is this a CrystalViewer file?)');
  }
  /* helper for tests: fetch an export or throw a clear message if the build
     under test predates it. */
  api.requireExport = function (name) {
    if (this[name] === undefined) {
      throw new Error(`cvloader: this build (${this.CV_VERSION || '?'}) does not define '${name}'`);
    }
    return this[name];
  };
  api.__file = htmlPath;
  api.__source = html;
  return api;
}

/* Convenience: build a minimal structure object the way the parsers do, for
   tests that want to exercise classPartition / symAnalyze without a full CIF.
   `cell` is [a,b,c] as row vectors (Angstrom); `atoms` is a list of
   {sym, f:[x,y,z]} in fractional coordinates; `symops` is a list of
   {M:3x3, c:[3]} operations. */
function makeStructure(cv, { cell, atoms, symops, rev }) {
  return {
    cell: cell || [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    atoms: (atoms || []).map(a => ({ sym: a.sym, f: a.f.slice() })),
    species: [],
    symops: symops || [],
    rev: (rev === undefined ? 1 : rev),
  };
}

module.exports = { load, makeStructure, EXPORTS };
