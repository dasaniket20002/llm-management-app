/*
  Warnings:

  - You are about to drop the column `checksum_sha256` on the `files` table. All the data in the column will be lost.
  - Made the column `mime_type` on table `files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extension` on table `files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `size_bytes` on table `files` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "files_checksum_sha256_idx";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "checksum_sha256",
ALTER COLUMN "mime_type" SET NOT NULL,
ALTER COLUMN "extension" SET NOT NULL,
ALTER COLUMN "size_bytes" SET NOT NULL;
