-- Calories and fluid (Section 17)
-- Adds energy (kcal) to foods, energy and fluid targets, and drinks with amounts.
-- Drinks logged before this change had no amount: each becomes one glass (baso), marked as assumed.

-- CreateEnum
CREATE TYPE "DrinkUnit" AS ENUM ('baso', 'tasa', 'lata', 'ml');

-- AlterEnum (PostgreSQL 12+ allows this inside a transaction; the new values are not used below)
ALTER TYPE "Nutrient" ADD VALUE 'energy';
ALTER TYPE "Nutrient" ADD VALUE 'fluid';

-- AlterTable
ALTER TABLE "food_items" ADD COLUMN "energy_kcal" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "meal_drinks" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(7,2) NOT NULL,
    "unit" "DrinkUnit" NOT NULL,
    "assumed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_drinks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_drinks_meal_id_name_key" ON "meal_drinks"("meal_id", "name");

-- AddForeignKey
ALTER TABLE "meal_drinks" ADD CONSTRAINT "meal_drinks_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep existing drinks: one assumed glass each
INSERT INTO "meal_drinks" ("id", "meal_id", "name", "quantity", "unit", "assumed")
SELECT gen_random_uuid(), m."id", d.name, 1, 'baso', true
FROM "meals" m
CROSS JOIN LATERAL (SELECT DISTINCT unnest(m."drinks") AS name) d;

-- AlterTable
ALTER TABLE "meals" DROP COLUMN "drinks";
