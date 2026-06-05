CREATE TABLE "DynamicAccessKeyTrafficSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dynamicAccessKeyId" INTEGER NOT NULL,
    "dataUsage" BIGINT NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DynamicAccessKeyTrafficSnapshot_dynamicAccessKeyId_fkey" FOREIGN KEY ("dynamicAccessKeyId") REFERENCES "DynamicAccessKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DynamicAccessKeyTrafficSnapshot_dynamicAccessKeyId_capturedAt_idx" ON "DynamicAccessKeyTrafficSnapshot"("dynamicAccessKeyId", "capturedAt");
CREATE INDEX "DynamicAccessKeyTrafficSnapshot_capturedAt_idx" ON "DynamicAccessKeyTrafficSnapshot"("capturedAt");
