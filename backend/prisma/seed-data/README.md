# Food data

K-WAIS works out every nutrient number from these tables. The AI never supplies one.

## What is here now

`sample-foods.ts` holds about 90 common Filipino and international foods and 10 mixed dishes
(adobo, sinigang, pinakbet, tinola and others, broken into ingredients).

**The values are approximate sample data for development.** They are rounded figures of the kind
found in food composition tables, not copies of PhilFCT or USDA records, and nobody has checked
them against those sources. Every sample row is stored with `verified = false` and a `sourceRef`
starting with `sample:`, so:

- results that use them are tagged **Estimated**, never **Verified**
- each analysis lists the unverified foods it used in its data notes

```bash
pnpm db:seed      # load or refresh the sample tables (also runs after pnpm db:reset)
```

## Replacing them with real records before the study

1. Collect the records your study needs:
   - **PhilFCT** (DOST-FNRI), for Filipino foods. Note each food's ID (for example `D173`).
   - **USDA FoodData Central**, for international foods. Note each FDC ID.
2. Put them in a CSV with these columns (values per 100 g edible portion; leave a value blank
   if the source does not report it, never type 0 for "unknown"):

   ```csv
   source,source_ref,name,local_names,category,sodium_mg,potassium_mg,phosphorus_mg,protein_g,verified,portions
   PH_FCT,D173,"Spinach, Philippine, leaves",alugbati|spinach,vegetable,16,557,25,2.7,true,tasa=30
   ```

   | Column | Meaning |
   | --- | --- |
   | `source` | `PH_FCT`, `USDA_FDC`, or `custom` |
   | `source_ref` | The record's ID in that source |
   | `local_names` | Other names people type, separated by `\|` (Tagalog, English, regional) |
   | `verified` | `true` only after you have checked the row against the source |
   | `portions` | Household units, `unit=grams` separated by `\|`. Units: `tasa`, `sandok`, `mangkok`, `piraso`, `hiwa`, `baso`, `lata`, `pakete`, `tbsp`, `tsp`, `serving` |

3. Import it. The file is checked first, and nothing is written if any row has a problem.

   ```bash
   pnpm db:import-foods path/to/foods.csv
   ```

When a real record has the same name or local name as a sample one, the matcher prefers the
verified record. Give real records the names patients type ("kanin", "rice") so they win.
Recipes stay in `sample-foods.ts` for now; their ingredients can point at any record.
