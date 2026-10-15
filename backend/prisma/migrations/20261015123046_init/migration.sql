-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'doctor');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'locked', 'pending_deletion');

-- CreateEnum
CREATE TYPE "ValueSource" AS ENUM ('patient_entered', 'clinician_verified');

-- CreateEnum
CREATE TYPE "DialysisStatus" AS ENUM ('none', 'hemodialysis', 'peritoneal', 'unknown');

-- CreateEnum
CREATE TYPE "Nutrient" AS ENUM ('sodium', 'potassium', 'phosphorus', 'protein');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('PH_FCT', 'USDA_FDC', 'recipe', 'custom');

-- CreateEnum
CREATE TYPE "MealCategory" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('draft', 'saved', 'analysed');

-- CreateEnum
CREATE TYPE "CondimentAmount" AS ENUM ('konti', 'tsp', 'tbsp', 'marami');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('ok', 'unavailable', 'mock');

-- CreateEnum
CREATE TYPE "LabTest" AS ENUM ('potassium', 'phosphorus', 'sodium', 'creatinine', 'egfr', 'bun', 'albumin', 'calcium', 'hemoglobin', 'bicarbonate', 'pth', 'uric_acid', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('meal_reminder', 'analysis_ready', 'account');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('terms', 'health_data', 'ai_processing', 'reminders');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('export', 'deletion');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('pending', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('login', 'login_failed', 'read', 'create', 'update', 'delete', 'export', 'access_denied');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'patient',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "patient_code" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_year" INTEGER,
    "sex" TEXT,
    "dietary_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ckd_stage" TEXT,
    "ckd_stage_source" "ValueSource",
    "dialysis_status" "DialysisStatus" NOT NULL DEFAULT 'unknown',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "onboarding_done_at" TIMESTAMP(3),
    "reminder_time" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_targets" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutrient" "Nutrient" NOT NULL,
    "daily_max" DECIMAL(10,2),
    "daily_min" DECIMAL(10,2),
    "unit" TEXT NOT NULL,
    "source" "ValueSource" NOT NULL DEFAULT 'patient_entered',
    "note" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "test" "LabTest" NOT NULL,
    "test_label" TEXT,
    "value_enc" BYTEA NOT NULL,
    "ref_low_enc" BYTEA,
    "ref_high_enc" BYTEA,
    "unit" TEXT NOT NULL,
    "collected_on" DATE NOT NULL,
    "lab_name" TEXT,
    "source" "ValueSource" NOT NULL DEFAULT 'patient_entered',
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "local_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "source" "FoodSource" NOT NULL,
    "source_ref" TEXT NOT NULL,
    "sodium_mg" DECIMAL(10,2),
    "potassium_mg" DECIMAL(10,2),
    "phosphorus_mg" DECIMAL(10,2),
    "protein_g" DECIMAL(10,2),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_portions" (
    "id" UUID NOT NULL,
    "food_item_id" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "grams" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "food_portions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "grams_per_100g_dish" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "eaten_at" TIMESTAMP(3) NOT NULL,
    "category" "MealCategory" NOT NULL,
    "raw_text" TEXT NOT NULL,
    "drinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cooking_methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "status" "MealStatus" NOT NULL DEFAULT 'draft',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_condiments" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" "CondimentAmount" NOT NULL,

    CONSTRAINT "meal_condiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "food_item_id" UUID,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "grams" DECIMAL(8,2),
    "preparation" TEXT,
    "match_confidence" DECIMAL(4,3),
    "amount_guessed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_analyses" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "engine_version" TEXT NOT NULL,
    "prompt_version" TEXT,
    "model" TEXT,
    "totals" JSONB NOT NULL,
    "item_breakdown" JSONB NOT NULL,
    "inputs_snapshot" JSONB NOT NULL,
    "score" SMALLINT,
    "score_band" TEXT,
    "ai_output" JSONB,
    "ai_status" "AiStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'pending',
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" "Role",
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "patient_id" UUID,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_patient_code_key" ON "patient_profiles"("patient_code");

-- CreateIndex
CREATE INDEX "nutrition_targets_patient_id_nutrient_effective_from_idx" ON "nutrition_targets"("patient_id", "nutrient", "effective_from" DESC);

-- CreateIndex
CREATE INDEX "lab_results_patient_id_test_collected_on_idx" ON "lab_results"("patient_id", "test", "collected_on" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "food_items_source_source_ref_key" ON "food_items"("source", "source_ref");

-- CreateIndex
CREATE UNIQUE INDEX "food_portions_food_item_id_unit_key" ON "food_portions"("food_item_id", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_ingredient_id_key" ON "recipe_ingredients"("recipe_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "meals_patient_id_eaten_at_idx" ON "meals"("patient_id", "eaten_at" DESC);

-- CreateIndex
CREATE INDEX "meals_patient_id_status_idx" ON "meals"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "meal_condiments_meal_id_name_key" ON "meal_condiments"("meal_id", "name");

-- CreateIndex
CREATE INDEX "meal_items_meal_id_idx" ON "meal_items"("meal_id");

-- CreateIndex
CREATE INDEX "meal_analyses_patient_id_created_at_idx" ON "meal_analyses"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "meal_analyses_meal_id_version_key" ON "meal_analyses"("meal_id", "version");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "consent_records_user_id_consent_type_created_at_idx" ON "consent_records"("user_id", "consent_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "data_requests_user_id_idx" ON "data_requests"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_at_idx" ON "audit_logs"("patient_id", "at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_at_idx" ON "audit_logs"("actor_id", "at" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "food_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_condiments" ADD CONSTRAINT "meal_condiments_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_analyses" ADD CONSTRAINT "meal_analyses_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_analyses" ADD CONSTRAINT "meal_analyses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
