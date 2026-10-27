-- AlterTable
ALTER TABLE "patient_profiles" ADD COLUMN     "ckd_stage_verified_at" TIMESTAMP(3),
ADD COLUMN     "ckd_stage_verified_by" UUID;

-- AlterTable
ALTER TABLE "nutrition_targets" ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" UUID;

-- AlterTable
ALTER TABLE "lab_results" ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" UUID;

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_notes_patient_id_created_at_idx" ON "clinical_notes"("patient_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_ckd_stage_verified_by_fkey" FOREIGN KEY ("ckd_stage_verified_by") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
