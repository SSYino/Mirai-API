-- DropForeignKey
ALTER TABLE "Sessions" DROP CONSTRAINT "Sessions_userId_fkey";

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "assignments" JSONB,
ADD COLUMN     "classes" JSONB;

-- CreateTable
CREATE TABLE "Classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "descriptionHeading" TEXT,
    "description" TEXT,
    "room" TEXT,
    "ownerId" TEXT NOT NULL,
    "creationTime" TIMESTAMPTZ NOT NULL,
    "updateTime" TIMESTAMPTZ NOT NULL,
    "courseState" TEXT NOT NULL,
    "alternateLink" TEXT NOT NULL,
    "teacherGroupEmail" TEXT NOT NULL,
    "courseGroupEmail" TEXT NOT NULL,
    "guardiansEnabled" BOOLEAN NOT NULL,
    "calendarId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "usersId" TEXT,

    CONSTRAINT "Classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseWorkId" TEXT NOT NULL,
    "creationTime" TIMESTAMPTZ NOT NULL,
    "updateTime" TIMESTAMPTZ NOT NULL,
    "state" TEXT NOT NULL,
    "alternateLink" TEXT NOT NULL,
    "courseWorkType" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id","userId")
);

-- CreateTable
CREATE TABLE "Event" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("eventId","userId")
);

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_calendarId_userId_fkey" FOREIGN KEY ("calendarId", "userId") REFERENCES "Calendar"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
