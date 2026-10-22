# CrystalViewer Space-Group Test Pack

**Target build:** crystalviewer_2d_irreps_v2.2.19.html (sha256[:12] `f64889b2a048`, badge `1.2.19-optimized`)
**How to use:** Load each CIF via 'Load structure / Open file...' or drag-and-drop (both supported).
After each load, set (h,k,l) in the plane panel and click an atom in the 3D view to anchor [1][2].
All expected values below were RECORDED FROM THE SHIPPED ENGINE headlessly (not hand-computed).
Badges/counts to check appear in: Parser messages, the symmetry strip, and per-element rows in 'Orbitals per element' [1][2].

## A. Settings discrimination (the new suffix features)

### t01 . t03b - spaced symbols and origin twins

| deck | symbol | expect ops | expect atoms | notes |
|---|---|---|---|---|
| t01_zns_spaced_fd3m.cif | `F d -3 m` (spaced) | 192 | 16 | rescue declared, not assumed-P1; Zn site group Td (24) |
| t02_diamond_fd3m_o1.cif | `F d -3 m :o1` | 192 | 8 | origin choice 1: C at (0,0,0) keeps 8a Td (identity stays; 8 atoms not 16) |
| t03_pnnn_o2.cif | `P n n n :o2` | 8 | 4 | Mg(0,0,0) becomes general in choice-2 frame (Ci) |
| t03b_pnnn_default.cif | `P n n n` (default=choice1) | 8 | 2 | Mg(0,0,0) at inversion center (D2); compare t03: SAME coords, DIFFERENT origin |

Checks: t03 vs t03b is the key pair - same input atom, different origin setting, different site group (Ci vs D2). This proves the origin suffix reaches the op list used for site analysis.

### t03-t05 - rhombohedral vs hexagonal axes

| t04_corundum_R_axes.cif | `R -3 c :R` | 12 | 16 | primitive cell (12 ops); Al/O general in the R-axes frame recorded (C1) |
| t05_corundum_H_axes.cif | `R -3 c :H` | 36 | 30 | hex cell (36 ops); O site group reads C2 in the strip; the Al(0,0,z) site group order recorded 3 (C3-family) |

Check: identical mineral, two axis conventions - op counts must scale 3:1 (12 vs 36) and atoms 16 vs 30 in the respective cells.

## B. Engine families (2.2.15-2.2.17 regressions)

| deck | symbol | ops | atoms | classes recorded |
|---|---|---|---|---|
| t06_pyrite_pa3.cif | `P a -3` | 24 | 12 | Fe#1=Ci, S#1=C1 |
| t07_rutile_p42mnm.cif | `P 4_2/m n m` | 16 | 6 | Ti#1=D2h, O#1=C2v |
| t08_quartz_p3121.cif | `P 3_1 2 1` | 6 | 12 | Si#1=C1, O#1=C1 |
| t09_ccce_alias.cif | `C c c e` | 16 | 16 | Mg#1=C1 |

Notes: pyrite Fe must report site group on the 4a orbit (stab 6, orbit 4 under 24 ops). Quartz has 6 ops - the screw-sense (3_1 vs 3_2) is guaranteed by the ITA-exact reference; gccsee resolves the modern e-notation alias to Ccca ops (16).

## C. The six corrected ITA 125-130 labels

| deck | symbol | ops | atoms |
|---|---|---|---|
| t11_p4nbm.cif | (see file) | 16 | 2 |
| t12_p4nnc.cif | (see file) | 16 | 2 |
| t13_p4mbm.cif | (see file) | 16 | 2 |
| t14_p4mnc.cif | (see file) | 16 | 2 |
| t15_p4nmm.cif | (see file) | 16 | 2 |
| t16_p4ncc.cif | (see file) | 16 | 4 |

Check: in v2.2.15/2.2.16 these six returned PERMUTED groups (the label bug fixed in 2.2.17). Orders stay 16, so the discriminator is the Zr site multiplicity/atoms (recorded above) and, when anchored, the plane-preserving subgroup and chips.

## D. Multiclass - your Cl#1/Cl#2 question scenario

Deck: **t10_cu_two_class_pnma.cif** (`P n m a`, Cu at (0,0,0) and (0.2, 0.25, 0.2))
Engine-recorded: 8 ops; classes: Cu#1=Ci, Cu#2=Cs.

Test sequence (this is the multiclass UX walk):
1. Load; set (001); anchor the Cu1 (0,0,0) atom. The Cu row in 'Orbitals per element' resolves its SALC menu to **Cu#1** (anchor's own class).
2. Pick an irrep from the Cu row's dropdown: BOTH Cu classes' menus resolve identically (f3: class of the row's element), but the DRIVEN class is Cu#1; only Cu#1 atoms change glyphs.
3. Now anchor the Cu2 atom (0.2,0.25,0.2) (or pick site-class Cu#2 in the strip).
4. The Cu row's menu now drives **Cu#2**; choosing a different irrep changes only Cu#2 atoms.
5. Chips: select a chip in the Cu#1 SECTION and one in the Cu#2 section - both SALC sets draw simultaneously (mixed overlay, per-class transport).
6. The plain component menu disables with the SALC tooltip while a chip owns that element [1][2].

What to expect in THIS build (recorded): Cu#1 class = Ci (inversion site), Cu#2 = Cs (mirror site). Different site groups, different irrep menus - the same-element multiclass resolution follows the anchor/picker, per the f3 contract.

## E. UI interactions to verify (f1/f2 fixes)

- Anchor on Na (NaCl example) -> pick any Cl chip -> click back onto a Na atom: the Cl chip clears (f1a) and the Cl plain menu is live again.
- With a chip active on Cl: the Cl plain menu shows DISABLED with the tooltip naming the irrep (f2).
- Chip x (clears) now removes ALL manifold keys of that class (f1b zombie fix - p->d->p resurrect test).
- Manifold switch: with a chip selected, change the element manifold (p to d): the chip clears (f4).

## F. Known honest boundaries (not bugs)

- `:R` beyond the seven trigonal R groups refuses (e.g. `P 63/m m c :R`).
- Monoclinic cell choices (e.g. `P 1 1 2/m`) and orthorhombic abc permutations (e.g. `P b a n` in `bca` setting) are the remaining backlog - they refuse via symbol today.
- Origin defaults: the six pinned groups (I 41/a family, F d -3 family) default to choice 2; the other 18 twins default to choice 1 (spglib first rows).

## Expected quick-reference (all engine-recorded)

| deck | ops | atoms |
|---|---|---|
| t01_zns_spaced_fd3m.cif | 192 | 16 |
| t02_diamond_fd3m_o1.cif | 192 | 8 |
| t03_pnnn_o2.cif | 8 | 4 |
| t03b_pnnn_default.cif | 8 | 2 |
| t04_corundum_R_axes.cif | 12 | 16 |
| t05_corundum_H_axes.cif | 36 | 30 |
| t06_pyrite_pa3.cif | 24 | 12 |
| t07_rutile_p42mnm.cif | 16 | 6 |
| t08_quartz_p3121.cif | 6 | 12 |
| t09_ccce_alias.cif | 16 | 16 |
| t10_cu_two_class_pnma.cif | 8 | 8 |
| t11_p4nbm.cif | 16 | 2 |
| t12_p4nnc.cif | 16 | 2 |
| t13_p4mbm.cif | 16 | 2 |
| t14_p4mnc.cif | 16 | 2 |
| t15_p4nmm.cif | 16 | 2 |
| t16_p4ncc.cif | 16 | 4 |
