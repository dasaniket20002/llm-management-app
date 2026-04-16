/*
  Warnings:

  - You are about to drop the `files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resource_role_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_id_fkey";

-- DropForeignKey
ALTER TABLE "organization" DROP CONSTRAINT "organization_image_file_id_fkey";

-- DropForeignKey
ALTER TABLE "resource_role_assignments" DROP CONSTRAINT "resource_role_assignments_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "resource_role_assignments" DROP CONSTRAINT "resource_role_assignments_role_id_fkey";

-- DropForeignKey
ALTER TABLE "resource_role_assignments" DROP CONSTRAINT "resource_role_assignments_subject_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "resource_role_assignments" DROP CONSTRAINT "resource_role_assignments_target_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permission" DROP CONSTRAINT "role_permission_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_image_file_id_fkey";

-- DropTable
DROP TABLE "files";

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "resource_role_assignments";

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_role_assignment" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "target_resource_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "subject_resource_id" UUID NOT NULL,
    "granted_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file" (
    "id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "display_name" TEXT,
    "extension" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_bucket_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_action_key" ON "permission"("action");

-- CreateIndex
CREATE INDEX "resource_role_assignment_is_active_expires_at_idx" ON "resource_role_assignment"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "resource_role_assignment_target_resource_id_subject_resourc_idx" ON "resource_role_assignment"("target_resource_id", "subject_resource_id", "is_active");

-- CreateIndex
CREATE INDEX "resource_role_assignment_target_resource_id_role_id_is_acti_idx" ON "resource_role_assignment"("target_resource_id", "role_id", "is_active");

-- CreateIndex
CREATE INDEX "resource_role_assignment_subject_resource_id_is_active_idx" ON "resource_role_assignment"("subject_resource_id", "is_active");

-- CreateIndex
CREATE INDEX "resource_role_assignment_target_resource_id_is_active_idx" ON "resource_role_assignment"("target_resource_id", "is_active");

-- CreateIndex
CREATE INDEX "resource_role_assignment_expires_at_idx" ON "resource_role_assignment"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "resource_role_assignment_subject_resource_id_target_resourc_key" ON "resource_role_assignment"("subject_resource_id", "target_resource_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_storage_key_key" ON "file"("storage_key");

-- CreateIndex
CREATE INDEX "file_storage_bucket_id_idx" ON "file"("storage_bucket_id");

-- CreateIndex
CREATE INDEX "file_storage_key_idx" ON "file"("storage_key");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_role_assignment" ADD CONSTRAINT "resource_role_assignment_target_resource_id_fkey" FOREIGN KEY ("target_resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_role_assignment" ADD CONSTRAINT "resource_role_assignment_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_role_assignment" ADD CONSTRAINT "resource_role_assignment_subject_resource_id_fkey" FOREIGN KEY ("subject_resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_role_assignment" ADD CONSTRAINT "resource_role_assignment_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_id_fkey" FOREIGN KEY ("id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
