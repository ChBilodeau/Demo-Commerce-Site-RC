/*
 * seed-rc-resolved-cases.apex
 * -----------------------------------------------------------------------------
 * Creates ~300 RESOLVED RC support cases that each map to one of the 51 RC
 * Knowledge articles, with a resolution Case Comment (and a best-effort
 * CaseArticle link to the solving article). This gives Coveo case-deflection ML
 * a strong signal: case text -> resolution -> solving article.
 *
 * What each generated case has:
 *   - Subject/Description describing a problem that the article solves
 *   - Status = Closed, matching Type / Reason / Priority
 *   - A public CaseComment with the solution + article reference
 *   - (best effort) a CaseArticle linking the actual Knowledge__kav article
 *
 * All subjects are prefixed "RC:" so they clean up with the other seed data:
 *   delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 *
 * HOW TO RUN:
 *   sf apex run --target-org VSCodePlayground --file salesforce/seed-rc-resolved-cases.apex
 *
 * Avoids anonymous-Apex pitfalls: no inner classes; no reserved-word variables.
 * -----------------------------------------------------------------------------
 */

// Per-article mapping row:
//   [ articleUrlName, Type, Reason, Priority,
//     problemSubjects (||), problemDescriptions (||), resolutionText ]
// The articleUrlName ties the case to a specific published Knowledge article so
// the resolution comment and CaseArticle link point at the right solution.
List<List<String>> articleMap = new List<List<String>>{
  new List<String>{'rc-lipo-wont-charge','Electrical','Breakdown','High',
    'LiPo pack will not charge||battery dead, charger errors||one cell reads 0V',
    'My LiPo will not take a charge and the balance charger shows a connection error.||The charger beeps and stops; one cell seems completely dead.||Pack total voltage is very low and the charger refuses to start.',
    'Resolved: The pack had a dead cell (0.0V). We confirmed via per-cell measurement, advised the customer to retire and recycle the pack safely, and recommended storing future packs at 3.8V/cell and never charging a hot or puffed pack. See KB: LiPo battery will not charge.'},
  new List<String>{'rc-lipo-puffed','Electrical','Breakdown','High',
    'LiPo puffed up after a run||swollen battery concern',
    'My battery is swollen after a 20 minute run and I am worried.||The pack puffed and I am not sure if it is safe to keep using.',
    'Resolved: Confirmed the pack was puffed from heat/age. Advised stopping use immediately, discharging to storage voltage if possible, and recycling. Provided prevention tips (cool between runs, avoid deep discharge). See KB: What to do with a puffed LiPo.'},
  new List<String>{'rc-lipo-runtime','Electrical','Performance','Medium',
    'runtime dropped a lot||pack runs hot and short||less runtime than before',
    'A full charge now lasts only minutes and the pack gets hot.||Runtime dropped sharply even though nothing changed.',
    'Resolved: High internal resistance indicated an aging pack. Verified gearing was not over-geared and drivetrain spun freely. Recommended replacing the worn pack. See KB: Runtime dropped and pack runs hot.'},
  new List<String>{'rc-choose-charger','Electrical','Installation','Low',
    'which charger settings for new pack||how to set charge rate',
    'I have a new pack and need the right charger settings.||Not sure what charge rate is safe for my battery.',
    'Resolved: Walked the customer through setting chemistry to LiPo, correct cell count, and a 1C charge rate with balance charging. See KB: Choosing charger settings for a new pack.'},
  new List<String>{'rc-parallel-charging','Electrical','Equipment Complexity','Low',
    'parallel charging multiple packs||is parallel charging safe',
    'Can I parallel charge four identical 2S packs safely?||What board and settings for parallel charging?',
    'Resolved: Confirmed packs were same cell count and similar charge; advised a fused parallel board, summing current at 1C, never mixing chemistries. See KB: Parallel charging LiPo packs safely.'},
  new List<String>{'rc-motor-cuts-out','Electronic','Performance','High',
    'motor cuts out at full throttle||power loss under load||thermal cutoff suspected',
    'Motor runs until I punch it, then cuts out.||Loses power under load then recovers.',
    'Resolved: ESC thermal protection was triggering. Reduced pinion by two teeth, added ESC cooling, and confirmed the pack could supply the current. See KB: Brushless motor cuts out under load.'},
  new List<String>{'rc-motor-kv','Electronic','Equipment Complexity','Low',
    'which motor KV to choose||understanding KV and turns',
    'I do not understand KV ratings for my terrain.||What KV should I run for grass without overheating?',
    'Resolved: Explained KV vs turns and recommended a moderate KV for loose surfaces to manage heat. See KB: Understanding motor KV and turns.'},
  new List<String>{'rc-brushed-to-brushless','Electronic','Installation','Low',
    'brushed to brushless upgrade||what to change for brushless',
    'I want to convert my brushed truck to brushless.||What motor/ESC/battery combo should I use?',
    'Resolved: Recommended a matched brushless motor+ESC, verified connectors/battery current capacity, and advised recalibrating the ESC to the radio. See KB: Upgrading from brushed to brushless.'},
  new List<String>{'rc-esc-calibration','Electronic','Installation','High',
    'ESC will not calibrate||cannot arm ESC||throttle setup fails',
    'Calibration keeps beeping and never arms.||The ESC will not arm with my radio.',
    'Resolved: Performed throttle calibration in the correct order (transmitter on, trims neutral, register full/brake/neutral). ESC armed normally. See KB: Calibrating your ESC to the transmitter.'},
  new List<String>{'rc-esc-error-codes','Electronic','Breakdown','Medium',
    'ESC flashing error code||ESC LED repeating flash',
    'The ESC blinks a repeating pattern and will not move.||What does the ESC error flash mean?',
    'Resolved: Matched the flash pattern to a low-voltage fault; recharging the pack cleared it. Provided the error-code reference. See KB: Reading ESC error flashes.'},
  new List<String>{'rc-esc-overheat','Electronic','Performance','Medium',
    'ESC overheats and shuts down||ESC cuts power when hot',
    'After a few minutes the ESC overheats and stops.||Power cuts until the ESC cools.',
    'Resolved: Lowered the pinion, added a cooling fan, and removed foam wrapping around the ESC. Overheating stopped. See KB: ESC overheats and shuts down.'},
  new List<String>{'rc-no-reverse','Electronic','Installation','Low',
    'no reverse after ESC reset||only brake no reverse',
    'After reprogramming I lost reverse.||I only get brake, not reverse.',
    'Resolved: Switched the ESC profile to forward/brake/reverse and explained the double-tap behavior. Reverse restored. See KB: No reverse after reprogramming the ESC.'},
  new List<String>{'rc-radio-bind','Electronic','Installation','High',
    'transmitter will not bind||receiver will not pair||bind light flashing',
    'The bind light flashes and never goes solid.||Cannot pair the receiver to the transmitter.',
    'Resolved: Re-ran the bind sequence with the bind plug and confirmed matching protocol; the receiver light went solid. See KB: Binding a transmitter and receiver.'},
  new List<String>{'rc-radio-glitch','Electronic','Performance','High',
    'range loss and glitching||servos twitch at distance',
    'Loses signal past a short distance and servos twitch.||Glitching when driving away.',
    'Resolved: Rerouted the antenna vertically and away from power wires and confirmed a solid BEC supply. Range and glitching fixed. See KB: Range loss and glitching.'},
  new List<String>{'rc-failsafe','Electronic','Installation','Medium',
    'failsafe not working||vehicle keeps rolling when TX off',
    'When I turn the transmitter off the vehicle keeps moving.||How do I set failsafe to stop it?',
    'Resolved: Programmed throttle failsafe to neutral/brake and tested by powering off the transmitter. Vehicle now stops on signal loss. See KB: Setting up failsafe.'},
  new List<String>{'rc-dual-rate-expo','Electronic','Equipment Complexity','Low',
    'dual rate and trim help||expo explained',
    'Explain dual rate, trim, and expo for a beginner.||How do I set these for a smooth drive?',
    'Resolved: Explained each setting and recommended reduced steering dual rate with some expo for a gentle first drive. See KB: Dual rate, trim, and expo explained.'},
  new List<String>{'rc-model-memory','Electronic','Equipment Complexity','Low',
    'saving model memories||two vehicles one radio',
    'How do I save separate settings for two vehicles?||Switching model profiles on my radio.',
    'Resolved: Created separate model memories per vehicle with their own trims/reversing and showed how to select the correct profile. See KB: Saving model memories.'},
  new List<String>{'rc-channel-reverse','Electronic','Installation','Low',
    'reversing a channel||steering backward after new radio',
    'Steering works backward on my new radio.||Throttle is reversed after a servo swap.',
    'Resolved: Flipped the affected channel in servo-reverse and recalibrated the ESC after reversing throttle. See KB: Reversing a steering or throttle channel.'},
  new List<String>{'rc-drone-drift','Electronic','Performance','High',
    'drone drifts in hover||quad will not hold position',
    'My quad drifts in GPS hold and circles.||It wanders and will not hold position.',
    'Resolved: Recalibrated the compass away from metal and re-leveled the accelerometer. Stable hover restored. See KB: Drone drifts in hover.'},
  new List<String>{'rc-drone-motor-flip','Electronic','Installation','High',
    'quad flips on takeoff||motor direction wrong',
    'The quad flips the instant I throttle up.||I think a motor spins the wrong way.',
    'Resolved: Corrected motor spin directions and prop orientation (CW/CCW on the right arms). Quad lifts cleanly. See KB: Quad flips on takeoff.'},
  new List<String>{'rc-fpv-bind','Electronic','Installation','Medium',
    'FPV video not binding||no picture in goggles',
    'I cannot get video in my FPV goggles.||How do I bind the VTX to the goggles?',
    'Resolved: Set matching band/channel on VTX and goggles and confirmed antenna attached before power-up. Video acquired. See KB: Setting up FPV video.'},
  new List<String>{'rc-gear-mesh','Mechanical','Equipment Complexity','Low',
    'how to set gear mesh||stop stripping gears',
    'I keep stripping gears; how do I set mesh?||What is the paper method?',
    'Resolved: Set correct backlash using the paper method; stripping stopped. See KB: Setting pinion and spur gear mesh.'},
  new List<String>{'rc-gear-ratio','Mechanical','Equipment Complexity','Low',
    'choosing a gear ratio||pinion spur for speed',
    'What gear ratio for more speed without heat?||How do pinion/spur affect temps?',
    'Resolved: Recommended changing one or two pinion teeth at a time while monitoring temps. See KB: Choosing a gear ratio.'},
  new List<String>{'rc-slipper-clutch','Mechanical','Equipment Complexity','Low',
    'slipper clutch adjustment||how tight should slipper be',
    'How should I set the slipper clutch?||When should it slip?',
    'Resolved: Set the slipper to just chirp on a hard launch then backed off slightly for high grip. See KB: Adjusting the slipper clutch.'},
  new List<String>{'rc-diff-leak','Mechanical','Breakdown','Medium',
    'differential leaking oil||diff seals worn',
    'My diff is leaking silicone oil.||Do I need new seals or a rebuild?',
    'Resolved: Rebuilt the diff with new X-ring seals and correct oil weight. Leak fixed. See KB: Differential leaking oil.'},
  new List<String>{'rc-driveshaft-popout','Mechanical','Breakdown','Medium',
    'driveshaft pops out||shaft unseats under power',
    'A driveshaft keeps popping out under acceleration.||How do I keep it seated?',
    'Resolved: Replaced worn cups and fitted a correct-length shaft with proper droop. Pop-outs stopped. See KB: Driveshaft pops out.'},
  new List<String>{'rc-shocks-bottom','Mechanical','Performance','Medium',
    'shocks bottoming out||bounces on landings',
    'Shocks bottom hard on jumps and the car bounces.||Change oil or springs?',
    'Resolved: Switched to heavier shock oil and stiffer springs with limiters; bottoming resolved. See KB: Shocks bottoming out on jumps.'},
  new List<String>{'rc-shock-rebuild','Mechanical','Breakdown','Low',
    'shocks leaking and spongy||rebuild shocks',
    'Oil is weeping from my shocks and they feel spongy.||Rebuild needed?',
    'Resolved: Rebuilt shocks with new seals, correct oil, and proper bleed so both sides match. See KB: Rebuilding leaking shocks.'},
  new List<String>{'rc-handling-rollover','Mechanical','Performance','Medium',
    'car rolls over in corners||traction rolling',
    'The buggy rolls over in tight corners.||How do I stop traction rolls?',
    'Resolved: Lowered CG, added sway bars, and adjusted tires to reduce rolling. See KB: Vehicle rolls over in corners.'},
  new List<String>{'rc-oversteer','Mechanical','Performance','Medium',
    'oversteer on throttle||rear steps out',
    'The rear snaps loose on throttle.||How do I reduce on-power oversteer?',
    'Resolved: Thicker rear diff oil and added rear toe-in reduced oversteer; advised smoother throttle. See KB: Reducing on-power oversteer.'},
  new List<String>{'rc-pulls-to-side','Mechanical','Performance','Medium',
    'vehicle pulls to one side||drifts with trim centered',
    'The truck pulls left even with trim centered.||Alignment or servo?',
    'Resolved: Equalized toe/camber side to side and confirmed the servo centered and saver was not bent. Tracks straight now. See KB: Vehicle pulls to one side.'},
  new List<String>{'rc-steering-stripped','Mechanical','Breakdown','High',
    'steering dead after crash||servo gears stripped',
    'Steering is dead with a grinding sound after a crash.||I think the servo gears stripped.',
    'Resolved: Replaced the stripped servo gear set and fitted a quality servo saver; recommended a metal-gear servo. Steering restored. See KB: Steering dead after a crash.'},
  new List<String>{'rc-steering-jitter','Mechanical','Performance','Medium',
    'steering jitters at center||front wheels shake',
    'Front wheels shake at a standstill.||Steering jitters around center.',
    'Resolved: Traced jitter to a failing servo; replacement plus removing linkage slop fixed it. See KB: Steering jitters at center.'},
  new List<String>{'rc-tire-gluing','Mechanical','Installation','Low',
    'tires coming unglued||tire separated from rim',
    'My tires keep separating from the rims.||How do I glue them properly?',
    'Resolved: Cleaned beads, mounted with inserts, and applied thin CA in sections while flexing the bead. Tires stayed seated. See KB: Gluing tires so they stay seated.'},
  new List<String>{'rc-tire-choice','Mechanical','Equipment Complexity','Low',
    'which tires for my surface||tire compound choice',
    'What tires for loose dirt?||Compound and tread for my track?',
    'Resolved: Recommended a pin/spike tread with a softer compound for loose dirt. See KB: Choosing tires for your surface.'},
  new List<String>{'rc-wheel-hex','Mechanical','Breakdown','Low',
    'wheel wobble stripped hex||rounded wheel hex',
    'A wheel wobbles and the hex is rounded.||Replace hex, axle, or both?',
    'Resolved: Replaced the rounded hex (and scored axle) with correct-width parts and torqued the nut. Wobble gone. See KB: Wobbling wheel and stripped hex.'},
  new List<String>{'rc-nitro-wont-start','Mechanical','Breakdown','High',
    'nitro engine will not start||engine floods',
    'My nitro will not fire and floods.||Glow plug lights but it will not start.',
    'Resolved: Cleared the flood (plug out, drain fuel), set needles to baseline, and it started. See KB: Nitro engine will not start.'},
  new List<String>{'rc-nitro-tuning','Mechanical','Performance','Medium',
    'nitro tuning help||engine idles then dies',
    'Engine dies after a few seconds.||Help tuning high and low needles.',
    'Resolved: Tuned low-speed needle for a stable idle and high-speed for a smoke trail to keep it cool. Runs cleanly. See KB: Tuning nitro high and low needles.'},
  new List<String>{'rc-bearings-service','Mechanical','Breakdown','Low',
    'gritty or seized bearings||bearings noisy after dirt',
    'Bearings feel gritty after a dusty run.||Some bearings seized after mud.',
    'Resolved: Cleaned and re-oiled serviceable bearings and replaced seized ones with rubber-sealed bearings. See KB: Servicing gritty or seized bearings.'},
  new List<String>{'rc-chassis-crack','Structural','Breakdown','Medium',
    'cracked chassis||chassis flexes and cracks',
    'The chassis is cracking near the motor mount.||Stiffer option available?',
    'Resolved: Replaced the cracked chassis and recommended a stiffer/aluminum option to prevent recurrence. See KB: Cracked chassis repair and upgrade.'},
  new List<String>{'rc-broken-arm','Structural','Breakdown','Medium',
    'broken suspension arm||A-arm snapped in crash',
    'A lower suspension arm snapped.||Which replacement fits?',
    'Resolved: Identified the correct arm for the model/position, replaced it, and inspected hinge pins and mounts. See KB: Replacing a broken suspension arm.'},
  new List<String>{'rc-body-repair','Structural','Breakdown','Low',
    'lexan body cracked||body post holes torn',
    'The polycarbonate body cracked.||The body post holes tore out.',
    'Resolved: Backed cracks with lexan patches and thick CA and reinforced post holes with adhesive washers. See KB: Repairing a cracked polycarbonate body.'},
  new List<String>{'rc-foam-wing','Structural','Breakdown','Medium',
    'foam wing cracked||wing broke on landing',
    'The foam wing cracked at the root.||Best glue and reinforcement?',
    'Resolved: Repaired with foam-safe CA and added a carbon spar across the break for strength. See KB: Repairing a cracked foam wing.'},
  new List<String>{'rc-boat-waterproof','Structural','Breakdown','High',
    'boat taking on water||hull leaking',
    'Water gets into the hull and soaks electronics.||How do I seal it?',
    'Resolved: Resealed the hatch gasket, siliconed the stuffing tube and wire exits, and protected the electronics. No more water. See KB: Sealing a leaking boat hull.'},
  new List<String>{'rc-electronics-waterproof','Structural','Installation','Low',
    'waterproofing electronics||wet grass running',
    'I want to run in wet grass safely.||How do I waterproof the electronics?',
    'Resolved: Used a sealed receiver box, greased connectors, applied conformal coating, and advised waterproof-rated servos/ESC. See KB: Waterproofing your electronics.'},
  new List<String>{'rc-led-install','Electrical','Installation','Low',
    'LED light kit install||where to plug lights',
    'I want to add an LED light kit.||Where does it connect?',
    'Resolved: Connected the kit to a spare channel/light port and confirmed minimal battery draw; secured wiring. See KB: Installing an LED light kit.'},
  new List<String>{'rc-first-rc','Other','Equipment Complexity','Low',
    'which first RC to buy||beginner RC recommendation',
    'What is a good first RC for a beginner?||Durable and easy to drive?',
    'Resolved: Recommended a durable RTR 1/10 4WD with available spares and waterproof electronics. See KB: Choosing a first RC vehicle.'},
  new List<String>{'rc-rtr-vs-kit','Other','Equipment Complexity','Low',
    'RTR vs kit question||which is better for beginner',
    'What is the difference between RTR and a kit?||Which suits a newcomer?',
    'Resolved: Explained RTR (ready, beginner-friendly) vs kit (learn/customize) and matched to the customer goals. See KB: Ready-to-run versus build kit.'},
  new List<String>{'rc-upgrade-path','Other','Equipment Complexity','Low',
    'upgrade path for more speed||order of upgrades',
    'What order should I upgrade for speed?||How do I avoid breaking parts?',
    'Resolved: Advised upgrading battery, then motor/ESC, then gearing, then drivetrain/suspension to handle the power. See KB: Smart upgrade path for more speed.'},
  new List<String>{'rc-tool-list','Other','Equipment Complexity','Low',
    'tools for maintenance||what tools do I need',
    'What tools do I need to maintain my buggy?||Essential hand tools?',
    'Resolved: Provided an essential tool list (hex/nut drivers, pliers, turnbuckle wrench, thread-lock, shock oil). See KB: Essential maintenance tool list.'},
  new List<String>{'rc-warranty-claim','Other','Feedback','Medium',
    'warranty claim for defect||how to start a claim',
    'A part failed and I think it is defective.||How do I start a warranty claim?',
    'Resolved: Collected order number, failure description, and photos and opened a warranty claim. See KB: Starting a warranty claim.'}
};

Integer M_URL = 0, M_TYPE = 1, M_REASON = 2, M_PRIO = 3, M_SUBJ = 4, M_DESC = 5, M_RES = 6;

// Pull published article Ids (for CaseArticle linking) keyed by UrlName.
Map<String, Id> articleVersionIdByUrl = new Map<String, Id>();
Map<String, String> knowledgeArticleIdByUrl = new Map<String, String>();
for (Knowledge__kav k : [
  SELECT Id, KnowledgeArticleId, UrlName
  FROM Knowledge__kav
  WHERE PublishStatus = 'Online' AND Language = 'en_US' AND UrlName LIKE 'rc-%'
]) {
  articleVersionIdByUrl.put(k.UrlName, k.Id);
  knowledgeArticleIdByUrl.put(k.UrlName, k.KnowledgeArticleId);
}

List<String> vehicles = new List<String>{
  '1/10 buggy','short course truck','rock crawler','drift car','monster truck',
  'RC airplane','RC helicopter','FPV drone','RC boat','touring car','1/8 nitro buggy','basher truck'};
List<String> brands = new List<String>{
  'Traxxas','Arrma','Losi','Team Associated','Tamiya','HPI','Axial','Redcat'};

Integer perArticle = 6;   // ~6 resolved cases per article -> ~300 total
List<Case> cases = new List<Case>();
List<String> caseUrlByIndex = new List<String>(); // parallel: UrlName per case

Integer vi = 0, bi = 0;
for (List<String> row : articleMap) {
  List<String> subjOpts = row[M_SUBJ].split('\\|\\|');
  List<String> descOpts = row[M_DESC].split('\\|\\|');
  for (Integer n = 0; n < perArticle; n++) {
    String vehicle = vehicles[Math.mod(vi, vehicles.size())];
    String brand = brands[Math.mod(bi, brands.size())];
    String subjText = subjOpts[Math.mod(n, subjOpts.size())];
    String descText = descOpts[Math.mod(n, descOpts.size())];

    String subject = 'RC: ' + subjText + ' (' + brand + ' ' + vehicle + ')';
    String description = 'Vehicle: ' + brand + ' ' + vehicle + '. ' + descText;

    cases.add(new Case(
      Subject     = subject.length() > 255 ? subject.substring(0, 255) : subject,
      Description = description,
      Type        = row[M_TYPE],
      Reason      = row[M_REASON],
      Priority    = row[M_PRIO],
      Origin      = 'Web',
      Status      = 'Closed'
    ));
    caseUrlByIndex.add(row[M_URL]);
    vi++; bi++;
  }
  bi += 1; // shift brand between articles for variety
}

insert cases;

// Resolution Case Comments (the deflection signal) + best-effort article links.
List<CaseComment> comments = new List<CaseComment>();
Map<String, String> resolutionByUrl = new Map<String, String>();
for (List<String> row : articleMap) resolutionByUrl.put(row[M_URL], row[M_RES]);

List<CaseArticle> caseArticles = new List<CaseArticle>();
for (Integer i = 0; i < cases.size(); i++) {
  String url = caseUrlByIndex[i];
  comments.add(new CaseComment(
    ParentId = cases[i].Id,
    CommentBody = resolutionByUrl.get(url),
    IsPublished = true
  ));
  String knowledgeArticleId = knowledgeArticleIdByUrl.get(url);
  if (knowledgeArticleId != null) {
    caseArticles.add(new CaseArticle(
      CaseId = cases[i].Id,
      KnowledgeArticleId = knowledgeArticleId
    ));
  }
}
insert comments;

Integer linked = 0;
try {
  if (!caseArticles.isEmpty()) {
    Database.SaveResult[] results = Database.insert(caseArticles, false);
    for (Database.SaveResult r : results) if (r.isSuccess()) linked++;
  }
} catch (Exception e) {
  System.debug('CaseArticle linking skipped: ' + e.getMessage());
}

System.debug('Inserted ' + cases.size() + ' resolved cases, ' + comments.size()
  + ' comments, ' + linked + ' article links.');

/* -----------------------------------------------------------------------------
 * VERIFY:
 *   SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%' AND Status='Closed'
 *   SELECT COUNT() FROM CaseComment WHERE Parent.Subject LIKE 'RC:%'
 * CLEANUP (comments/links cascade-delete with their cases):
 *   delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 * ----------------------------------------------------------------------------- */
