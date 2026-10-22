# CrystalViewer test harness

Unit tests for the single-file viewer. The viewer stays one file; the tests
live here and load its `<script>` in Node with a tiny DOM stub, so the
symmetry/maths engine is directly callable.

## Run

```sh
cd test
node --test                                  # all tests
node --test crystalviewer.test.js            # engine unit tests only
node --test decks.test.js                    # ../decks fixtures only
# or point at a specific build:
CV_FILE=../crystalviewer_2d_irreps_v2.2.27.html node --test
```

No dependencies beyond Node >= 18 (uses the built-in `node:test` runner).

## How it works

`cvloader.js` reads the HTML, extracts the single `<script>` block, evaluates
it in a fresh scope with a no-op `document`/`window` stub, and returns an
object exposing the internals listed in `EXPORTS`. `initUI()` never runs
(`DOMContentLoaded` is a no-op stub), so nothing touches the DOM/WebGL.

The loader is **version-tolerant**: an export that a given build does not
define comes back as `undefined` instead of throwing, so the same suite can
run against older files. Tests that need a newer symbol either guard on it or
use `cv.requireExport('NAME')`.

## Testing a specific version

Set `CV_FILE` to any CrystalViewer HTML file (absolute or relative to `test/`):

```sh
CV_FILE=../crystalviewer_2d_irreps_v2.2.29.html node --test crystalviewer.test.js
```

This is the intended workflow: drop in a new build, run the suite, see what
changed.

## What is covered

### `crystalviewer.test.js` — engine unit tests

- **Point-group identification** (`PG_closure`, `PG_conjugacyClasses`,
  `PG_identifyGroup`): C1…Oh, plus the D4h class-count regression and a
  round-trip through `SG_generate` point parts.
- **Decomposition** (`PG_decompose`): p→T1u and d→Eg+T2g in Oh, dimension
  sums, and the s-manifold-is-totally-symmetric invariant.
- **Space-group symbols** (`SG_generate`/`SG_parseSymbol`/`SG_expectedOrder`):
  op counts against ITA general positions, closure identity/inverse.
- **CIF parsing + class partition**: Fm-3m rocksalt → 8 atoms / 192 ops /
  one Na class + one Cl class.
- **Site analysis** (`symAnalyze`/`symManifold`): NaCl Na on (001) → D4h,
  p → A2u+Eu; hexagonal P6/mmm → D6h (the non-orthogonal-cell path).
- **Regression: `SYM.cacheByKey` is live** (Batch A fix #1).

### `tables.test.js` — character-table validation

- **Group axioms for every table in `PG_TABLES`**: row lengths, the
dimensionality theorem Σdᵢ²=|G|, #irreps = #classes, and the great
orthogonality theorem. Catches almost any transcription error with no
external reference.
- **Coverage**: exactly the 32 crystallographic point groups.
- **Reference p/d decompositions** for 30 groups, checked against the
standard (ITA/Bilbao) orbital-splitting tables — this validates the **labels**,
not just the numbers. Groups are built from explicit Cartesian generators, so
the test does not assume the tables are self-consistent.

### `spacegroups.test.js` — the 230 space-group symbols

Enumerates all 230 ITA standard short H-M symbols and asserts, for each:

- it generates from the symbol (no refusal);
- the operation count equals the ITA general-position multiplicity;
- the operation set is a valid group (no duplicates, identity present, closed
  under composition modulo the centring translations);
- a general point maps to exactly MULT distinct positions.

This pins the "230/230 complete" claim so it cannot silently regress.  The
reference multiplicity per space-group number is the ITA standard-setting
value; if a symbol disagrees with the generator, the multiplicity is the
authoritative cross-check.

### `decks.test.js` — structure fixtures

Every `.cif` in `../decks` is paired (in `decks.fixtures.js`) with the
symmetry results it should produce: operation count, atom count, and - for
**every site class** - the site-group name and the p-manifold irrep labels.
Add a deck and its expected values together; a guard test asserts the two
lists stay in sync.  The expectations are cross-referenced against
`../TESTGUIDE_SG_PACK.md`; where the guide's shorthand disagrees with the
crystallographic tables, the tables win and the fixture note says so.

#### Plane-adapted results

Each fixture may also carry a `planes` map: expected site group and p-manifold
for the **first site class** on specific (h,k,l) planes in `slab` mode (the UI
default, which keeps only operations that preserve the plane).  This captures
the plane-DEPENDENCE of the site group, which full mode hides:

| deck | plane | slab site group | p |
|---|---|---|---|
| t04 corundum (R axes) | (001) | C1 | A |
| t04 corundum (R axes) | **(111)** | **C3** | A+E1 |
| t05 corundum (H axes) | (001) | C3 | A+E1 |
| t07 rutile | (001) | D2h | B1u+B2u+B3u |
| t07 rutile | (111) | C2h | Au+Bu |

Why this matters: in the rhombohedral (`:R`) setting the 3-fold axis is along
**[111]**, so on **(001)** it is not perpendicular to the plane and slab mode
correctly drops it (C1), while on **(111)** the plane is perpendicular to the
axis and C3 survives.  The t04 **(111)** row is exactly the v2.2.29
rhombohedral fix: on v2.2.28 it returns no analysis (null), on v2.2.29 it
returns C3.

```
decks/                    the input structures
test/decks.fixtures.js    the expected values + WHY (crystallographic note)
test/decks.test.js        runs each deck and compares
```

Expectations are **independent**, not snapshots of the program's output:
op counts come from the space group, site groups from International Tables.
If a fixture and the code disagree, decide which is right before editing.

#### Known failures (`xfail`)

A fixture may carry an `xfail` string. The test then asserts the deck does
**not** yet meet its expected value (so the suite stays green while the bug is
open), and will **fail loudly** once it is fixed, prompting you to drop the
`xfail`. There are currently none.

Previously `t04_corundum_R_axes.cif` (rhombohedral / non-orthogonal cell) was
an `xfail`: the site-group rotations `R = A M A⁻¹` are irrational, and
`PG_closure`/`PG_order` compared them with `PG_key` (a 1e-7 grid built for
integer matrices), so the closure never terminated and the site group was
lost. **Fixed in v2.2.29** (`PG_mClose` tolerance comparison); the `xfail` was
removed. Running the suite against v2.2.28 or earlier now correctly *fails*
t04 — that is the regression the fix addresses.

#### Version-guarded tests

Some tests pin behaviour introduced in a specific build (e.g. the
rhombohedral closure fix in v2.2.29, the `SYM.cacheByKey` fix in v2.2.28).
They `skip` with a clear reason when run against an older file, so the suite
stays usable across versions while still failing on genuinely broken output.

## Adding tests

Put expectations from a *validated* source (textbook character table, ITA op
count, the viewer's own documented behaviour). If a test and the code
disagree, decide which is right before changing either. Multiplicities and
projection traces carry ~1e-15 floating-point noise, so round before comparing
integers (see the decomposition tests).

To expose another internal, add its name to `EXPORTS` in `cvloader.js`.

### Adding a deck fixture

1. Drop the `.cif` into `../decks`.
2. Add an entry to `decks.fixtures.js` with `file`, `symbol`, `ops`, `atoms`,
   a `sites` array (`{cls, group, p}` per class, in classPartition order), an
   optional `planes` map (`{'001': {group, p}, '111': {group, p}}` for the
   first class in slab mode), and a `note` explaining the crystallographic
   basis. Use `xfail` if it exposes a known bug.
3. Run `node --test decks.test.js`. The sync guard will tell you if a deck is
   missing a fixture, and the per-deck failure names the class/plane that
   differed.
