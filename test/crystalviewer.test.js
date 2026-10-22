'use strict';
/* ============================================================================
   crystalviewer.test.js - unit tests for the CrystalViewer symmetry engine.

   Run:
       node --test test/crystalviewer.test.js
   or:
       node test/crystalviewer.test.js          (same, node:test runs standalone)

   Point the suite at a specific build with an env var (default: v2.2.29):
       CV_FILE=../crystalviewer_2d_irreps_v2.2.27.html node --test test/

   The suite exercises the physics/maths surface (point groups, space-group
   symbols, decomposition, SALCs, class partition, CIF parsing and site
   analysis).  It does NOT touch the DOM/WebGL; the loader stubs those out.

   IMPORTANT: expected values here were VALIDATED against the viewer's own
   output and, where noted, against textbook character tables / ITA orders.
   Do not "fix" a test by pasting whatever the code returns - if a value
   changes, decide which is right first.
   ============================================================================ */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { load, makeStructure } = require('./cvloader');

const FILE = process.env.CV_FILE
  ? path.resolve(__dirname, process.env.CV_FILE)
  : path.resolve(__dirname, '..', 'index.html');

const cv = load(FILE);

/* ------------------------------------------------------------------ helpers */
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const MX = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];   // mirror x -> -x
const MY = [[1, 0, 0], [0, -1, 0], [0, 0, 1]];   // mirror y -> -y
const MZ = [[1, 0, 0], [0, 1, 0], [0, 0, -1]];   // mirror z -> -z
const INV = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]];
const C2Z = MZ;                                  // 2-fold about z == mirror z for a 2-op group
const C4Z = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
const C3Z = [[-0.5, -Math.sqrt(3) / 2, 0], [Math.sqrt(3) / 2, -0.5, 0], [0, 0, 1]];
const MYZ = MX;                                  // vertical mirror containing z

function closureOf(gens) { return cv.PG_closure(gens); }

function identify(gens) {
  const G = cv.PG_closure(gens);
  const cc = cv.PG_conjugacyClasses(G);
  const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
  return { G, cc, id, order: G ? G.length : 0, name: id ? id.name : null };
}

function fracToCart(cell, f) {
  return [
    cell[0][0] * f[0] + cell[1][0] * f[1] + cell[2][0] * f[2],
    cell[0][1] * f[0] + cell[1][1] * f[1] + cell[2][1] * f[2],
    cell[0][2] * f[0] + cell[1][2] * f[1] + cell[2][2] * f[2],
  ];
}

/* A cubic Fm-3m rocksalt deck (the bundled demo).  192 ops, 8 atoms, one Na
   class and one Cl class. */
const NACL_CIF = `data_NaCl
_cell_length_a 5.64
_cell_length_b 5.64
_cell_length_c 5.64
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_symmetry_space_group_name_H-M 'F m -3 m'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Na1 Na 0.0 0.0 0.0
Cl1 Cl 0.5 0.5 0.5
`;

function withNaClState() {
  const st = cv.parseCIF(NACL_CIF, 'NaCl');
  cv.S.struct = st;
  cv.S.symMode = 'slab';
  cv.PLANE.on = true;
  cv.PLANE.n = [0, 0, 1];
  return st;
}

/* ==========================================================================
   SUITE 1 - point-group identification
   Expected names/orders are textbook.  Generator sets are chosen so that
   closure gives exactly the intended group (a lone mirror is Cs, not C2;
   three orthogonal mirrors close to D2h, not D2 - both are correct).
   ========================================================================== */
test('build tag is exposed', () => {
  assert.match(cv.CV_VERSION, /^\d+\.\d+\.\d+/);
  assert.ok(cv.CV_BUILD && cv.CV_BUILD.length > 0);
});

test('point group: trivial / Abelian / orthorhombic', () => {
  const cases = [
    [[I3], 'C1', 1],
    [[INV], 'Ci', 2],
    [[MX], 'Cs', 2],          // a single mirror IS Cs
    [[MZ, INV], 'C2h', 4],
    [[MX, MY], 'C2v', 4],
    [[MX, MY, MZ], 'D2h', 8], // 3 mirrors already close to D2h
    [[MX, MY, MZ, INV], 'D2h', 8],
  ];
  for (const [gens, name, order] of cases) {
    const r = identify(gens);
    assert.equal(r.order, order, `order for ${name}`);
    assert.equal(r.name, name, `identify for ${name}`);
  }
});

test('point group: tetragonal and cubic', () => {
  const cases = [
    [[C4Z], 'C4', 4],
    [[C4Z, MX], 'C4v', 8],
    [[C4Z, INV], 'C4h', 8],
    [[C4Z, MX, MY, INV], 'D4h', 16],
    [[C4Z, MX, INV, [[0, 0, 1], [1, 0, 0], [0, 1, 0]]], 'Oh', 48],
  ];
  for (const [gens, name, order] of cases) {
    const r = identify(gens);
    assert.equal(r.order, order, `order for ${name}`);
    assert.equal(r.name, name, `identify for ${name}`);
  }
});

test('point group: trigonal / hexagonal', () => {
  const cases = [
    [[C3Z], 'C3', 3],
    [[C3Z, MYZ], 'C3v', 6],
    [[C3Z, MYZ, [[1, 0, 0], [0, 1, 0], [0, 0, -1]]], 'D3h', 12],
    [[C3Z, INV], 'C3i', 6],
  ];
  for (const [gens, name, order] of cases) {
    const r = identify(gens);
    assert.equal(r.order, order, `order for ${name}`);
    assert.equal(r.name, name, `identify for ${name}`);
  }
});

test('PG_closure dedupes and closes', () => {
  const G = closureOf([MX, MY]);
  // C2v has 4 elements; feeding a redundant generator must not grow it
  const G2 = closureOf([MX, MY, cv.PG_mm(MX, MY)]);
  assert.equal(G.length, 4);
  assert.equal(G2.length, 4);
  // every element's inverse is present (group property)
  for (const A of G) {
    const inv = cv.PG_inv3(A);
    assert.ok(G.some(B => cv.PG_key(B) === cv.PG_key(inv)), 'inverse present');
  }
});

test('PG_conjugacyClasses: C2v has 4 singleton classes', () => {
  const G = closureOf([MX, MY]);
  const cc = cv.PG_conjugacyClasses(G);
  assert.equal(cc.classes.length, 4);
  for (const cl of cc.classes) assert.equal(cl.length, 1);
});

test('PG_conjugacyClasses: D4h has 10 classes (true inverse, not transpose)', () => {
  const G = closureOf([C4Z, MX, MY, INV]);
  const cc = cv.PG_conjugacyClasses(G);
  assert.equal(cc.classes.length, 10);
  // class sizes of D4h: 1,1,2,2,1,1,2,2,1,1 (sums to 16)
  const total = cc.classes.reduce((s, c) => s + c.length, 0);
  assert.equal(total, 16);
});

/* ==========================================================================
   SUITE 2 - character-table / decomposition sanity
   ========================================================================== */
test('PG_decompose: p manifold (l=1) in Oh is T1u', () => {
  const G = closureOf([C4Z, MX, INV, [[0, 0, 1], [1, 0, 0], [0, 1, 0]]]);
  const cc = cv.PG_conjugacyClasses(G);
  const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
  assert.equal(id.name, 'Oh');
  const dec = cv.PG_decompose(G, cc.cls, cc.classes, id, 1);
  const nonzero = dec.parts.filter(p => Math.round(p.mult) > 0).map(p => p.name);
  assert.deepEqual(nonzero, ['T1u']);
});

test('PG_decompose: d manifold (l=2) in Oh is Eg + T2g', () => {
  const G = closureOf([C4Z, MX, INV, [[0, 0, 1], [1, 0, 0], [0, 1, 0]]]);
  const cc = cv.PG_conjugacyClasses(G);
  const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
  const dec = cv.PG_decompose(G, cc.cls, cc.classes, id, 2);
  // Multiplicities are projection traces / |G|, so absent irreps come back as
  // ~1e-15 noise rather than exactly 0.  Round before filtering.
  const nonzero = dec.parts.filter(p => Math.round(p.mult) > 0).map(p => p.name).sort();
  assert.deepEqual(nonzero, ['Eg', 'T2g']);
  // and the multiplicity of each really is an integer once rounded
  for (const p of dec.parts) {
    assert.ok(Math.abs(p.mult - Math.round(p.mult)) < 1e-9, `mult near-integer for ${p.name}`);
  }
});

test('PG_decompose: s manifold (l=0) is always the totally symmetric irrep', () => {
  for (const gens of [[MX, MY], [C4Z, MX], [C3Z, MYZ]]) {
    const G = closureOf(gens);
    const cc = cv.PG_conjugacyClasses(G);
    const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
    const dec = cv.PG_decompose(G, cc.cls, cc.classes, id, 0);
    const nonzero = dec.parts.filter(p => Math.round(p.mult) > 0);
    assert.equal(nonzero.length, 1, 's manifold splits into exactly one irrep');
    assert.equal(nonzero[0].dim, 1, 'and it is 1-dimensional');
  }
});

test('PG_decompose: multiplicities are integers summing to 2l+1', () => {
  for (const l of [0, 1, 2, 3]) {
    const G = closureOf([C4Z, MX, MY, INV]); // D4h
    const cc = cv.PG_conjugacyClasses(G);
    const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
    const dec = cv.PG_decompose(G, cc.cls, cc.classes, id, l);
    let total = 0;
    for (const p of dec.parts) {
      const m = Math.round(p.mult);            // traces carry ~1e-15 noise
      assert.ok(Math.abs(p.mult - m) < 1e-9, `mult near-integer for l=${l}`);
      assert.ok(m >= 0, `mult non-negative for l=${l}`);
      total += m * p.dim;
    }
    assert.equal(total, 2 * l + 1, `dimension sum for l=${l}`);
  }
});

/* ==========================================================================
   SUITE 3 - space-group symbol generation
   Expected op counts are the ITA general-position multiplicities.
   ========================================================================== */
test('SG_generate: op counts match ITA general positions', () => {
  const cases = [
    ['P 1', 1],
    ['P -1', 2],
    ['P 2/m', 4],
    ['P m m m', 8],
    ['P 4/m m m', 16],
    ['P m -3 m', 48],
    ['F m -3 m', 192],
    ['P 6/m m m', 24],
    ['P 2_1/c', 4],
    ['R -3 m', 36],
  ];
  for (const [sym, order] of cases) {
    const g = cv.SG_generate(sym);
    assert.ok(g, `SG_generate('${sym}') returned a group`);
    assert.equal(g.ops.length, order, `op count for ${sym}`);
  }
});

test('SG_generate: closure is a group (identity present, inverses present)', () => {
  const g = cv.SG_generate('F m -3 m');
  assert.equal(g.ops.length, 192);
  const I = cv.PG_key(I3);
  assert.ok(g.ops.some(o => cv.PG_key(o.M) === I && o.c[0] === 0 && o.c[1] === 0 && o.c[2] === 0),
    'identity operation present');
});

test('SG_expectedOrder agrees with generated order for the supported set', () => {
  const syms = ['P 1', 'P -1', 'P m m m', 'P 4/m m m', 'P m -3 m', 'F m -3 m', 'P 6/m m m', 'P 2_1/c'];
  for (const s of syms) {
    const exp = cv.SG_expectedOrder(s);
    const g = cv.SG_generate(s);
    if (exp != null && g) {
      assert.equal(g.ops.length, exp, `expected order for ${s}`);
    }
  }
});

test('SG_parseSymbol: centring and point group split', () => {
  const ps = cv.SG_parseSymbol('F m -3 m');
  assert.equal(ps.centring, 'F');
  assert.equal(ps.pointGroup, 'm-3m');
});

/* ==========================================================================
   SUITE 4 - CIF parsing and site-class partition
   ========================================================================== */
test('parseCIF: Fm-3m rocksalt expands to 8 atoms / 192 ops', () => {
  const st = cv.parseCIF(NACL_CIF, 'NaCl');
  assert.equal(st.atoms.length, 8);
  assert.equal(st.symops.length, 192);
  const syms = new Set(st.atoms.map(a => a.sym));
  assert.deepEqual([...syms].sort(), ['Cl', 'Na']);
});

test('classPartition: rocksalt has one Na class and one Cl class', () => {
  const st = cv.parseCIF(NACL_CIF, 'NaCl');
  const part = cv.classPartition(st);
  const labels = [...new Set(part.map.map(m => m.cls))].sort();
  assert.deepEqual(labels, ['Cl#1', 'Na#1']);
  // 4 atoms of each
  const counts = {};
  for (const m of part.map) counts[m.cls] = (counts[m.cls] || 0) + 1;
  assert.equal(counts['Na#1'], 4);
  assert.equal(counts['Cl#1'], 4);
});

test('classPartition: every atom is assigned a class', () => {
  const st = cv.parseCIF(NACL_CIF, 'NaCl');
  const part = cv.classPartition(st);
  assert.equal(part.map.length, st.atoms.length);
  for (const m of part.map) assert.ok(m.cls, 'atom has a class label');
});

/* ==========================================================================
   SUITE 5 - site analysis (needs app state; set it up explicitly)
   ========================================================================== */
test('symAnalyze: Na site on (001) of rocksalt is D4h', () => {
  const st = withNaClState();
  const site = { sym: 'Na', cart: fracToCart(st.cell, [0, 0, 0]) };
  const an = cv.symAnalyze(site);
  assert.ok(an, 'analysis returned');
  assert.equal(an.siteCls, 'Na#1');
  const name = an.identC ? an.identC.name : (an.ident ? an.ident.name : null);
  assert.equal(name, 'D4h');
});

test('symManifold: Na p on (001) splits as A2u + Eu', () => {
  const st = withNaClState();
  const site = { sym: 'Na', cart: fracToCart(st.cell, [0, 0, 0]) };
  const man = cv.symManifold('Na', 1, site);
  assert.ok(man, 'manifold returned');
  const irreps = man.parts.map(p => p.irrep).sort();
  assert.deepEqual(irreps, ['A2u', 'Eu']);
  // dimensions: A2u is 1, Eu is 2 -> total 3 = 2l+1 for l=1
  const dims = man.parts.reduce((s, p) => s + p.dim * p.mult, 0);
  assert.equal(dims, 3);
});

/* ==========================================================================
   SUITE 6 - point-group table round-trip via SG_generate.
   For orthorhombic/tetragonal/cubic space groups the lattice is Cartesian,
   so the distinct rotation parts of the generated operations ARE the point
   group in Cartesian form.  Closing them and identifying must reproduce the
   point group named in the space-group symbol.  (Trigonal/hexagonal symbols
   act on fractional hex coordinates and cannot be identified this way - see
   the D6h integration test below, which goes through the cell.)
   ========================================================================== */
test('SG_generate point parts identify to the expected point group', () => {
  const cases = [
    ['P 2/m', 'C2h'],
    ['P m m 2', 'C2v'],
    ['P m m m', 'D2h'],
    ['P 4 2 2', 'D4'],
    ['P -4 2 m', 'D2d'],
    ['P 4/m m m', 'D4h'],
    ['P m -3 m', 'Oh'],
  ];
  for (const [sym, expect] of cases) {
    const g = cv.SG_generate(sym);
    assert.ok(g, `generated ${sym}`);
    const seen = {};
    const pointOps = [];
    for (const o of g.ops) {
      const k = cv.PG_key(o.M);
      if (!seen[k]) { seen[k] = 1; pointOps.push(o.M); }
    }
    const G = cv.PG_closure(pointOps);
    const cc = cv.PG_conjugacyClasses(G);
    const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
    assert.ok(id, `identified point group of ${sym}`);
    assert.equal(id.name, expect, `point group of ${sym}`);
  }
});

/* ==========================================================================
   SUITE 7 - hexagonal / trigonal site analysis (the D6h path, which needs the
   non-orthogonal cell: raw hex fractional generators cannot be identified in
   Cartesian, so this is an end-to-end test through parseCIF + symAnalyze).
   ========================================================================== */
const HEX_CIF = `data_Hex
_cell_length_a 3.0
_cell_length_b 3.0
_cell_length_c 5.0
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 120
_symmetry_space_group_name_H-M 'P 6/m m m'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
X1 X 0.0 0.0 0.0
`;

test('hexagonal: P6/mmm origin site is D6h', () => {
  const st = cv.parseCIF(HEX_CIF, 'hex');
  assert.equal(st.symops.length, 24, 'P6/mmm has 24 operations');
  cv.S.struct = st;
  cv.S.symMode = 'full';
  cv.PLANE.on = true;
  cv.PLANE.n = [0, 0, 1];
  const site = { sym: 'X', cart: [0, 0, 0] };
  const an = cv.symAnalyze(site);
  assert.ok(an, 'analysis returned');
  const name = an.identC ? an.identC.name : (an.ident ? an.ident.name : null);
  assert.equal(name, 'D6h');
});

/* ==========================================================================
   SUITE 8 - non-orthogonal-cell site groups (rhombohedral axes).
   The site-group rotations R = A M A^-1 are irrational here; PG_closure and
   PG_order must compare by tolerance (PG_mClose), not exact snapped keys, or
   the closure never terminates and the site group is lost.  Regression for
   the v2.2.29 fix; the corundum R-axes deck (t04) is the end-to-end case.
   ========================================================================== */
const HAS_MCLOSE = typeof cv.PG_mClose === 'function';

test('PG_mClose: tolerance comparison of rotations', { skip: !HAS_MCLOSE ? 'build predates the PG_mClose fix (v2.2.29)' : false }, () => {
  const A = [[0.5699968, 0.2983039, 0.7655838],
             [0.8216469, -0.2069408, -0.5311044],
             [0.0, 0.9317673, -0.3630560]];
  const B = [[0.569996827, 0.2983039, 0.7655838],
             [0.8216469, -0.2069408, -0.5311044],
             [0.0, 0.9317673, -0.3630560]];
  assert.ok(cv.PG_mClose(A, B), 'near-equal rotations are close');
  assert.ok(!cv.PG_mClose(A, cv.PG_eye()), 'a rotation is not close to the identity');
});

test('PG_order: a 3-fold rotation with irrational entries has order 3', { skip: !HAS_MCLOSE ? 'build predates the PG_mClose fix (v2.2.29)' : false }, () => {
  const R = [[0.5699968, 0.2983039, 0.7655838],
             [0.8216469, -0.2069408, -0.5311044],
             [0.0, 0.9317673, -0.3630560]];
  assert.equal(cv.PG_order(R), 3);
});

test('rhombohedral site group closes to C3 (regression: t04)', { skip: !HAS_MCLOSE ? 'build predates the PG_mClose fix (v2.2.29)' : false }, () => {
  // A generator set with irrational entries whose cube is I only to ~1e-7.
  const A = [[0.5699968, 0.2983039, 0.7655838],
             [0.8216469, -0.2069408, -0.5311044],
             [0.0, 0.9317673, -0.3630560]];
  const A2 = cv.PG_mm(A, A);
  const G = cv.PG_closure([A, A2]);
  assert.ok(G, 'closure terminates (does not hit the maxn cap)');
  assert.equal(G.length, 3, 'the site group has 3 elements');
  const cc = cv.PG_conjugacyClasses(G);
  const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
  assert.ok(id, 'group identified');
  assert.equal(id.name, 'C3');
});

/* ==========================================================================
   SUITE 9 - the SYM.cacheByKey fix (Batch A #1): repeated analysis hits the
   key cache and returns the SAME object, not a recomputed one.
   ========================================================================== */
test('symAnalyze memoises by key (cacheByKey is live, not dead)', { skip: cv.SYM.cacheByKey === undefined ? 'build predates the cacheByKey fix' : false }, () => {
  withNaClState();
  // reset the caches the way the app does on a fresh load
  cv.SYM.cache = null;
  cv.SYM.cacheByKey = {};
  cv.SYM.keyOrder = [];
  const site = { sym: 'Na', cart: fracToCart(cv.S.struct.cell, [0, 0, 0]) };
  const a1 = cv.symAnalyze(site);
  const a2 = cv.symAnalyze(site);
  assert.equal(a1, a2, 'second call returns the cached object');
  assert.ok(Object.keys(cv.SYM.cacheByKey).length >= 1, 'key cache populated');
});

/* ==========================================================================
   SUITE 10 - orbit transport (orientedSALCFor / orbitRelationOf).

   The transport rotates a SALC coefficient vector D_l(R) from the anchor to
   each orbit member.  Two behaviours are pinned here:

   (a) A general-position orbit in a primitive cell: every member must be
       reached, INCLUDING a member reached by a point op with t=(0,0,0).
       Regression for the corrected M1-FIX2 guard, which used to skip any
       t=0 relation and left one orbit member untransported.

   (b) The anchor itself and its pure-translation images must carry the
       UNCHANGED anchor vector (no spurious rotation).
   ========================================================================== */
const P3_GENERAL_CIF = `data_P3_general
_cell_length_a 5.0
_cell_length_b 5.0
_cell_length_c 6.0
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 120
_symmetry_space_group_name_H-M 'P 3'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
X1 X 0.4 0.0 0.25
`;

test('P3 general-position orbit: all members transported (t=0 member included)', () => {
  const st = cv.parseCIF(P3_GENERAL_CIF, 'p3gen');
  cv.S.struct = st;
  assert.equal(st.atoms.length, 3, 'general position gives 3 atoms');
  const a = st.cell;
  const f2c = f => [
    a[0][0] * f[0] + a[1][0] * f[1] + a[2][0] * f[2],
    a[0][1] * f[0] + a[1][1] * f[1] + a[2][1] * f[2],
    a[0][2] * f[0] + a[1][2] * f[1] + a[2][2] * f[2],
  ];
  const anchor = { sym: 'X', cart: f2c([0.4, 0, 0.25]) };
  // transport p_x = [0,1,0] (basis order is [p_z, p_x, p_y]) to each atom
  const got = [];
  for (const at of st.atoms) {
    const ori = cv.orientedSALCFor(0, anchor, [0, 1, 0], 1, st, f2c(at.f));
    got.push(ori ? ori.coefs : null);
  }
  // the anchor keeps p_x
  assert.ok(got[0], 'anchor has a relation');
  assert.ok(Math.abs(got[0][1] - 1) < 1e-6, 'anchor keeps p_x');
  // BOTH other members must be transported (this is the t=0 fix): each is a
  // 120-degree rotation of p_x, i.e. [0, cos120, +/-sin120] = [0,-0.5,±0.866]
  for (const i of [1, 2]) {
    assert.ok(got[i], `atom ${i} must be transported (was NULL before the t=0 fix)`);
    assert.ok(Math.abs(got[i][0]) < 1e-6, `atom ${i}: no p_z component`);
    assert.ok(Math.abs(got[i][1] + 0.5) < 1e-6, `atom ${i}: cos(120) component`);
    assert.ok(Math.abs(Math.abs(got[i][2]) - 0.8660254037844386) < 1e-6,
      `atom ${i}: sin(120) component`);
  }
  // the two non-anchor members must be the two OPPOSITE 120-degree rotations
  assert.ok(Math.abs(got[1][2] + got[2][2]) < 1e-6,
    'the two members rotate in opposite senses');
});

test('orbit transport: anchor and translation images keep the anchor vector', () => {
  // Fm-3m rocksalt: every atom is a translation image of the anchor, so the
  // whole class must draw the UNCHANGED vector (no spurious rotation).
  const st = cv.parseCIF(NACL_CIF, 'NaCl');
  cv.S.struct = st;
  const a = st.cell;
  const f2c = f => [
    a[0][0] * f[0] + a[1][0] * f[1] + a[2][0] * f[2],
    a[0][1] * f[0] + a[1][1] * f[1] + a[2][1] * f[2],
    a[0][2] * f[0] + a[1][2] * f[1] + a[2][2] * f[2],
  ];
  const anchor = { sym: 'Na', cart: f2c([0, 0, 0]) };
  let checked = 0;
  for (const at of st.atoms) {
    if (at.sym !== 'Na') continue;
    const ori = cv.orientedSALCFor(0, anchor, [0, 1, 0], 1, st, f2c(at.f));
    assert.ok(ori, 'Na atom has a relation');
    // translation images -> identity rotation -> vector unchanged
    assert.ok(Math.abs(ori.coefs[0]) < 1e-6 && Math.abs(ori.coefs[1] - 1) < 1e-6
      && Math.abs(ori.coefs[2]) < 1e-6,
      `Na image at ${at.f} must keep the anchor vector`);
    checked++;
  }
  assert.ok(checked >= 4, 'checked several Na images');
});

/* ==========================================================================
   SUITE 11 - the t17 demo deck: C3 site (irreps) vs general-position orbit
   (transport).  This pins the two behaviours the deck exists to show.
   ========================================================================== */
test('t17 deck: on-axis site is C3 with p -> A + E', () => {
  const st = cv.parseCIF(
    require('node:fs').readFileSync(require('node:path').resolve(__dirname, '..', 'decks', 't17_p3_c3_orbit.cif'), 'utf8'),
    't17');
  cv.S.struct = st;
  cv.S.symMode = 'full';
  cv.PLANE.on = true;
  cv.PLANE.n = cv.planeNormal(0, 0, 1);
  const a = st.cell;
  const f2c = f => [
    a[0][0] * f[0] + a[1][0] * f[1] + a[2][0] * f[2],
    a[0][1] * f[0] + a[1][1] * f[1] + a[2][1] * f[2],
    a[0][2] * f[0] + a[1][2] * f[1] + a[2][2] * f[2],
  ];
  const onAxis = { sym: 'X', cart: f2c([0, 0, 0.3]) };
  const an = cv.symAnalyze(onAxis);
  const name = an.identC ? an.identC.name : an.ident.name;
  assert.equal(name, 'C3', 'on-axis X site group');
  const man = cv.symManifold('X', 1, onAxis);
  assert.deepEqual(man.parts.map(p => p.irrep).sort(), ['A', 'E'], 'p -> A + E');
});

test('t17 deck: the general-position C3 orbit rotates by 120 degrees', () => {
  const st = cv.parseCIF(
    require('node:fs').readFileSync(require('node:path').resolve(__dirname, '..', 'decks', 't17_p3_c3_orbit.cif'), 'utf8'),
    't17');
  cv.S.struct = st;
  const a = st.cell;
  const f2c = f => [
    a[0][0] * f[0] + a[1][0] * f[1] + a[2][0] * f[2],
    a[0][1] * f[0] + a[1][1] * f[1] + a[2][1] * f[2],
    a[0][2] * f[0] + a[1][2] * f[1] + a[2][2] * f[2],
  ];
  const anchor = { sym: 'X', cart: f2c([0.45, 0, 0.3]) };
  // the three general-position members (the on-axis atom is a different class)
  const members = st.atoms.filter(at => Math.abs(at.f[2] - 0.3) < 1e-6
    && !(Math.abs(at.f[0]) < 1e-6 && Math.abs(at.f[1]) < 1e-6));
  assert.equal(members.length, 3, 'three general-position X atoms');
  let rotated = 0;
  for (const at of members) {
    const ori = cv.orientedSALCFor(0, anchor, [0, 1, 0], 1, st, f2c(at.f));
    assert.ok(ori, `member ${at.f} must be transported`);
    // each member is either the anchor itself (p_x) or a 120-degree rotation
    const isAnchor = Math.abs(ori.coefs[1] - 1) < 1e-6;
    const isRot = Math.abs(ori.coefs[1] + 0.5) < 1e-6 && Math.abs(Math.abs(ori.coefs[2]) - 0.8660254037844386) < 1e-6;
    assert.ok(isAnchor || isRot, `member ${at.f}: expected p_x or a 120-deg rotation`);
    if (isRot) rotated++;
  }
  assert.equal(rotated, 2, 'both non-anchor members are rotated by 120 degrees');
});
