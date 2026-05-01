-- Add optional project metadata from the design docs.
ALTER TABLE "Project" ADD COLUMN "period" TEXT;
ALTER TABLE "Project" ADD COLUMN "githubUrl" TEXT;

-- Persist React Flow node positions per project technology.
ALTER TABLE "ProjectTechnology" ADD COLUMN "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ProjectTechnology" ADD COLUMN "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0;
