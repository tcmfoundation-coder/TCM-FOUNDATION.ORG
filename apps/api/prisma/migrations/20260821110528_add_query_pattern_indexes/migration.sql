-- CreateIndex
CREATE INDEX "ApplicationSubmission_callForApplicationId_submittedAt_idx" ON "ApplicationSubmission"("callForApplicationId", "submittedAt");

-- CreateIndex
CREATE INDEX "Article_isPublished_publishedAt_idx" ON "Article"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_isPublished_publishedAt_idx" ON "BlogPost"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "CallForApplication_status_openDate_idx" ON "CallForApplication"("status", "openDate");

-- CreateIndex
CREATE INDEX "Download_isPublished_createdAt_idx" ON "Download"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "Media_type_createdAt_idx" ON "Media"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_isPublished_type_deadline_idx" ON "Opportunity"("isPublished", "type", "deadline");

-- CreateIndex
CREATE INDEX "Program_isPublished_createdAt_idx" ON "Program"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "Spotlight_isPublished_publishedAt_idx" ON "Spotlight"("isPublished", "publishedAt");

