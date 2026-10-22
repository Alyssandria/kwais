-- CreateEnum
CREATE TYPE "CareLinkStatus" AS ENUM ('pending', 'active', 'declined', 'cancelled', 'ended');

-- CreateEnum
CREATE TYPE "CareParty" AS ENUM ('doctor', 'patient');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'care_team';

-- CreateTable
CREATE TABLE "care_links" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "status" "CareLinkStatus" NOT NULL DEFAULT 'pending',
    "initiated_by" "CareParty" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "ended_by" "CareParty",

    CONSTRAINT "care_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_invites" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "care_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "care_links_doctor_id_status_idx" ON "care_links"("doctor_id", "status");

-- CreateIndex
CREATE INDEX "care_links_patient_id_status_idx" ON "care_links"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "care_invites_token_hash_key" ON "care_invites"("token_hash");

-- CreateIndex
CREATE INDEX "care_invites_patient_id_idx" ON "care_invites"("patient_id");

-- AddForeignKey
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_invites" ADD CONSTRAINT "care_invites_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
