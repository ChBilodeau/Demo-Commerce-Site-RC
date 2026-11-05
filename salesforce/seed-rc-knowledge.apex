/*
 * seed-rc-knowledge.apex
 * -----------------------------------------------------------------------------
 * Creates and PUBLISHES ~50 RC troubleshooting Knowledge articles so Coveo has
 * real content for Document Suggestions (case deflection) in Case Assist.
 *
 * Prereqs (already done):
 *   - Lightning Knowledge enabled
 *   - Rich-text field Article_Body__c deployed on Knowledge__kav
 *   - Running user is a Knowledge User with Manage Articles permission
 *
 * Flow: insert each article as DRAFT (Knowledge__kav), then publish it with
 * KbManagement.PublishingService.publishArticle so it is live and indexable.
 *
 * Idempotency: UrlName must be unique. All slugs are prefixed "rc-". If you
 * re-run, first clean up (see bottom) or you will get DUPLICATE_VALUE errors.
 *
 * HOW TO RUN:
 *   sf apex run --target-org VSCodePlayground --file salesforce/seed-rc-knowledge.apex
 * -----------------------------------------------------------------------------
 */

// Each row: [ slug, title, summary, bodyHtml ]
List<List<String>> arts = new List<List<String>>{
  new List<String>{'rc-lipo-wont-charge','RC: LiPo battery will not charge',
    'Why a LiPo pack refuses to charge and how to safely diagnose a dead cell or triggered safety cutoff.',
    '<h2>LiPo battery will not charge</h2><p>If your balance charger reports a connection error or refuses to start, work through these checks in order.</p><ol><li><b>Check the balance lead.</b> Inspect the small balance connector for bent or dirty pins. Reseat it firmly.</li><li><b>Measure per-cell voltage.</b> A healthy 2S cell reads about 3.7-4.2V. A cell at 0.0V is damaged and the pack should be retired safely.</li><li><b>Low-voltage lockout.</b> Many chargers refuse to start below ~3.0V/cell. Use a NiMH or low-voltage recovery mode only if your charger supports it, and watch the pack closely.</li><li><b>Temperature.</b> Never charge a hot or puffed pack. Let it cool and inspect for swelling.</li></ol><p><b>Safety:</b> A puffed or 0V cell indicates internal damage. Store in a fireproof container and dispose of it at a battery recycling point.</p>'},
  new List<String>{'rc-lipo-puffed','RC: What to do with a puffed LiPo',
    'How to recognize a swollen LiPo, why it happens, and how to handle and dispose of it safely.',
    '<h2>Handling a puffed LiPo</h2><p>Swelling means gas has formed inside the cell from over-discharge, over-charge, heat, or age.</p><ul><li>Stop using the pack immediately.</li><li>Do not puncture or compress it.</li><li>Discharge safely to storage voltage if your charger allows, then recycle.</li></ul><p>Prevent future swelling by storing at 3.8V/cell, avoiding deep discharges, and letting packs cool between runs.</p>'},
  new List<String>{'rc-lipo-runtime','RC: Runtime dropped and pack runs hot',
    'Diagnosing reduced runtime and excess heat: worn cells, high current draw, or gearing problems.',
    '<h2>Short runtime and hot packs</h2><p>Reduced runtime with a hot pack usually points to cell wear or excessive current draw.</p><ol><li>Check internal resistance if your charger measures it; high IR means the pack is aging.</li><li>Verify gearing is not over-geared, which forces high current.</li><li>Confirm the motor and ESC are not binding or dragging.</li></ol><p>A pack past its service life should be replaced; running it hard risks swelling.</p>'},
  new List<String>{'rc-choose-charger','RC: Choosing charger settings for a new pack',
    'How to set cell count, chemistry, and charge rate safely for a new battery.',
    '<h2>Charger settings for a new pack</h2><p>Set the chemistry to LiPo, the cell count to match your pack (2S, 3S, 4S), and a charge rate of 1C unless the pack is rated higher.</p><p>Always balance charge. For a 5000mAh pack, 1C equals 5A. When unsure, charge slower.</p>'},
  new List<String>{'rc-parallel-charging','RC: Parallel charging LiPo packs safely',
    'Requirements and precautions for charging multiple packs at once on a parallel board.',
    '<h2>Parallel charging</h2><p>Only parallel charge packs of the same cell count and similar state of charge. Use a quality parallel board with fuses, set the total current to the sum of each pack at 1C, and never mix chemistries.</p>'},
  new List<String>{'rc-motor-cuts-out','RC: Brushless motor cuts out under load',
    'Thermal cutoff, timing, and gearing causes for a motor that loses power at full throttle.',
    '<h2>Motor cuts out under load</h2><p>A motor that cuts at full throttle is often hitting ESC thermal protection.</p><ol><li>Let everything cool and feel the ESC and motor after a short run.</li><li>Reduce the pinion a tooth or two to lower load.</li><li>Improve airflow or add a fan to the ESC.</li><li>Check for correct motor timing and that the pack can deliver the current.</li></ol>'},
  new List<String>{'rc-motor-kv','RC: Understanding motor KV and turns',
    'What KV and turn count mean and how to pick a motor for your vehicle and terrain.',
    '<h2>Motor KV and turns</h2><p>KV is RPM per volt with no load. Higher KV means more speed but more heat and current. Lower turn count equals higher KV. For grass and loose dirt, pick a moderate KV to avoid overheating; for hard-packed tracks you can run higher KV.</p>'},
  new List<String>{'rc-brushed-to-brushless','RC: Upgrading from brushed to brushless',
    'What to change when converting a brushed vehicle to a brushless system.',
    '<h2>Brushed to brushless upgrade</h2><p>Replace the motor and ESC as a matched system, confirm your battery and connectors can handle the current, and recalibrate the ESC to your radio. Choose a KV appropriate for your gearing and terrain.</p>'},
  new List<String>{'rc-esc-calibration','RC: Calibrating your ESC to the transmitter',
    'Step-by-step throttle calibration so the ESC arms correctly.',
    '<h2>ESC throttle calibration</h2><ol><li>Turn on the transmitter first and set throttle trims to neutral.</li><li>Enter the ESC calibration mode per its manual (usually hold the set button while powering on).</li><li>Register full throttle, full brake/reverse, and neutral when prompted.</li><li>Power cycle and confirm the ESC arms with the usual tones.</li></ol>'},
  new List<String>{'rc-esc-error-codes','RC: Reading ESC error flashes',
    'How to interpret repeating LED patterns and common fault conditions.',
    '<h2>ESC error flashes</h2><p>Most ESCs blink a repeating pattern to indicate a fault such as low voltage, no signal, or over-temperature. Match the pattern to your manual. Common fixes: recharge or replace the pack, re-bind the radio, improve cooling, or re-run calibration.</p>'},
  new List<String>{'rc-esc-overheat','RC: ESC overheats and shuts down',
    'Gearing, cooling, and load causes for an ESC that cuts power when hot.',
    '<h2>ESC overheating</h2><p>Lower the pinion tooth count, add a cooling fan, ensure the ESC is not wrapped in foam, and avoid prolonged full-throttle in high-traction conditions. Verify the motor spins freely with no drivetrain binding.</p>'},
  new List<String>{'rc-no-reverse','RC: No reverse after reprogramming the ESC',
    'Re-enabling reverse and setting the brake/reverse behavior.',
    '<h2>Restoring reverse</h2><p>Many ESCs ship in a forward/brake-only profile. Enter programming and switch to forward/brake/reverse mode. Note the double-tap behavior: brake first, then reverse on the second pull.</p>'},
  new List<String>{'rc-radio-bind','RC: Binding a transmitter and receiver',
    'The general binding sequence and what to do when the bind light keeps flashing.',
    '<h2>Binding your radio</h2><ol><li>Insert the bind plug (if required) and power the receiver; the bind light flashes.</li><li>Hold the bind button on the transmitter while powering it on.</li><li>Wait for the receiver light to go solid, then remove the bind plug and power cycle.</li></ol><p>If it never binds, confirm the protocol matches, battery is charged, and the units are close together.</p>'},
  new List<String>{'rc-radio-glitch','RC: Range loss and glitching',
    'Diagnosing dropouts and twitchy servos at distance.',
    '<h2>Range and glitching</h2><p>Route the antenna vertically and clear of carbon and metal, keep the receiver away from the ESC power wires, and ensure a solid power supply (BEC or receiver pack). A failing receiver or low battery can also cause dropouts.</p>'},
  new List<String>{'rc-failsafe','RC: Setting up failsafe',
    'Programming the vehicle to stop safely on signal loss.',
    '<h2>Failsafe setup</h2><p>Set the throttle failsafe to neutral or brake so the vehicle stops if the signal is lost. Follow your radio or receiver procedure, then test by switching the transmitter off and confirming the vehicle stops.</p>'},
  new List<String>{'rc-dual-rate-expo','RC: Dual rate, trim, and expo explained',
    'Beginner guide to the main radio adjustments for smooth control.',
    '<h2>Dual rate, trim, and expo</h2><p>Trim centers a channel. Dual rate limits maximum travel for gentler response. Expo softens the response near center while keeping full travel at the ends. Start with reduced steering dual rate and some expo for a smooth first drive.</p>'},
  new List<String>{'rc-model-memory','RC: Saving model memories',
    'Running multiple vehicles from one transmitter.',
    '<h2>Model memory</h2><p>Create a new model profile for each vehicle, name it, and set trims, dual rate, and reversing per model. Select the matching profile before driving so settings do not carry over.</p>'},
  new List<String>{'rc-channel-reverse','RC: Reversing a steering or throttle channel',
    'Fixing backward steering or throttle after a new radio or servo.',
    '<h2>Reversing a channel</h2><p>If the steering or throttle works backward, open the reverse/servo-reverse menu and flip that channel. Recalibrate the ESC afterward if you reversed throttle.</p>'},
  new List<String>{'rc-drone-drift','RC: Drone drifts in hover',
    'Compass and accelerometer calibration for stable GPS hold.',
    '<h2>Drone drifting</h2><p>Drift or circling in GPS hold usually means the compass needs calibration, especially after moving locations. Calibrate the compass away from metal, then level-calibrate the accelerometer on a flat surface.</p>'},
  new List<String>{'rc-drone-motor-flip','RC: Quad flips on takeoff',
    'Motor direction and propeller orientation fixes.',
    '<h2>Quad flips on takeoff</h2><p>A flip at takeoff means a motor spins the wrong way or a prop is on the wrong arm. Verify motor directions in your configurator and fit props by rotation (CW/CCW) to the correct motors.</p>'},
  new List<String>{'rc-fpv-bind','RC: Setting up FPV video',
    'Matching VTX and goggle channels so you get a picture.',
    '<h2>FPV video setup</h2><p>Set the video transmitter and goggles to the same band and channel. Confirm the VTX has power and an antenna attached before powering on, and start on low power indoors.</p>'},
  new List<String>{'rc-gear-mesh','RC: Setting pinion and spur gear mesh',
    'The paper method for correct mesh to stop stripping gears.',
    '<h2>Gear mesh</h2><p>Place a strip of paper between the pinion and spur, push the pinion against it, and tighten the motor screws. Remove the paper and you have a small amount of backlash. Too tight strips gears; too loose rounds teeth.</p>'},
  new List<String>{'rc-gear-ratio','RC: Choosing a gear ratio',
    'Balancing speed, acceleration, and temperature with pinion and spur choice.',
    '<h2>Gear ratio</h2><p>A larger pinion or smaller spur raises top speed but increases heat and current. Start with the kit ratio, then change one or two teeth at a time and monitor motor and ESC temperatures.</p>'},
  new List<String>{'rc-slipper-clutch','RC: Adjusting the slipper clutch',
    'Setting slipper tension for traction and drivetrain protection.',
    '<h2>Slipper clutch</h2><p>The slipper should slip slightly on hard acceleration to protect the drivetrain and manage traction. Tighten until it just chirps on a hard launch, then back off slightly for high-grip surfaces.</p>'},
  new List<String>{'rc-diff-leak','RC: Differential leaking oil',
    'Rebuilding a leaking diff and choosing seals and oil.',
    '<h2>Diff leaks</h2><p>Leaking silicone oil usually means worn X-ring seals. Rebuild with new seals and the correct oil weight. Heavier oil tightens the diff for more steering off-power; lighter oil frees it up.</p>'},
  new List<String>{'rc-driveshaft-popout','RC: Driveshaft pops out',
    'Keeping center and axle driveshafts seated under power.',
    '<h2>Driveshaft pop-out</h2><p>Check for worn cups and pins, correct shaft length, and proper suspension droop. A slightly longer shaft or new cups usually solves repeated pop-outs.</p>'},
  new List<String>{'rc-shocks-bottom','RC: Shocks bottoming out on jumps',
    'Tuning oil weight, springs, and limiters for big landings.',
    '<h2>Shocks bottoming out</h2><p>Use heavier shock oil, stiffer springs, or internal limiters to reduce bottoming. Check that pistons and o-rings are in good shape and shocks are bled correctly.</p>'},
  new List<String>{'rc-shock-rebuild','RC: Rebuilding leaking shocks',
    'Replacing seals and setting oil level for consistent damping.',
    '<h2>Shock rebuild</h2><p>Replace the x-ring seals, refill with the specified oil weight, and bleed to remove air so both shocks match. Spongy, leaking shocks indicate worn seals.</p>'},
  new List<String>{'rc-handling-rollover','RC: Vehicle rolls over in corners',
    'Reducing traction rolls with ride height, camber, and sway bars.',
    '<h2>Corner rollovers</h2><p>Lower the center of gravity, add sway bars, and reduce excessive grip by adjusting tires. Check ride height and camber for balanced handling.</p>'},
  new List<String>{'rc-oversteer','RC: Reducing on-power oversteer',
    'Setup changes to stop the rear stepping out under throttle.',
    '<h2>On-power oversteer</h2><p>Use a thicker rear diff oil, soften the rear or stiffen the front, and ensure rear toe-in is adequate. Smooth throttle application also helps.</p>'},
  new List<String>{'rc-pulls-to-side','RC: Vehicle pulls to one side',
    'Alignment, servo, and radio checks for a vehicle that will not track straight.',
    '<h2>Pulling to one side</h2><p>Center the steering trim, check for equal toe and camber side to side, confirm the servo saver is not bent, and verify the servo centers properly.</p>'},
  new List<String>{'rc-steering-stripped','RC: Steering dead after a crash',
    'Diagnosing and replacing a stripped steering servo or gears.',
    '<h2>Stripped steering</h2><p>Grinding with no movement usually means stripped servo gears. Replace the gear set or the servo, and consider a metal-gear servo plus a quality servo saver to survive impacts.</p>'},
  new List<String>{'rc-steering-jitter','RC: Steering jitters at center',
    'Fixing twitchy steering from servo, radio, or mechanical slop.',
    '<h2>Steering jitter</h2><p>Jitter can come from a failing servo, radio interference, or a worn servo saver. Try a different servo, check the receiver power, and eliminate slop in the steering linkage.</p>'},
  new List<String>{'rc-tire-gluing','RC: Gluing tires so they stay seated',
    'Prep and CA glue technique for durable tire-to-rim bonds.',
    '<h2>Gluing tires</h2><p>Clean the bead with motor spray, mount the tire with foam insert, and apply thin CA glue in small sections while flexing the bead open. Let it cure fully before running.</p>'},
  new List<String>{'rc-tire-choice','RC: Choosing tires for your surface',
    'Matching compound and tread to dirt, carpet, grass, or pavement.',
    '<h2>Tire selection</h2><p>Soft compounds grip smooth or cold surfaces; harder compounds last on abrasive tracks. Pin and spike treads suit loose dirt; slicks and ribbed treads suit hard-packed or paved surfaces.</p>'},
  new List<String>{'rc-wheel-hex','RC: Wobbling wheel and stripped hex',
    'Replacing a rounded wheel hex and preventing recurrence.',
    '<h2>Stripped wheel hex</h2><p>A wobble often means a rounded hex or worn axle. Replace the hex (and axle if scored), use the correct hex width, and torque the wheel nut properly.</p>'},
  new List<String>{'rc-nitro-wont-start','RC: Nitro engine will not start',
    'Flooding, glow plug, and fuel-flow checks to get a nitro running.',
    '<h2>Nitro will not start</h2><p>Confirm fresh fuel, a glowing plug on the igniter, and that the engine is not flooded. If flooded, remove the plug, clear fuel, and restart. Set the needles to baseline before tuning.</p>'},
  new List<String>{'rc-nitro-tuning','RC: Tuning nitro high and low needles',
    'Getting a clean idle and strong top end without running lean.',
    '<h2>Nitro needle tuning</h2><p>Start rich and lean gradually. The high-speed needle sets top-end; the low-speed needle sets idle and transition. Maintain a visible smoke trail to keep the engine cool and lubricated.</p>'},
  new List<String>{'rc-bearings-service','RC: Servicing gritty or seized bearings',
    'Cleaning, oiling, and replacing bearings after dusty or wet runs.',
    '<h2>Bearing service</h2><p>Remove shields, flush bearings in cleaner, dry, and re-oil lightly. Seized or rusted bearings should be replaced. Rubber-sealed bearings last longer in dirt and water.</p>'},
  new List<String>{'rc-chassis-crack','RC: Cracked chassis repair and upgrade',
    'Options when the chassis cracks near stress points.',
    '<h2>Cracked chassis</h2><p>Small cracks can be stopped by drilling a tiny hole at the crack tip, but a cracked chassis is best replaced. Consider a stiffer or aluminum option if cracks recur at the motor mount or bulkheads.</p>'},
  new List<String>{'rc-broken-arm','RC: Replacing a broken suspension arm',
    'Identifying the correct arm and swapping it out.',
    '<h2>Broken suspension arm</h2><p>Match the arm to your exact model and position (front/rear, left/right). Replace hinge pins if bent, and check for cracked mounts while the arm is off.</p>'},
  new List<String>{'rc-body-repair','RC: Repairing a cracked polycarbonate body',
    'Reinforcing lexan bodies and fixing torn mounting holes.',
    '<h2>Body repair</h2><p>Back cracks with clear packing tape or lexan patches and thick CA. Reinforce body post holes with adhesive-backed washers to stop tear-out.</p>'},
  new List<String>{'rc-foam-wing','RC: Repairing a cracked foam wing',
    'Choosing glue and reinforcement for foam airframes.',
    '<h2>Foam wing repair</h2><p>Use foam-safe CA or epoxy, and add a carbon or bamboo spar across the break for strength. Avoid regular CA that can melt some foams unless it is labeled foam-safe.</p>'},
  new List<String>{'rc-boat-waterproof','RC: Sealing a leaking boat hull',
    'Keeping water out of the hull and protecting the electronics bay.',
    '<h2>Hull sealing</h2><p>Reseal the hatch with a fresh gasket, silicone the stuffing tube and wire exits, and bag or coat the receiver and ESC. Test on calm water before a full run.</p>'},
  new List<String>{'rc-electronics-waterproof','RC: Waterproofing your electronics',
    'Protecting receiver, servo, and ESC for wet conditions.',
    '<h2>Waterproofing electronics</h2><p>Use a sealed receiver box, grease connectors, apply conformal coating to exposed boards, and choose waterproof-rated servos and ESCs. Dry everything after wet runs.</p>'},
  new List<String>{'rc-led-install','RC: Installing an LED light kit',
    'Where to connect lights and managing battery draw.',
    '<h2>LED light kit</h2><p>Most kits plug into a spare receiver channel or a dedicated light port. Current draw is small but continuous; expect a minor runtime reduction. Secure wiring away from moving parts.</p>'},
  new List<String>{'rc-first-rc','RC: Choosing a first RC vehicle',
    'Picking a durable, beginner-friendly ready-to-run model.',
    '<h2>Your first RC</h2><p>For beginners, choose a durable ready-to-run model with readily available spare parts and waterproof electronics. A 1/10 scale 4WD is a versatile, forgiving starting point.</p>'},
  new List<String>{'rc-rtr-vs-kit','RC: Ready-to-run versus build kit',
    'Pros and cons of RTR and kit for newcomers.',
    '<h2>RTR vs kit</h2><p>RTR includes electronics and is ready quickly, ideal for beginners. Kits teach you the vehicle and allow part selection but require more time and tools. Choose based on your goals.</p>'},
  new List<String>{'rc-upgrade-path','RC: Smart upgrade path for more speed',
    'The safe order of upgrades without breaking parts.',
    '<h2>Upgrade order</h2><p>Upgrade in this order: quality battery, then motor/ESC, then gearing, then drivetrain and suspension to handle the extra power. Upgrading speed before strength leads to breakage.</p>'},
  new List<String>{'rc-tool-list','RC: Essential maintenance tool list',
    'The core hand tools for maintaining a hobby-grade RC.',
    '<h2>Essential tools</h2><p>Keep metric hex drivers (1.5-3mm), nut drivers (5.5/7/8mm), needle-nose pliers, a turnbuckle wrench, thread-lock, shock oil, and spare hardware. These cover most trackside fixes.</p>'},
  new List<String>{'rc-warranty-claim','RC: Starting a warranty claim',
    'What information speeds up a defect or warranty request.',
    '<h2>Warranty claims</h2><p>Have your order number, a description of the failure, and photos ready. Note how many runs the part had and the conditions. Normal wear and crash damage are typically not covered.</p>'}
};

Integer created = 0, published = 0;
List<String> publishIds = new List<String>();

for (List<String> a : arts) {
  Knowledge__kav kav = new Knowledge__kav(
    Title = a[1],
    UrlName = a[0],
    Summary = a[2],
    Article_Body__c = a[3],
    Language = 'en_US'
  );
  insert kav;
  created++;
  // Re-query to get KnowledgeArticleId needed for publishing.
  Knowledge__kav draft = [SELECT Id, KnowledgeArticleId FROM Knowledge__kav WHERE Id = :kav.Id LIMIT 1];
  publishIds.add(draft.KnowledgeArticleId);
}

// Publish all drafts (makes them live and indexable by Coveo).
for (String kaId : publishIds) {
  try {
    KbManagement.PublishingService.publishArticle(kaId, true);
    published++;
  } catch (Exception e) {
    System.debug('Publish failed for ' + kaId + ': ' + e.getMessage());
  }
}

System.debug('Created ' + created + ' articles, published ' + published + '.');

/* -----------------------------------------------------------------------------
 * VERIFY (published articles):
 *   SELECT COUNT() FROM Knowledge__kav WHERE PublishStatus='Online' AND Language='en_US'
 * CLEANUP (archive + delete all seeded articles) - run in Execute Anonymous:
 *   for (Knowledge__kav k : [SELECT KnowledgeArticleId FROM Knowledge__kav
 *                            WHERE UrlName LIKE 'rc-%' AND PublishStatus='Online']) {
 *     KbManagement.PublishingService.archiveOnlineArticle(k.KnowledgeArticleId, null);
 *   }
 *   delete [SELECT Id FROM Knowledge__kav WHERE UrlName LIKE 'rc-%'];
 * ----------------------------------------------------------------------------- */
