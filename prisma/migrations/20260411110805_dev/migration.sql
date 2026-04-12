/*
  Warnings:

  - A unique constraint covering the columns `[image]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_image_key" ON "user"("image");
