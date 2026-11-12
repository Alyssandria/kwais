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
   | `energy_kcal` | Optional. Calories per 100 g. Files without this column still import and keep any stored values |

3. Import it. The file is checked first, and nothing is written if any row has a problem.

   ```bash
   pnpm db:import-foods path/to/foods.csv
   ```

When a real record has the same name or local name as a sample one, the matcher prefers the
verified record. Give real records the names patients type ("kanin", "rice") so they win.
Recipes stay in `sample-foods.ts` for now; their ingredients can point at any record.

## The PhilFCT base set (150 foods)

`philfct-base-selection.csv` picks 150 PhilFCT foods that cover everyday Filipino meals: rice,
bread and noodles, root crops, vegetables, beans and tofu, fruit, fish and seafood, meat, processed
meat, eggs, milk, fats, condiments, drinks and snacks. It holds only our own work:

| Column | Meaning |
| --- | --- |
| `source_ref` | PhilFCT food ID (for example `A020`) |
| `local_names` | What patients type, in Tagalog and English, separated by `\|` |
| `category` | Our grouping |
| `portions` | Household units in grams of the edible part, for example `tasa=160` |

The nutrient values are not in this repository. PhilFCT belongs to DOST-FNRI and this repository is
public, so the values are joined in on your machine:

1. Download `fnri_detailed_nutritional_data.csv` from
   [tamayodb/fnri-food-composition-scraper](https://github.com/tamayodb/fnri-food-composition-scraper).
   It is a copy of the PhilFCT online database (1,542 foods). It matched a second, independent copy
   ([nedpals/fct-fnri-api](https://github.com/nedpals/fct-fnri-api)) on every sodium, potassium,
   phosphorus, protein and energy value.
2. Build the import file. Nothing is written if an ID is unknown or a value is not a number:

   ```bash
   pnpm db:build-philfct path/to/fnri_detailed_nutritional_data.csv
   ```

   This writes `philfct-base.csv` (ignored by git) and reports how many foods have each nutrient.
3. Check the rows against PhilFCT Online (or the 2019 printed tables), set `verified` to `true` on each
   row you checked, then import:

   ```bash
   pnpm db:import-foods prisma/seed-data/philfct-base.csv
   ```

Things to know about this set:

- **Potassium is often not reported by PhilFCT.** Those cells stay blank, so analyses show the
  value as not reported instead of 0. Fill gaps from USDA FoodData Central as separate `USDA_FDC` rows.
- **Values are per 100 g edible portion.** Portion grams are the edible part (no bones, peel or shell).
- **Portion weights are our estimates** of common household measures. Check them against the
  FNRI Food Exchange Lists before the study.
- **Raw and cooked differ.** Meat, fish and most vegetables use the raw record, which also suits
  recipes. Cooked records are used where people name the cooking ("pritong bangus", "nilagang itlog").
- **Home-cooked dishes are not in PhilFCT** (adobo, sinigang, tinola). Its mixed dishes are mostly canned,
  so those stay as recipes. Canned dishes in this set do not use generic names like "adobo".
- `energy_kcal` is imported as calories. The extra columns `fnri_alternate_name` and
  `edible_portion_pct` are only for checking rows against PhilFCT; the importer ignores them.
- Cite PhilFCT (DOST-FNRI) with the food ID wherever values are shown, and ask FNRI for written
  permission to use the data in the study.
