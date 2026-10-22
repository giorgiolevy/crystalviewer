'use strict';
/* ============================================================================
   decks.fixtures.js - expected symmetry results for the CIF decks in ../decks.

   Each entry pins the analysis of EVERY site class's seed atom, on the (001)
   plane, in `full` symmetry mode (the mode that reports the true 3-D site
   group).  This mirrors the TESTGUIDE_SG_PACK.md walkthrough (which is
   class-based).

   Fields:
     file     - the .cif in ../decks
     symbol   - the space-group symbol the deck declares
     ops      - number of symmetry operations the parser must produce
                (cross-checked against SG_generate(symbol) and ITA general
                 position multiplicity)
     atoms    - number of atoms after symmetry expansion
     sites    - array, one entry per site class (in classPartition order):
                  { cls, group, p }
                where `group` is the site-group name in FULL symmetry mode and
                `p` is the p-manifold (l=1) irrep labels joined with '+'.
     planes   - optional PLANE-ADAPTED expectations for the FIRST site class
                (the anchor case), in `slab` mode (the UI default): a map from
                'hkl' to { group, p }.  Slab mode keeps only operations that
                preserve the plane, so the result is plane-dependent.  The
                (001) row usually matches the full-mode site group; a low-
                symmetry plane (e.g. (111)) exercises the plane adaptation.
                `null` group means the build is expected to produce no
                analysis (used to pin a known-broken case).
     note     - WHY these expectations (crystallographic basis / guide ref)
     xfail    - optional; a known current failure.  The test then asserts the
                deck does NOT yet meet its expected values (suite stays green)
                and will FAIL loudly once fixed.

   EXPECTATIONS ARE INDEPENDENT, NOT SNAPSHOTS.  Op/atom counts come from the
   space group and the atom list.  Site groups and irrep splits are
   crystallographic (International Tables site symmetry + standard irrep
   tables for that site group).  Cross-checked against TESTGUIDE_SG_PACK.md;
   where the guide's shorthand disagrees with the tables, the tables win and
   the note says so.
   ============================================================================ */

module.exports = [
  {
    file: 't01_zns_spaced_fd3m.cif',
    symbol: 'F d -3 m',
    ops: 192, atoms: 16,
    sites: [
      { cls: 'Zn#1', group: 'Td', p: 'T2' },
      { cls: 'S#1',  group: 'Td', p: 'T2' },
    ],
    planes: { '001': { group: 'D2d', p: 'B2+E' }, '111': { group: 'C3v', p: 'A1+E' } },
    note: 'Sphalerite: both Zn (8a) and S (8b) sit on -43m (Td) sites; p -> T2. '
        + 'Exercises the spaced H-M symbol ("F d -3 m").',
  },
  {
    file: 't02_diamond_fd3m_o1.cif',
    symbol: 'F d -3 m :o1',
    ops: 192, atoms: 8,
    sites: [{ cls: 'C#1', group: 'Td', p: 'T2' }],
    planes: { '001': { group: 'D2d', p: 'B2+E' }, '111': { group: 'C3v', p: 'A1+E' } },
    note: 'Diamond, origin choice 1: C on 8a at the origin, site symmetry -43m (Td); p -> T2. '
        + 'The :o1 suffix must keep 8a on the origin (8 atoms, not 16).',
  },
  {
    file: 't03_pnnn_o2.cif',
    symbol: 'P n n n :o2',
    ops: 8, atoms: 4,
    sites: [{ cls: 'Mg#1', group: 'Ci', p: 'Au' }],
    planes: { '001': { group: 'Ci', p: 'Au' }, '111': { group: 'Ci', p: 'Au' } },
    note: 'Pnnn origin choice 2 puts the inversion centre at the origin, so Mg is -1 (Ci); '
        + 'p -> Au. Same group and input atom as t03b, DIFFERENT origin: the Ci/D2 pair '
        + 'proves the origin suffix reaches the op list.',
  },
  {
    file: 't03b_pnnn_default.cif',
    symbol: 'P n n n',
    ops: 8, atoms: 2,
    sites: [{ cls: 'Mg#1', group: 'D2', p: 'B1+B2+B3' }],
    planes: { '001': { group: 'D2', p: 'B1+B2+B3' }, '111': { group: 'C1', p: 'A' } },
    note: 'Pnnn default (origin choice 1): the origin is a 222 (D2) site; p -> B1+B2+B3. '
        + 'Contrast t03 (:o2 -> Ci).',
  },
  {
    file: 't04_corundum_R_axes.cif',
    symbol: 'R -3 c :R',
    ops: 12, atoms: 16,
    sites: [
      { cls: 'Al#1', group: 'C3', p: 'A+E' },
      { cls: 'O#1',  group: 'C1', p: 'A' },
    ],
    planes: { '001': { group: 'C1', p: 'A' }, '111': { group: 'C3', p: 'A+E' } },
    note: 'Corundum in RHOMBOHEDRAL axes. Al at (0.35,0.35,0.35) lies on the [111] 3-fold '
        + 'axis -> site symmetry 3 (C3); O is a general position -> C1. (TESTGUIDE records '
        + '"C1" for both, which was the fallback the engine produced when the Al analysis '
        + 'returned null; the tables give C3. FIXED in v2.2.29: PG_closure/PG_order now '
        + 'compare rotations by tolerance (PG_mClose), so the irrational R-axes site-group '
        + 'matrices close and identify correctly.)',
  },
  {
    file: 't05_corundum_H_axes.cif',
    symbol: 'R -3 c :H',
    ops: 36, atoms: 30,
    sites: [
      { cls: 'Al#1', group: 'C3', p: 'A+E' },
      { cls: 'O#1',  group: 'C2', p: 'A+B' },
    ],
    planes: { '001': { group: 'C3', p: 'A+E' }, '111': { group: 'C1', p: 'A' } },
    note: 'Corundum in HEXAGONAL axes: Al on the 3-fold axis -> C3; O on the 2-fold axis '
        + '-> C2. Same crystal as t04; the H-axes cell is handled correctly. '
        + 'Matches TESTGUIDE ("Al order 3 (C3-family); O reads C2").',
  },
  {
    file: 't06_pyrite_pa3.cif',
    symbol: 'P a -3',
    ops: 24, atoms: 12,
    sites: [
      { cls: 'Fe#1', group: 'C3i', p: 'Au+Eu' },
      { cls: 'S#1',  group: 'C3',  p: 'A+E' },
    ],
    planes: { '001': { group: 'Ci', p: 'Au' }, '111': { group: 'C3i', p: 'Au+Eu' } },
    note: 'Pyrite: Fe on 4a at the origin -> -3 (C3i, order 6, the guide\'s "stab 6"); '
        + 'S at (0.385,0.385,0.385) lies on the [111] 3-fold axis -> C3. '
        + '(The guide\'s "Fe#1=Ci, S#1=C1" is loose shorthand; the tables give C3i and C3.)',
  },
  {
    file: 't07_rutile_p42mnm.cif',
    symbol: 'P 4_2/m n m',
    ops: 16, atoms: 6,
    sites: [
      { cls: 'Ti#1', group: 'D2h', p: 'B1u+B2u+B3u' },
      { cls: 'O#1',  group: 'C2v', p: 'A1+B1+B2' },
    ],
    planes: { '001': { group: 'D2h', p: 'B1u+B2u+B3u' }, '111': { group: 'C2h', p: 'Au+Bu' } },
    note: 'Rutile: Ti on 2a at the origin -> mmm (D2h); O on 4f -> mm2 (C2v). '
        + 'Matches TESTGUIDE exactly (Ti#1=D2h, O#1=C2v).',
  },
  {
    file: 't08_quartz_p3121.cif',
    symbol: 'P 3_1 2 1',
    ops: 6, atoms: 12,
    sites: [
      { cls: 'Si#1', group: 'C1', p: 'A' },
      { cls: 'O#1',  group: 'C1', p: 'A' },
    ],
    planes: { '001': { group: 'C1', p: 'A' }, '111': { group: 'C1', p: 'A' } },
    note: 'Quartz P3_121 (right-handed screw). The deck places Si at (0.4697,0,0), a general '
        + 'position for this origin (the 2-fold axes do not pass through it), so both sites '
        + 'are C1. Matches TESTGUIDE (Si#1=C1, O#1=C1). The screw sense is pinned by the op count.',
  },
  {
    file: 't09_ccce_alias.cif',
    symbol: 'C c c e',
    ops: 16, atoms: 16,
    sites: [{ cls: 'Mg#1', group: 'C1', p: 'A' }],
    planes: { '001': { group: 'C1', p: 'A' }, '111': { group: 'C1', p: 'A' } },
    note: 'Ccce (modern e-glide alias of Ccca, No. 68): Mg at a general position -> C1. '
        + 'Exercises the alias spelling. Matches TESTGUIDE (Mg#1=C1).',
  },
  {
    file: 't10_cu_two_class_pnma.cif',
    symbol: 'P n m a',
    ops: 8, atoms: 8,
    sites: [
      { cls: 'Cu#1', group: 'Ci', p: 'Au' },
      { cls: 'Cu#2', group: 'Cs', p: "A'+A''" },
    ],
    planes: { '001': { group: 'Ci', p: 'Au' }, '111': { group: 'Ci', p: 'Au' } },
    note: 'Pnma with TWO Cu classes: Cu1 at the origin (site -1, Ci) and Cu2 at a mirror '
        + 'site (Cs). The same element in two classes with different site groups - the '
        + 'multiclass scenario. Matches TESTGUIDE (Cu#1=Ci, Cu#2=Cs).',
  },
  {
    file: 't11_p4nbm.cif',
    symbol: 'P 4/n b m',
    ops: 16, atoms: 2,
    sites: [{ cls: 'Zr#1', group: 'D4', p: 'A2+E' }],
    planes: { '001': { group: 'D4', p: 'A2+E' }, '111': { group: 'C2', p: 'A+B' } },
    note: 'P4/nbm (ITA 125), Zr at the origin. With this build\'s origin convention the '
        + 'operations fixing (0,0,0) are {E, 2C4, 2C2, 4 mirrors} = D4 (no inversion / '
        + 'sigma_h), so the site group is D4 and p -> A2+E. One of the six corrected '
        + 'ITA 125-130 label decks.',
  },
  {
    file: 't12_p4nnc.cif',
    symbol: 'P 4/n n c',
    ops: 16, atoms: 2,
    sites: [{ cls: 'Zr#1', group: 'D4', p: 'A2+E' }],
    planes: { '001': { group: 'D4', p: 'A2+E' }, '111': { group: 'C2', p: 'A+B' } },
    note: 'P4/nnc (ITA 126), Zr at origin; same D4 site as t11 for this origin convention.',
  },
  {
    file: 't13_p4mbm.cif',
    symbol: 'P 4/m b m',
    ops: 16, atoms: 2,
    sites: [{ cls: 'Zr#1', group: 'C4h', p: 'Au+Eu' }],
    planes: { '001': { group: 'C4h', p: 'Au+Eu' }, '111': { group: 'Ci', p: 'Au' } },
    note: 'P4/mbm (ITA 127), Zr at origin: the operations fixing it include the mirror '
        + 'z->-z but not the vertical mirrors, giving 4/m (C4h); p -> Au+Eu.',
  },
  {
    file: 't14_p4mnc.cif',
    symbol: 'P 4/m n c',
    ops: 16, atoms: 2,
    sites: [{ cls: 'Zr#1', group: 'C4h', p: 'Au+Eu' }],
    planes: { '001': { group: 'C4h', p: 'Au+Eu' }, '111': { group: 'Ci', p: 'Au' } },
    note: 'P4/mnc (ITA 128), Zr at origin; C4h site, p -> Au+Eu.',
  },
  {
    file: 't15_p4nmm.cif',
    symbol: 'P 4/n m m',
    ops: 16, atoms: 2,
    sites: [{ cls: 'Zr#1', group: 'D2d', p: 'B2+E' }],
    planes: { '001': { group: 'D2d', p: 'B2+E' }, '111': { group: 'C2', p: 'A+B' } },
    note: 'P4/nmm (ITA 129), Zr at origin: site symmetry -42m (D2d); p -> B2+E.',
  },
  {
    file: 't16_p4ncc.cif',
    symbol: 'P 4/n c c',
    ops: 16, atoms: 4,
    sites: [{ cls: 'Zr#1', group: 'S4', p: 'B+E' }],
    planes: { '001': { group: 'S4', p: 'B+E' }, '111': { group: 'C1', p: 'A' } },
    note: 'P4/ncc (ITA 130), Zr at origin: site symmetry -4 (S4); p -> B+E.',
  },
];
