-- CreateTable
CREATE TABLE "ServerTrafficSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serverId" INTEGER NOT NULL,
    "totalDataUsage" BIGINT NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerTrafficSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServerTrafficSnapshot_serverId_capturedAt_idx" ON "ServerTrafficSnapshot"("serverId", "capturedAt");

-- CreateIndex
CREATE INDEX "ServerTrafficSnapshot_capturedAt_idx" ON "ServerTrafficSnapshot"("capturedAt");
