-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "isStudent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTeacher" BOOLEAN NOT NULL DEFAULT false;
