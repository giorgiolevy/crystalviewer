'use strict';
/* ============================================================================
   tables.test.js - character-table validation.

   Two layers:

   1. GROUP AXIOMS, checked for EVERY table in PG_TABLES:
        - every irrep row has one entry per class;
        - the dimensionality theorem  sum_i dim(i)^2 == |G|  (sum of class sizes);
        - the number of irreps equals the number of classes;
        - the great orthogonality theorem:
              sum_c |c| * chi_i(c) * conj(chi_j(c))  ==  |G| * delta_ij
      These catch almost any transcription error and need no external data.

   2. REFERENCE DECOMPOSITIONS, checked for a representative set of groups:
      the p (l=1) and d (l=2) splittings must equal the textbook/Bilbao values.
      This validates the LABELS (not just the numbers) against the convention
      the tables are meant to follow.  Groups are built from explicit Cartesian
      generators so the test does not depend on the tables being self-consistent.

   Run:  node --test tables.test.js
   ============================================================================ */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { load } = require('./cvloader');

const FILE = process.env.CV_FILE
  ? path.resolve(__dirname, process.env.CV_FILE)
  : path.resolve(__dirname, '..', 'index.html');

const cv = load(FILE);

/* ---- complex character helpers (characters may be [re,im] or a real scalar) */
const asC = v => (Array.isArray(v) ? v : [v, 0]);
const cAbsDiff = (a, b) => {
  const x = asC(a), y = asC(b);
  return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]);
};

/* ==========================================================================
   LAYER 1 - group axioms for every table
   ========================================================================== */
test('every character table satisfies the group axioms', { skip: cv.PG_TABLES === undefined ? 'build has no PG_TABLES export' : false }, () => {
  const T = cv.PG_TABLES;
  const names = Object.keys(T);
  assert.ok(names.length >= 32, `expected >=32 tables, found ${names.length}`);
  const problems = [];
  for (const name of names) {
    const tab = T[name];
    const ncl = tab.classes.length;
    const sizes = tab.sizes;
    const irreps = tab.irreps;
    const irNames = Object.keys(irreps);
    const h = sizes.reduce((s, x) => s + x, 0);

    // (a) row length
    for (const ir of irNames) {
      if (irreps[ir].length !== ncl) {
        problems.push(`${name}/${ir}: row length ${irreps[ir].length} != ${ncl} classes`);
      }
    }
    // (b) dimensionality theorem
    let sumd = 0;
    for (const ir of irNames) sumd += irreps[ir][0] * irreps[ir][0];
    if (sumd !== h) problems.push(`${name}: sum(dim^2)=${sumd} != |G|=${h}`);
    // (c) #irreps == #classes
    if (irNames.length !== ncl) problems.push(`${name}: ${irNames.length} irreps != ${ncl} classes`);
    // (d) great orthogonality theorem
    for (let i = 0; i < irNames.length; i++) {
      for (let j = 0; j < irNames.length; j++) {
        let re = 0, im = 0;
        for (let c = 0; c < ncl; c++) {
          const a = asC(irreps[irNames[i]][c]);
          const b = asC(irreps[irNames[j]][c]);
          // a * conj(b) * |class|
          re += sizes[c] * (a[0] * b[0] + a[1] * b[1]);
          im += sizes[c] * (a[1] * b[0] - a[0] * b[1]);
        }
        const target = (i === j) ? h : 0;
        if (Math.abs(re - target) > 1e-6 || Math.abs(im) > 1e-6) {
          problems.push(`${name}: <${irNames[i]}|${irNames[j]}> = (${re.toFixed(4)},${im.toFixed(4)}) expected (${target},0)`);
        }
      }
    }
  }
  assert.deepEqual(problems, [], 'table axiom violations:\n  ' + problems.join('\n  '));
});

test('PG_TABLES covers all 32 crystallographic point groups', { skip: cv.PG_TABLES === undefined ? 'build has no PG_TABLES export' : false }, () => {
  const T = cv.PG_TABLES;
  // The 32 crystallographic point groups (S6 is the alternative name of C3i,
  // which is present under C3i, so the list below uses C3i).
  const GROUPS = ['C1', 'Ci', 'C2', 'Cs', 'C2h', 'D2', 'C2v', 'D2h',
    'C3', 'C3i', 'D3', 'C3v', 'D3d',
    'C4', 'S4', 'C4h', 'D4', 'C4v', 'D2d', 'D4h',
    'C6', 'C3h', 'C6h', 'D6', 'C6v', 'D3h', 'D6h',
    'T', 'Th', 'O', 'Td', 'Oh'];
  const missing = GROUPS.filter(g => !T[g]);
  assert.deepEqual(missing, [], `missing crystallographic point groups: ${missing.join(', ')}`);
  assert.equal(Object.keys(T).length, 32, 'exactly the 32 crystallographic point groups');
});

/* ==========================================================================
   LAYER 2 - reference p/d decompositions (validates the LABELS)
   Generators are explicit Cartesian rotations; the expected values are the
   standard orbital-splitting tables (ITA / Bilbao convention).
   ========================================================================== */
const c3 = Math.cos(2 * Math.PI / 3), s3 = Math.sin(2 * Math.PI / 3);
const c6 = Math.cos(Math.PI / 3), s6 = Math.sin(Math.PI / 3);
const C3z = [[c3, -s3, 0], [s3, c3, 0], [0, 0, 1]];
const C4z = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
const C6z = [[c6, -s6, 0], [s6, c6, 0], [0, 0, 1]];
const C2x = [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
const INV = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]];
const MX = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
const sh = [[1, 0, 0], [0, 1, 0], [0, 0, -1]];
const C2z = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];
const C3xyz = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];   // 3-fold about [111]
const S4z = [[0, -1, 0], [1, 0, 0], [0, 0, -1]];

// group -> { gens, expect: {1:'p', 2:'d'} }  (names joined with '+' in any order)
const CASES = [
  ['C1',   [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], { 1: 'A', 2: 'A' }],
  ['Ci',   [INV], { 1: 'Au', 2: 'Ag' }],
  ['Cs',   [MX], { 1: "A'+A''", 2: "A'+A''" }],
  ['C2',   [C2z], { 1: 'A+B', 2: 'A+B' }],
  ['C2h',  [C2z, INV], { 1: 'Au+Bu', 2: 'Ag+Bg' }],
  ['C2v',  [MX, [[1, 0, 0], [0, -1, 0], [0, 0, 1]]], { 1: 'A1+B1+B2', 2: 'A1+A2+B1+B2' }],
  ['D2',   [C2z, C2x], { 1: 'B1+B2+B3', 2: 'A+B1+B2+B3' }],
  ['C3',   [C3z], { 1: 'A+E', 2: 'A+E' }],
  ['C3v',  [C3z, MX], { 1: 'A1+E', 2: 'A1+E' }],
  ['C3i',  [C3z, INV], { 1: 'Au+Eu', 2: 'Ag+Eg' }],
  ['C3h',  [C3z, sh], { 1: "A''+E'", 2: "A'+E'+E''" }],
  ['D3',   [C3z, C2x], { 1: 'A2+E', 2: 'A1+E' }],
  ['D3d',  [C3z, C2x, INV], { 1: 'A2u+Eu', 2: 'A1g+Eg' }],
  ['C4',   [C4z], { 1: 'A+E', 2: 'A+B+E' }],
  ['S4',   [S4z], { 1: 'B+E', 2: 'A+B+E' }],
  ['C4h',  [C4z, INV], { 1: 'Au+Eu', 2: 'Ag+Eg+Bg' }],
  ['C4v',  [C4z, MX], { 1: 'A1+E', 2: 'A1+B1+B2+E' }],
  ['D4',   [C4z, C2x], { 1: 'A2+E', 2: 'A1+B1+B2+E' }],
  ['D2d',  [S4z, MX], { 1: 'B2+E', 2: 'A1+B1+B2+E' }],
  ['D4h',  [C4z, C2x, INV], { 1: 'A2u+Eu', 2: 'A1g+B1g+B2g+Eg' }],
  ['C6',   [C6z], { 1: 'A+E1', 2: 'A+E1+E2' }],
  ['C6h',  [C6z, INV], { 1: 'Au+E1u', 2: 'Ag+E1g+E2g' }],
  ['C6v',  [C6z, MX], { 1: 'A1+E1', 2: 'A1+E1+E2' }],
  ['D6',   [C6z, C2x], { 1: 'A2+E1', 2: 'A1+E1+E2' }],
  ['D6h',  [C6z, C2x, INV], { 1: 'A2u+E1u', 2: 'A1g+E1g+E2g' }],
  ['T',    [C2z, C3xyz], { 1: 'T', 2: 'E+T' }],
  ['Td',   [C3xyz, S4z], { 1: 'T2', 2: 'E+T2' }],
  ['O',    [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], C4z], { 1: 'T1', 2: 'E+T2' }],
  ['Oh',   [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], C4z, INV], { 1: 'T1u', 2: 'Eg+T2g' }],
];

const sorted = s => s.split('+').sort().join('+');

/* The ITA/Bilbao relabel (E1->E etc. for the cyclic/Abelian groups) landed in
   v2.2.29.  Detect it from the table itself so this suite stays usable against
   older builds: if C3 still uses E1/E2, the label-sensitive expectations below
   do not apply. */
const HAS_ITA_LABELS = !!(cv.PG_TABLES && cv.PG_TABLES['C3'] && cv.PG_TABLES['C3'].irreps['E']);

for (const [name, gens, expect] of CASES) {
  // Cases whose expected labels changed with the relabel are skipped on builds
  // that predate it; the numeric (character) correctness is still covered by
  // the group-axiom test, which is label-agnostic.
  const RELABELLED = new Set(['C3', 'C3i', 'C3h', 'C4', 'S4', 'C4h', 'T', 'Th']);
  const skip = cv.PG_TABLES === undefined ? 'build has no PG_TABLES export'
    : (!HAS_ITA_LABELS && RELABELLED.has(name)) ? 'build predates the ITA/Bilbao relabel (v2.2.29)'
    : false;
  test(`decomposition labels: ${name}`, { skip }, () => {
    const G = cv.PG_closure(gens);
    assert.ok(G, `${name}: closure terminated`);
    const cc = cv.PG_conjugacyClasses(G);
    const id = cv.PG_identifyGroup(G, cc.cls, cc.classes);
    assert.ok(id, `${name}: group identified`);
    assert.equal(id.name, name, `${name}: identified as ${id.name}`);
    for (const l of [1, 2]) {
      const got = cv.PG_decompose(G, cc.cls, cc.classes, id, l)
        .parts.filter(p => Math.round(p.mult) > 0).map(p => p.name).join('+');
      assert.equal(sorted(got), sorted(expect[l]),
        `${name}: l=${l} splitting`);
    }
  });
}
