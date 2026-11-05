/* cases-NN.apex (GENERATED) — RC support Cases mirroring the articles.
 * Run each batch: sf apex run --target-org <your-org-alias> --file <file> */
// row: [subject, description, vehicleCategory, problemType, priority]
List<List<String>> rows = new List<List<String>>{
  new List<String>{'RC: Warranty on a charger or accessory','My charger stopped working. How do I handle a warranty claim? This started recently and I am not sure what changed.','Other','Returns & Warranty','Medium'},
  new List<String>{'RC: Best way to store LiPo packs','How should I store my LiPo packs between sessions so they stay healthy?','Other','Something Else','Low'},
  new List<String>{'RC: Best way to store LiPo packs','How should I store my LiPo packs between sessions so they stay healthy? I have tried the basics but no luck. Any advice?','Other','Something Else','Low'},
  new List<String>{'RC: Best way to store LiPo packs','How should I store my LiPo packs between sessions so they stay healthy? This started recently and I am not sure what changed.','Other','Something Else','Low'}
};
List<Case> cs = new List<Case>();
for (List<String> r : rows) {
  cs.add(new Case(Subject=r[0], Description=r[1], Vehicle_Category__c=r[2],
    Problem_Type__c=r[3], Priority=r[4], Origin='Web', Status='Closed'));
}
insert cs;
System.debug('CASES batch 2/2: inserted '+cs.size());
