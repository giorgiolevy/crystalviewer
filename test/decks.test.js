'use strict';
/* ============================================================================
   decks.test.js - fixture-driven structural tests over ../decks/*.cif.

   Each deck is paired (in decks.fixtures.js) with the symmetry results it
   SHOULD produce: operation count, atom count, and - for every site class -
   the site-group name and the p-manifold irrep labels.  This is the "drop in
   a structure, pin its expected irreps" layer.

   Run:
       node --test                       # all tests
       node --test decks.test.js         # just the deck fixtures
       CV_FILE=../crystalviewer_2d_irreps_v2.2.27.html node --test decks.test.js

   A fixture may carry an `xfail` note for a known bug: the test then asserts
   the deck does NOT meet its expected values yet, and will FAIL (loudly) once
   the bug is fixed, prompting the fixture to be updated.
   ============================================================================ */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { load } = require('./cvloader');
const FIXTURES = require('./decks.fixtures');

const FILE = process.env.CV_FILE
  ? path.resolve(__dirname, process.env.CV_FILE)
  : path.resolve(__dirname, '..', 'index.html');
const DECKS = path.resolve(__dirname, '..', 'decks');

const cv = load(FILE);

function fracToCart(cell, f) {
  return [
    cell[0][0] * f[0] + cell[1][0] * f[1] + cell[2][0] * f[2],
    cell[0][1] * f[0] + cell[1][1] * f[1] + cell[2][1] * f[2],
    cell[0][2] * f[0] + cell[1][2] * f[1] + cell[2][2] * f[2],
  ];
}

/* The v2.2.29 ITA/Bilbao relabel renamed the 2-D irreps of the cyclic/Abelian
   groups (C3 E1->E, C4h E1g->Eg, C3i E1u->Eu, S4 E1->E, C3 E1->E, ...).  The
   fixtures below use the NEW labels.  On a build that predates the relabel we
   normalise BOTH sides so the structural assertions (ops, atoms, classes,
   site groups) still run, while the p-manifold comparison is done in the
   build's own convention.  This is only a LABEL equivalence; the character
   content is validated separately in tables.test.js. */
/* The v2.2.29 ITA/Bilbao relabel renamed the 2-D irreps of some cyclic/Abelian
   groups (C3 E1->E, C4h E1g->Eg, C3i E1u->Eu, S4 E1->E, ...), but NOT others
   (D4/D2d/C4v already used plain E).  The fixtures below use the NEW labels.
   On a build that predates the relabel the p-manifold LABELS differ for the
   affected groups, so the label assertion is SKIPPED there (the structural
   assertions - ops, atoms, classes, site groups - still run, and the character
   tables themselves are validated label-agnostically in tables.test.js). */
const HAS_ITA_LABELS = !!(cv.PG_TABLES && cv.PG_TABLES['C3'] && cv.PG_TABLES['C3'].irreps['E']);
function labelsMatch(got, expected) {
  const norm = s => (s == null ? null : s.split('+').sort().join('+'));
  return norm(got) === norm(expected);
}
const LABEL_SKIP = !HAS_ITA_LABELS
  ? 'build predates the ITA/Bilbao relabel (v2.2.29); p-manifold labels differ'
  : false;

/* Analyse every site class of a deck on (001) in full mode.
   Returns { ops, atoms, classes:[{cls, group, p}] } in classPartition order. */
function analyseDeck(cv, file) {
  const text = fs.readFileSync(path.join(DECKS, file), 'utf8');
  const st = cv.parseCIF(text, file);
  cv.S.struct = st;
  cv.S.symMode = 'full';
  cv.PLANE.on = true;
  cv.PLANE.n = [0, 0, 1];
  const part = cv.classPartition(st);
  const seen = {};
  const classes = [];
  for (const m of part.map) {
    if (seen[m.cls]) continue;
    seen[m.cls] = 1;
    const at = st.atoms[m.seed];
    const site = { sym: at.sym, cart: fracToCart(st.cell, at.f) };
    const an = cv.symAnalyze(site);
    const group = an ? (an.identC ? an.identC.name : (an.ident ? an.ident.name : null)) : null;
    const man = cv.symManifold(at.sym, 1, site);
    const p = man ? man.parts.map(x => x.irrep).join('+') : null;
    classes.push({ cls: m.cls, group, p });
  }
  return { ops: st.symops.length, atoms: st.atoms.length, classes };
}

/* Analyse the FIRST site class's seed atom with the plane set to (h,k,l), in
   `slab` mode (the UI default: keep only operations that preserve the plane).
   PLANE.n is the Cartesian plane normal computed from the reciprocal lattice,
   exactly as the UI's setHKL/buildSlice does it.  Returns {group, p}. */
function analyseDeckPlane(cv, file, hkl) {
  const text = fs.readFileSync(path.join(DECKS, file), 'utf8');
  const st = cv.parseCIF(text, file);
  cv.S.struct = st;
  cv.S.symMode = 'slab';
  const n = cv.planeNormal(hkl[0], hkl[1], hkl[2]);
  if (!n) throw new Error(`planeNormal(${hkl.join(',')}) returned null for ${file}`);
  cv.PLANE.on = true;
  cv.PLANE.n = n;
  const part = cv.classPartition(st);
  const at = st.atoms[part.map[0].seed];
  const site = { sym: at.sym, cart: fracToCart(st.cell, at.f) };
  const an = cv.symAnalyze(site);
  const group = an ? (an.identC ? an.identC.name : (an.ident ? an.ident.name : null)) : null;
  const man = cv.symManifold(at.sym, 1, site);
  const p = man ? man.parts.map(x => x.irrep).join('+') : null;
  return { group, p };
}

/* -------- one test per deck (readable output, easy to see which deck) ----- */
for (const fx of FIXTURES) {
  const label = `${fx.file} [${fx.symbol}]`;

  if (fx.xfail) {
    test(`KNOWN FAILURE: ${label}`, () => {
      const got = analyseDeck(cv, fx.file);
      // The deck must still parse and classify; only the site analysis is broken.
      assert.equal(got.ops, fx.ops, 'op count (parser) still correct');
      assert.equal(got.atoms, fx.atoms, 'atom count still correct');
      assert.equal(got.classes.length, fx.sites.length, 'class count still correct');
      // Assert it currently FAILS to meet the expected values; when the bug is
      // fixed this flips and the fixture must drop its xfail.
      const met = fx.sites.every((exp, i) => {
        const g = got.classes[i];
        return g && g.group === exp.group && (LABEL_SKIP || labelsMatch(g.p, exp.p));
      });
      assert.ok(!met,
        `xfail resolved! ${fx.file} now matches the expected site groups/irreps; ` +
        `remove the xfail from decks.fixtures.js (reason was: ${fx.xfail})`);
    });
    continue;
  }

  test(label, () => {
    const got = analyseDeck(cv, fx.file);
    assert.equal(got.ops, fx.ops, `operation count for ${fx.file}`);
    assert.equal(got.atoms, fx.atoms, `atom count for ${fx.file}`);
    assert.equal(got.classes.length, fx.sites.length,
      `site-class count for ${fx.file} (got ${got.classes.map(c => c.cls).join(',')})`);
    for (let i = 0; i < fx.sites.length; i++) {
      const exp = fx.sites[i];
      const g = got.classes[i];
      assert.equal(g.cls, exp.cls, `class ${i} label for ${fx.file}`);
      assert.equal(g.group, exp.group,
        `site group of ${exp.cls} in ${fx.file} (${fx.note})`);
      if (!LABEL_SKIP) {
        assert.ok(labelsMatch(g.p, exp.p),
          `p-manifold of ${exp.cls} in ${fx.file}: got ${g.p}, expected ${exp.p} (${fx.note})`);
      }
    }
  });

  /* Plane-adapted expectations (slab mode) for the first site class.  These
     capture the plane-DEPENDENCE of the site group: e.g. corundum in R-axes
     has Al site C3 in full mode, but on (001) the 3-fold axis is not
     perpendicular to the plane so slab mode reduces it to C1, while on (111)
     it stays C3.  The (111) case is exactly the v2.2.29 rhombohedral fix. */
  if (fx.planes) {
    test(`${label} - plane-adapted (slab)`, () => {
      for (const key of Object.keys(fx.planes)) {
        const exp = fx.planes[key];
        const hkl = key.split('').map(Number);
        const got = analyseDeckPlane(cv, fx.file, hkl);
        assert.equal(got.group, exp.group,
          `slab site group of ${fx.file} on (${key}) (${fx.note})`);
        if (!LABEL_SKIP) {
          assert.ok(labelsMatch(got.p, exp.p),
            `slab p-manifold of ${fx.file} on (${key}): got ${got.p}, expected ${exp.p} (${fx.note})`);
        }
      }
    });
  }
}

/* -------- cross-checks that hold for EVERY deck -------- */
test('every deck parses and its op count matches SG_generate(symbol)', () => {
  for (const fx of FIXTURES) {
    const text = fs.readFileSync(path.join(DECKS, fx.file), 'utf8');
    const st = cv.parseCIF(text, fx.file);
    assert.equal(st.atoms.length, fx.atoms, `${fx.file} atom count`);
    const gen = cv.SG_generate(fx.symbol);
    assert.ok(gen, `SG_generate('${fx.symbol}') for ${fx.file}`);
    assert.equal(st.symops.length, gen.ops.length,
      `${fx.file}: parsed ops == generated ops for '${fx.symbol}'`);
  }
});

test('every deck: every atom is assigned exactly one site class', () => {
  for (const fx of FIXTURES) {
    const text = fs.readFileSync(path.join(DECKS, fx.file), 'utf8');
    const st = cv.parseCIF(text, fx.file);
    const part = cv.classPartition(st);
    assert.equal(part.map.length, st.atoms.length, `${fx.file}: one class per atom`);
    for (const m of part.map) assert.ok(m.cls, `${fx.file}: atom has a class label`);
  }
});

test('every deck: each analysed p-manifold has dimension 3 (2l+1 for l=1)', () => {
  for (const fx of FIXTURES) {
    if (fx.xfail) continue; // known-broken deck has no manifold
    const text = fs.readFileSync(path.join(DECKS, fx.file), 'utf8');
    const st = cv.parseCIF(text, fx.file);
    cv.S.struct = st;
    cv.S.symMode = 'full';
    cv.PLANE.on = true;
    cv.PLANE.n = [0, 0, 1];
    const part = cv.classPartition(st);
    const seen = {};
    for (const m of part.map) {
      if (seen[m.cls]) continue;
      seen[m.cls] = 1;
      const at = st.atoms[m.seed];
      const site = { sym: at.sym, cart: fracToCart(st.cell, at.f) };
      const man = cv.symManifold(at.sym, 1, site);
      assert.ok(man, `${fx.file}/${m.cls}: manifold exists`);
      const dim = man.parts.reduce((s, p) => s + p.dim * p.mult, 0);
      assert.equal(Math.round(dim), 3, `${fx.file}/${m.cls}: p-manifold dimension is 3`);
    }
  }
});

/* -------- summary guard: the fixture list and the decks folder agree ----- */
test('every .cif in ../decks has a fixture (and vice versa)', () => {
  const onDisk = fs.readdirSync(DECKS).filter(f => f.endsWith('.cif')).sort();
  const inFixtures = FIXTURES.map(f => f.file).sort();
  assert.deepEqual(inFixtures, onDisk,
    'decks.fixtures.js must cover exactly the .cif files in ../decks');
});
