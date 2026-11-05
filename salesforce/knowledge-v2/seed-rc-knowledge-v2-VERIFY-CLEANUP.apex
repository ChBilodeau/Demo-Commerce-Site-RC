/* seed-rc-knowledge-v2-VERIFY-CLEANUP.apex
 * VERIFY count (run in Query Editor):
 *   SELECT COUNT() FROM Knowledge__kav WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online'
 * CLEANUP (archive + delete the whole rck- set) — run in Execute Anonymous: */
for (Knowledge__kav k : [SELECT KnowledgeArticleId FROM Knowledge__kav
                         WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online']) {
  KbManagement.PublishingService.archiveOnlineArticle(k.KnowledgeArticleId, null);
}
delete [SELECT Id FROM Knowledge__kav WHERE UrlName LIKE 'rck-%'];
System.debug('rck- articles archived and deleted.');
