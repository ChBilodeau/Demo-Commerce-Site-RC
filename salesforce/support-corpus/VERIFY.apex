System.debug('Articles online: ' + [SELECT COUNT() FROM Knowledge__kav WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online']);
System.debug('RC cases: ' + [SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%']);
