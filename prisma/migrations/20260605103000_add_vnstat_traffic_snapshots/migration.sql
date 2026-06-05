ALTER TABLE "Server" ADD COLUMN "vnstatEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Server" ADD COLUMN "vnstatSshUser" TEXT NOT NULL DEFAULT 'root';
ALTER TABLE "Server" ADD COLUMN "vnstatSshPort" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "Server" ADD COLUMN "vnstatInterface" TEXT;
ALTER TABLE "Server" ADD COLUMN "vnstatLastCollectedAt" DATETIME;
ALTER TABLE "Server" ADD COLUMN "vnstatLastError" TEXT;

CREATE TABLE "VnstatTrafficSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" INTEGER NOT NULL,
    "rxBytes" BIGINT NOT NULL DEFAULT 0,
    "txBytes" BIGINT NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VnstatTrafficSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "VnstatTrafficSnapshot_serverId_capturedAt_idx" ON "VnstatTrafficSnapshot"("serverId", "capturedAt");
CREATE INDEX "VnstatTrafficSnapshot_capturedAt_idx" ON "VnstatTrafficSnapshot"("capturedAt");
