'use strict';
/* ============================================================================
   spacegroups.test.js - the space-group SYMBOL GENERATOR (SG_generate).

   Enumerates all 230 ITA standard short H-M symbols and checks, for every one:
     - it generates (no refusal);
     - the operation count equals the ITA general-position multiplicity;
     - the operation set is a valid group: no duplicates, identity present,
       and CLOSED under composition (modulo the centring translations);
     - a general point maps to exactly MULT distinct positions (orbit count).

   This pins the "230/230 complete" claim so it cannot silently regress.

   Reference data: the 230 symbols and their general-position multiplicities
   are the ITA standard-setting values.  If a symbol here disagrees with the
   generator, decide which is right before editing - the multiplicity is the
   authoritative cross-check.

   Run:  node --test spacegroups.test.js
   ============================================================================ */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { load } = require('./cvloader');

const FILE = process.env.CV_FILE
  ? path.resolve(__dirname, process.env.CV_FILE)
  : path.resolve(__dirname, '..', 'index.html');
const cv = load(FILE);

/* The 230 ITA space groups: [number, standard short H-M symbol, general-
   position multiplicity].  Symbols use '_' for screw subscripts (P 2_1/c). */
const ITA = [
  [1, 'P 1', 1], [2, 'P -1', 2], [3, 'P 2', 2], [4, 'P 2_1', 2], [5, 'C 2', 4],
  [6, 'P m', 2], [7, 'P c', 2], [8, 'C m', 4], [9, 'C c', 4], [10, 'P 2/m', 4],
  [11, 'P 2_1/m', 4], [12, 'C 2/m', 8], [13, 'P 2/c', 4], [14, 'P 2_1/c', 4], [15, 'C 2/c', 8],
  [16, 'P 2 2 2', 4], [17, 'P 2 2 2_1', 4], [18, 'P 2_1 2_1 2', 4], [19, 'P 2_1 2_1 2_1', 4],
  [20, 'C 2 2 2_1', 8], [21, 'C 2 2 2', 8], [22, 'F 2 2 2', 16], [23, 'I 2 2 2', 8], [24, 'I 2_1 2_1 2_1', 8],
  [25, 'P m m 2', 4], [26, 'P m c 2_1', 4], [27, 'P c c 2', 4], [28, 'P m a 2', 4], [29, 'P c a 2_1', 4],
  [30, 'P n c 2', 4], [31, 'P m n 2_1', 4], [32, 'P b a 2', 4], [33, 'P n a 2_1', 4], [34, 'P n n 2', 4],
  [35, 'C m m 2', 8], [36, 'C m c 2_1', 8], [37, 'C c c 2', 8], [38, 'A m m 2', 8], [39, 'A b m 2', 8],
  [40, 'A m a 2', 8], [41, 'A b a 2', 8], [42, 'F m m 2', 16], [43, 'F d d 2', 16], [44, 'I m m 2', 8],
  [45, 'I b a 2', 8], [46, 'I m a 2', 8],
  [47, 'P m m m', 8], [48, 'P n n n', 8], [49, 'P c c m', 8], [50, 'P b a n', 8], [51, 'P m m a', 8],
  [52, 'P n n a', 8], [53, 'P m n a', 8], [54, 'P c c a', 8], [55, 'P b a m', 8], [56, 'P c c n', 8],
  [57, 'P b c m', 8], [58, 'P n n m', 8], [59, 'P m m n', 8], [60, 'P b c n', 8], [61, 'P b c a', 8],
  [62, 'P n m a', 8], [63, 'C m c m', 16], [64, 'C m c a', 16], [65, 'C m m m', 16], [66, 'C c c m', 16],
  [67, 'C m m a', 16], [68, 'C c c a', 16], [69, 'F m m m', 32], [70, 'F d d d', 32], [71, 'I m m m', 16],
  [72, 'I b a m', 16], [73, 'I b c a', 16], [74, 'I m m a', 16],
  [75, 'P 4', 4], [76, 'P 4_1', 4], [77, 'P 4_2', 4], [78, 'P 4_3', 4], [79, 'I 4', 8], [80, 'I 4_1', 8],
  [81, 'P -4', 4], [82, 'I -4', 8], [83, 'P 4/m', 8], [84, 'P 4_2/m', 8], [85, 'P 4/n', 8],
  [86, 'P 4_2/n', 8], [87, 'I 4/m', 16], [88, 'I 4_1/a', 16],
  [89, 'P 4 2 2', 8], [90, 'P 4 2_1 2', 8], [91, 'P 4_1 2 2', 8], [92, 'P 4_1 2_1 2', 8], [93, 'P 4_2 2 2', 8],
  [94, 'P 4_2 2_1 2', 8], [95, 'P 4_3 2 2', 8], [96, 'P 4_3 2_1 2', 8], [97, 'I 4 2 2', 16], [98, 'I 4_1 2 2', 16],
  [99, 'P 4 m m', 8], [100, 'P 4 b m', 8], [101, 'P 4_2 c m', 8], [102, 'P 4_2 n m', 8], [103, 'P 4 c c', 8],
  [104, 'P 4 n c', 8], [105, 'P 4_2 m c', 8], [106, 'P 4_2 b c', 8], [107, 'I 4 m m', 16], [108, 'I 4 c m', 16],
  [109, 'I 4_1 m d', 16], [110, 'I 4_1 c d', 16],
  [111, 'P -4 2 m', 8], [112, 'P -4 2 c', 8], [113, 'P -4 2_1 m', 8], [114, 'P -4 2_1 c', 8], [115, 'P -4 m 2', 8],
  [116, 'P -4 c 2', 8], [117, 'P -4 b 2', 8], [118, 'P -4 n 2', 8], [119, 'I -4 m 2', 16], [120, 'I -4 c 2', 16],
  [121, 'I -4 2 m', 16], [122, 'I -4 2 d', 16],
  [123, 'P 4/m m m', 16], [124, 'P 4/m c c', 16], [125, 'P 4/n b m', 16], [126, 'P 4/n n c', 16],
  [127, 'P 4/m b m', 16], [128, 'P 4/m n c', 16], [129, 'P 4/n m m', 16], [130, 'P 4/n c c', 16],
  [131, 'P 4_2/m m c', 16], [132, 'P 4_2/m c m', 16], [133, 'P 4_2/n b c', 16], [134, 'P 4_2/n n m', 16],
  [135, 'P 4_2/m b c', 16], [136, 'P 4_2/m n m', 16], [137, 'P 4_2/n m c', 16], [138, 'P 4_2/n c m', 16],
  [139, 'I 4/m m m', 32], [140, 'I 4/m c m', 32], [141, 'I 4_1/a m d', 32], [142, 'I 4_1/a c d', 32],
  [143, 'P 3', 3], [144, 'P 3_1', 3], [145, 'P 3_2', 3], [146, 'R 3', 9], [147, 'P -3', 6], [148, 'R -3', 18],
  [149, 'P 3 1 2', 6], [150, 'P 3 2 1', 6], [151, 'P 3_1 1 2', 6], [152, 'P 3_1 2 1', 6], [153, 'P 3_2 1 2', 6],
  [154, 'P 3_2 2 1', 6], [155, 'R 3 2', 18], [156, 'P 3 m 1', 6], [157, 'P 3 1 m', 6], [158, 'P 3 c 1', 6],
  [159, 'P 3 1 c', 6], [160, 'R 3 m', 18], [161, 'R 3 c', 18],
  [162, 'P -3 1 m', 12], [163, 'P -3 1 c', 12], [164, 'P -3 m 1', 12], [165, 'P -3 c 1', 12],
  [166, 'R -3 m', 36], [167, 'R -3 c', 36],
  [168, 'P 6', 6], [169, 'P 6_1', 6], [170, 'P 6_5', 6], [171, 'P 6_2', 6], [172, 'P 6_4', 6], [173, 'P 6_3', 6],
  [174, 'P -6', 6], [175, 'P 6/m', 12], [176, 'P 6_3/m', 12], [177, 'P 6 2 2', 12], [178, 'P 6_1 2 2', 12],
  [179, 'P 6_5 2 2', 12], [180, 'P 6_2 2 2', 12], [181, 'P 6_4 2 2', 12], [182, 'P 6_3 2 2', 12],
  [183, 'P 6 m m', 12], [184, 'P 6 c c', 12], [185, 'P 6_3 c m', 12], [186, 'P 6_3 m c', 12],
  [187, 'P -6 m 2', 12], [188, 'P -6 c 2', 12], [189, 'P -6 2 m', 12], [190, 'P -6 2 c', 12],
  [191, 'P 6/m m m', 24], [192, 'P 6/m c c', 24], [193, 'P 6_3/m c m', 24], [194, 'P 6_3/m m c', 24],
  [195, 'P 2 3', 12], [196, 'F 2 3', 48], [197, 'I 2 3', 24], [198, 'P 2_1 3', 12], [199, 'I 2_1 3', 24],
  [200, 'P m -3', 24], [201, 'P n -3', 24], [202, 'F m -3', 96], [203, 'F d -3', 96], [204, 'I m -3', 48],
  [205, 'P a -3', 24], [206, 'I a -3', 48],
  [207, 'P 4 3 2', 24], [208, 'P 4_2 3 2', 24], [209, 'F 4 3 2', 96], [210, 'F 4_1 3 2', 96], [211, 'I 4 3 2', 48],
  [212, 'P 4_3 3 2', 24], [213, 'P 4_1 3 2', 24], [214, 'I 4_1 3 2', 48],
  [215, 'P -4 3 m', 24], [216, 'F -4 3 m', 96], [217, 'I -4 3 m', 48], [218, 'P -4 3 n', 24], [219, 'F -4 3 c', 96],
  [220, 'I -4 3 d', 48],
  [221, 'P m -3 m', 48], [222, 'P n -3 n', 48], [223, 'P m -3 n', 48], [224, 'P n -3 m', 48], [225, 'F m -3 m', 192],
  [226, 'F m -3 c', 192], [227, 'F d -3 m', 192], [228, 'F d -3 c', 192], [229, 'I m -3 m', 96], [230, 'I a -3 d', 96],
];

/* centring translations, used to test closure modulo the lattice */
const CEN = {
  P: [[0, 0, 0]],
  A: [[0, 0, 0], [0, 0.5, 0.5]],
  B: [[0, 0, 0], [0.5, 0, 0.5]],
  C: [[0, 0, 0], [0.5, 0.5, 0]],
  I: [[0, 0, 0], [0.5, 0.5, 0.5]],
  F: [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]],
  R: [[0, 0, 0], [2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 2 / 3]],
};

function mm(A, B) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; C[i][j] = s;
  }
  return C;
}
function opKey(M, c) {
  let s = '';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += Math.round(M[i][j]) + ',';
  for (let k = 0; k < 3; k++) {
    let v = c[k] - Math.floor(c[k] + 1e-7);
    if (v >= 1 - 1e-6 || v < 1e-9) v = 0;
    s += Math.round(v * 12) + ',';
  }
  return s;
}

test('all 230 ITA space groups generate from their symbol', () => {
  const refused = [];
  for (const [num, sym] of ITA) {
    if (!cv.SG_generate(sym)) refused.push(`${num} ${sym}`);
  }
  assert.deepEqual(refused, [], 'symbols that failed to generate:\n  ' + refused.join('\n  '));
});

test('every space group has the correct ITA general-position multiplicity', () => {
  const wrong = [];
  for (const [num, sym, mult] of ITA) {
    const g = cv.SG_generate(sym);
    if (!g) { wrong.push(`${num} ${sym}: REFUSED`); continue; }
    if (g.ops.length !== mult) wrong.push(`${num} ${sym}: got ${g.ops.length}, expected ${mult}`);
  }
  assert.deepEqual(wrong, [], 'wrong operation counts:\n  ' + wrong.join('\n  '));
});

test('every space group is a valid group: unique ops, identity, closure', () => {
  const I = cv.PG_eye();
  const problems = [];
  for (const [num, sym] of ITA) {
    const g = cv.SG_generate(sym);
    if (!g) { problems.push(`${num} ${sym}: REFUSED`); continue; }
    const cent = CEN[sym[0]];
    // unique ops
    const keys = new Set(g.ops.map(o => opKey(o.M, o.c)));
    if (keys.size !== g.ops.length) {
      problems.push(`${num} ${sym}: duplicate operations (${g.ops.length} ops, ${keys.size} unique)`);
    }
    // identity present
    const hasI = g.ops.some(o => opKey(o.M, o.c) === opKey(I, [0, 0, 0]));
    if (!hasI) problems.push(`${num} ${sym}: identity missing`);
    // closure modulo centring: build the full (ops x centring) key set
    const full = new Set();
    for (const o of g.ops) for (const t of cent) full.add(opKey(o.M, [o.c[0] + t[0], o.c[1] + t[1], o.c[2] + t[2]]));
    let closed = true;
    outer:
    for (const a of g.ops) for (const b of g.ops) {
      // compose: apply a then b  ->  M = b.M*a.M , c = b.M*a.c + b.c
      const M = mm(b.M, a.M);
      const c = [0, 0, 0];
      for (let i = 0; i < 3; i++) { let s = b.c[i]; for (let k = 0; k < 3; k++) s += b.M[i][k] * a.c[k]; c[i] = s; }
      let found = false;
      for (const t of cent) if (full.has(opKey(M, [c[0] + t[0], c[1] + t[1], c[2] + t[2]]))) { found = true; break; }
      if (!found) { closed = false; break outer; }
    }
    if (!closed) problems.push(`${num} ${sym}: NOT closed under composition`);
  }
  assert.deepEqual(problems, [], 'group-validity problems:\n  ' + problems.join('\n  '));
});

test('a general point maps to exactly MULT distinct positions', () => {
  const problems = [];
  for (const [num, sym, mult] of ITA) {
    const g = cv.SG_generate(sym);
    if (!g) { problems.push(`${num} ${sym}: REFUSED`); continue; }
    const pt = [0.123, 0.234, 0.345];
    const seen = new Set();
    for (const o of g.ops) {
      const im = [o.c[0], o.c[1], o.c[2]];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) im[i] += o.M[i][j] * pt[j];
      seen.add(im.map(v => { let x = v - Math.floor(v + 1e-6); if (x > 1 - 1e-5 || x < 1e-6) x = 0; return Math.round(x * 1e5); }).join(','));
    }
    if (seen.size !== mult) problems.push(`${num} ${sym}: general orbit ${seen.size}, expected ${mult}`);
  }
  assert.deepEqual(problems, [], 'orbit-count problems:\n  ' + problems.join('\n  '));
});
