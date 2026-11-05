/*
 * delete-all-knowledge.apex  (one-off cleanup, DML-limit-safe)
 * -----------------------------------------------------------------------------
 * DESTRUCTIVE. Clears ALL Knowledge articles from the org in two phases, using
 * the Knowledge publishing API (direct DML delete is NOT allowed on
 * Knowledge__kav). Each publishing call is one DML, so we cap at 120 per run.
 *
 * Phase 1: archive Online articles (prerequisite for deletion).
 * Phase 2: once nothing is Online, delete the Archived versions.
 *
 * Run REPEATEDLY until it reports Online=0 and Archived=0:
 *   sf apex run --target-org VSCodePlayground --file salesforce/knowledge-v2/delete-all-knowledge.apex
 * -----------------------------------------------------------------------------
 */
Integer onlineLeft = [SELECT COUNT() FROM Knowledge__kav WHERE PublishStatus = 'Online'];

if (onlineLeft > 0) {
  // Phase 1 — archive up to 120 online articles.
  Integer archived = 0;
  for (Knowledge__kav k : [SELECT KnowledgeArticleId FROM Knowledge__kav WHERE PublishStatus = 'Online' LIMIT 120]) {
    try { KbManagement.PublishingService.archiveOnlineArticle(k.KnowledgeArticleId, null); archived++; }
    catch (Exception e) { System.debug('Archive failed: ' + e.getMessage()); }
  }
  System.debug('PHASE1 archived ' + archived + ' this run.');
} else {
  // Phase 2 — permanently delete up to 120 archived articles.
  Integer deleted = 0;
  for (Knowledge__kav k : [SELECT KnowledgeArticleId FROM Knowledge__kav WHERE PublishStatus = 'Archived' LIMIT 120]) {
    try { KbManagement.PublishingService.deleteArchivedArticle(k.KnowledgeArticleId); deleted++; }
    catch (Exception e) { System.debug('Delete failed: ' + e.getMessage()); }
  }
  System.debug('PHASE2 deleted ' + deleted + ' this run.');
}

Integer online = [SELECT COUNT() FROM Knowledge__kav WHERE PublishStatus = 'Online'];
Integer archivedLeft = [SELECT COUNT() FROM Knowledge__kav WHERE PublishStatus = 'Archived'];
Integer draftLeft = [SELECT COUNT() FROM Knowledge__kav WHERE PublishStatus = 'Draft'];
System.debug('STATUS online=' + online + ' archived=' + archivedLeft + ' draft=' + draftLeft);
