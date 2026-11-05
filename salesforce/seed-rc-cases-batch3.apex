/*
 * seed-rc-cases-batch3.apex
 * -----------------------------------------------------------------------------
 * Generates 1,200 ADDITIONAL realistic RC support Cases to push the Coveo Case
 * Classification training volume past the "not enough items" threshold.
 * Run AFTER batch 1 (106) and batch 2 (200): total becomes ~1,506 RC cases.
 *
 * KEY IMPROVEMENTS vs batch 2:
 *   - Richer, MULTI-SENTENCE descriptions so language detection reliably marks
 *     every case as English (the CC model drops non-English items).
 *   - More topics, phrasings, brands, vehicles -> high lexical variety.
 *   - Each description appends a randomized closing sentence for uniqueness.
 *
 * Avoids anonymous-Apex pitfalls: no inner classes; no reserved-word variable
 * names (e.g. not using 'desc' which collides with the ASC/DESC keyword).
 *
 * All subjects are prefixed "RC:" so everything cleans up together:
 *   delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 *
 * HOW TO RUN:
 *   sf apex run --target-org VSCodePlayground --file salesforce/seed-rc-cases-batch3.apex
 * -----------------------------------------------------------------------------
 */

// Each topic row: [ Type, Reason, Priority, subjects (||), descriptions (||) ]
List<List<String>> topics = new List<List<String>>{
  new List<String>{'Electrical','Breakdown','High',
    'LiPo pack will not charge||battery dead after storage||one cell reads zero volts||charger reports connection error||pack swelled and stopped working',
    'The LiPo pack stopped taking a charge and the balance charger shows an error. One cell appears completely dead and the others are fine.||After sitting over the off-season the battery will not charge at all. The charger beeps twice then stops immediately.||My pack reads very low total voltage and the charger refuses to start. I want to know whether it can be recovered safely or should be disposed of.||The battery puffed up after a run and now will not power the vehicle. I am worried it is a fire risk.'},
  new List<String>{'Electrical','Performance','Medium',
    'runtime dropped dramatically||battery drains too fast||pack gets very hot||short runtime after charge||voltage sags under throttle',
    'A fully charged pack now lasts only a few minutes when it used to run much longer. The motor is not unusually hot and the gearing is unchanged.||The battery gets hot during normal driving and runtime has dropped a lot. I am trying to tell if the pack is worn out or something is drawing too much current.||Runtime is way down even on a full charge and nothing else changed in the setup. The pack is about a year old with moderate use.||Under hard throttle the voltage sags and the vehicle slows. On a lighter throttle it behaves normally.'},
  new List<String>{'Electrical','Installation','Low',
    'which charger settings||how to set charge rate||balance charging question||charger setup help||parallel charging question',
    'I just bought a new pack and need the correct charger type, cell count, and charge rate so I do not damage it. This is my first LiPo.||Can you explain the right balance-charging settings for my pack so I charge it safely and get a long service life?||I am not sure what amperage to set on the charger for my battery. I want the safest setting even if it charges slowly.||I have several identical packs and want to parallel charge them. What board and precautions do I need?'},
  new List<String>{'Electronic','Performance','High',
    'motor cuts out under load||brushless motor stutters||power loss at full throttle||motor overheats||motor cogs at low speed',
    'The brushless motor runs fine until I apply full throttle, then it cuts out for a moment. I suspect thermal protection on the ESC kicking in.||Under load the motor stutters and loses power, then recovers. It is smooth at part throttle and on the bench.||The motor and ESC get very hot and power fades after a few minutes of hard running. I checked the gear mesh and it looks correct.||At crawl speed the motor cogs and stutters but it is smooth higher up. I want to know if this is a timing or ESC setting.'},
  new List<String>{'Electronic','Equipment Complexity','Low',
    'which motor KV to choose||brushed to brushless upgrade||understanding motor ratings||motor selection help||sensored vs sensorless',
    'I do not understand KV ratings. For my vehicle and terrain, I need help choosing a motor for good speed without overheating.||I want to upgrade from brushed to brushless. Please recommend a motor, ESC, and battery combination that work together for my class.||Can you explain how motor KV and turn count relate to speed and torque so I can choose correctly for my use?||I keep seeing sensored and sensorless motors. What is the difference and which should I pick for smooth low-speed control?'},
  new List<String>{'Electronic','Installation','High',
    'ESC will not calibrate||cannot arm the ESC||ESC throttle setup fails||ESC not responding to throttle||no reverse after ESC reset',
    'I cannot complete throttle calibration. The ESC keeps beeping and never arms when I follow the radio pairing steps.||The ESC will not arm no matter how I set the throttle endpoints. I would like the correct calibration sequence for my setup.||After wiring everything the ESC does not respond to the throttle at all. I may have missed a calibration or binding step.||I reprogrammed the ESC and now I only have brake and no reverse. How do I re-enable reverse without losing my other settings?'},
  new List<String>{'Electronic','Breakdown','Medium',
    'ESC flashing error code||ESC overheats and shuts off||ESC died suddenly||burning smell from ESC||ESC capacitor fell off',
    'The ESC shows a repeating flash pattern and the vehicle will not move. I would like to know what the code means and how to clear it.||After a few minutes the ESC overheats and cuts power until it cools down. I am not sure if it is gearing, cooling, or a failing unit.||There was a puff of smoke from the ESC and now nothing works at all. I want to confirm whether it is repairable.||A capacitor broke off the ESC during a crash. I need to know if it is safe to run and whether it can be re-soldered.'},
  new List<String>{'Electronic','Installation','High',
    'transmitter will not bind||receiver will not pair||bind light keeps flashing||cannot pair radio||failsafe not working',
    'The bind light keeps flashing and never goes solid. I followed the manual exactly but the radio will not pair.||My new transmitter and receiver will not bind. I need the correct binding procedure for this brand and protocol.||I cannot get the receiver to pair with the transmitter even after a full reset of both units.||When I turn the transmitter off the vehicle keeps rolling. I need to program the failsafe so it stops safely on signal loss.'},
  new List<String>{'Electronic','Performance','High',
    'range loss and glitching||servos twitch at distance||signal drops out||radio interference||loses control at speed',
    'The vehicle loses signal past a short distance and the servos twitch. I verified the antenna is routed correctly and clear of the chassis.||I get glitching and dropouts when driving away from me. I am trying to tell if this is interference or a failing receiver.||Control gets erratic at range even on a freshly charged battery. I would like help diagnosing radio range problems.||At high speed the vehicle briefly loses control then recovers. I suspect a radio or power filtering issue.'},
  new List<String>{'Electronic','Equipment Complexity','Low',
    'how to set dual rate and trim||model memory setup||reversing a channel||expo and endpoint help||gyro setup question',
    'I am new to the hobby and would like an explanation of dual rate, trim, sub-trim, and expo and how to set them for a smooth first drive.||I have two vehicles on one radio. Please explain how to save separate model memories and switch between them.||The steering is reversed on my new radio. I need to know which setting flips the channel direction.||I added a gyro and want to understand gain and how to set it so the vehicle tracks straight without wagging.'},
  new List<String>{'Electronic','Performance','High',
    'drone drifts in hover||quad will not hold position||toilet-bowl effect||GPS hold unstable||compass calibration needed',
    'My quad drifts in GPS hold and sometimes circles on its own. I believe the compass needs recalibration after moving house.||The drone will not hold position and slowly wanders across the yard. I am unsure if it is a compass or accelerometer issue.||In position hold the quad oscillates and drifts in a widening circle. I would like steps to restore stable hover.||After a firmware update the drone hovers poorly. I want to know the correct calibration order to fix it.'},
  new List<String>{'Electronic','Installation','High',
    'one motor will not spin||quad flips on takeoff||motor direction wrong||props in wrong position||FPV video not binding',
    'When I arm the drone one motor stays silent while the others spin. I need help isolating the ESC, motor, or flight controller.||The quad flips over the instant I throttle up. I suspect a motor spin direction or propeller placement mistake after my rebuild.||After a rebuild the drone will not lift evenly and leans hard to one side. I think a motor is spinning the wrong way.||I cannot get video in my FPV goggles. I need the steps to set the channel and bind the video transmitter to the receiver.'},
  new List<String>{'Mechanical','Breakdown','High',
    'grinding from gearbox||spur gear stripped||pinion slipped||gear mesh noise||transmission locked up',
    'There is loud grinding under power and the vehicle lurches. I suspect a stripped spur gear or a slipped pinion after a hard landing.||I keep stripping spur gears even though the mesh looks correct. I would like help figuring out what I am doing wrong.||There is a harsh grinding noise from the gearbox and power delivery is intermittent. The problem gets worse under throttle.||The transmission locked up suddenly and the wheels will not turn by hand. I need to know what to inspect first.'},
  new List<String>{'Mechanical','Equipment Complexity','Low',
    'how to set gear mesh||pinion spur ratio help||gearing for terrain||slipper clutch setup||diff oil weight question',
    'Please explain how to set the correct gear mesh using the paper method so I stop stripping gears prematurely.||I would like help choosing a pinion and spur combination for my terrain and desired top speed without overheating.||I do not understand when the slipper clutch should slip. How tight should I set it for a high-power setup?||I am rebuilding my differentials and need help choosing oil weights front, center, and rear for my driving style.'},
  new List<String>{'Mechanical','Breakdown','Medium',
    'differential leaking oil||diff feels locked||driveshaft pops out||cv joint failure||outdrive stripped',
    'The differential is leaking silicone oil onto the chassis. I want to know whether new seals will fix it or it needs a full rebuild.||The center diff feels locked and the vehicle darts unpredictably. I am wondering if a lighter diff oil would help.||A driveshaft keeps popping out of the cup under hard acceleration. I need a way to keep it seated reliably.||A CV-style driveshaft failed and now I hear clicking on turns. I want the correct replacement and install tips.'},
  new List<String>{'Mechanical','Performance','Medium',
    'shocks bottoming out||suspension too soft||shock oil leaking||car bounces on landings||ride height uneven',
    'On jumps the shocks bottom out hard and the vehicle bounces on landing. I would like guidance on oil weight and spring choice.||The suspension feels spongy and oil is weeping from the shock bodies. I think a rebuild is due.||The vehicle rebounds and hops after bumps instead of settling. I want help tuning the shocks for a rough surface.||One side of the vehicle sits lower than the other. I suspect a build error in shock oil level or spring preload.'},
  new List<String>{'Mechanical','Performance','Medium',
    'car flips in corners||oversteer on throttle||vehicle pulls to one side||poor cornering grip||understeer in turns',
    'The vehicle rolls over in tight corners even at moderate speed. I am trying to tell if it is camber, ride height, or sway bars.||It snaps loose when I get on the throttle mid-corner. I would like tuning advice to reduce on-power oversteer.||The vehicle drifts to one side even with the trim centered. I suspect alignment or a weak steering servo.||The vehicle pushes wide and will not turn in tight sections. I want to understand how to add front grip.'},
  new List<String>{'Mechanical','Breakdown','High',
    'steering servo stripped||no steering after crash||servo gears grinding||steering dead||servo horn stripped',
    'After a crash the steering is dead and I hear grinding. I believe the servo gears are stripped and need replacing.||The steering stopped working and there is a grinding sound from the servo. I would like replacement and setup steps.||Following an impact the wheels will not turn and the servo makes a buzzing noise. I want to confirm the diagnosis.||The servo horn stripped on its spline and the steering is vague. I need to know the correct replacement horn.'},
  new List<String>{'Mechanical','Performance','Medium',
    'steering jitters at center||front wheels shake||servo twitch when idle||steering not centered||servo saver too soft',
    'The front wheels shake constantly when the vehicle is sitting still, even after I installed a new servo saver.||The steering jitters around center and the vehicle wanders. I am unsure if it is the servo, radio, or a mechanical issue.||The wheels twitch at idle and I cannot get a clean center. I would like a step-by-step to eliminate the jitter.||The steering feels vague and the servo saver seems too soft. I want to know how tight to set it.'},
  new List<String>{'Mechanical','Installation','Low',
    'tires coming unglued||tire separated from rim||which tires for terrain||wheel hex stripped||foam insert choice',
    'My tires keep separating from the rims mid-run. I would like recommendations on glue and the correct surface prep.||A tire unseated from the wheel during a run. I need the proper method to glue and seat tires so it lasts.||I am unsure which tire compound and tread to run for my surface and conditions. I want the best grip and wear.||A wheel wobbles and I found the hex is rounded out. I want to know whether to replace the hex, the axle, or both.'},
  new List<String>{'Mechanical','Breakdown','High',
    'nitro engine will not start||engine floods||engine idles then dies||nitro tuning help||glow plug keeps failing',
    'My nitro vehicle will not fire. The glow plug lights and the tank is full but it just floods when I pull the starter.||The engine starts then dies after a few seconds. I believe the low-speed needle is set incorrectly.||I would like a walkthrough for tuning the high and low needles so the engine runs cleanly and reliably.||The glow plug keeps burning out after a short time. I want to know if the tuning or fuel is the cause.'},
  new List<String>{'Mechanical','Breakdown','Low',
    'bearings feel rough||bearings seized with dirt||noisy wheel bearings||gritty motor bearings||bearings rusted',
    'Several bearings feel gritty and noisy after a dusty run. I want to know whether to clean and re-oil them or replace them.||After a muddy session some bearings seized completely. I need the best way to service or replace them.||There is a rough, grinding feel when I spin the wheels by hand. I suspect worn bearings and want confirmation.||My bearings show rust after a wet run. I want to prevent it happening again and pick better bearings.'},
  new List<String>{'Structural','Breakdown','Medium',
    'chassis cracked||broken suspension arm||chassis flexes too much||bulkhead cracked||motor mount cracked',
    'The plastic chassis is cracking near the motor mount. I would like to know if there is a stiffer or aluminum replacement.||A lower suspension arm snapped in a crash. I need the correct replacement part and how difficult the swap is.||The chassis flexes and has started to crack over time. I am wondering whether to brace it or upgrade the material.||A bulkhead cracked after a hard hit and the geometry shifted. I want the right replacement and build tips.'},
  new List<String>{'Structural','Breakdown','Low',
    'lexan body cracked||body posts broke||foam wing cracked||fuselage split on landing||canopy shattered',
    'The polycarbonate body cracked after a hard hit. I would like the best way to repair and reinforce it.||The foam wing cracked near the root on landing. I need advice on glue and reinforcement so it holds.||The body mounting tabs broke off. I want to reinforce the mounting points so the body lasts longer.||The fuselage split along a seam on landing. I need a durable repair that keeps the airframe light.'},
  new List<String>{'Structural','Breakdown','High',
    'boat taking on water||water inside hull||sealing the hull||electronics got wet||hatch seal leaking',
    'Water is getting into the hull and soaking the electronics. I need the correct method to seal the compartment properly.||My boat hull leaks around the hatch during runs. I would like the right sealing method and gasket material.||After a wet run water pooled inside the hull. I want a reliable way to waterproof the electronics bay.||The hatch seal is leaking and the receiver got damp. I want to replace the seal and protect the electronics.'},
  new List<String>{'Other','Equipment Complexity','Low',
    'which starter kit to buy||RTR vs kit question||first RC recommendation||upgrade path advice||scale choice help',
    'I am buying a first RC for a beginner and want a durable, easy-to-drive model recommendation for the budget.||I would like to understand the difference between ready-to-run and build kits and which suits a newcomer.||My vehicle is stock and I want the recommended order of upgrades to add speed safely without breaking parts.||I am unsure which scale to buy for my space and budget. I would like help choosing between the common scales.'},
  new List<String>{'Other','Installation','Low',
    'waterproofing electronics||LED light kit install||body trimming help||tool list for maintenance||gyro install help',
    'I want to run in wet grass and need to know how to waterproof the receiver, servo, and ESC safely.||I want to add an LED light kit and need to know where it connects and how much it will drain the battery.||I need help trimming a new body and marking the body post holes so it sits at the right height.||I want a recommended tool list of hex and nut drivers and other essentials to fully maintain my vehicle.'},
  new List<String>{'Other','Feedback','Medium',
    'warranty claim for defect||missing parts in box||wrong part shipped||order issue||damaged in shipping',
    'A part failed on the second run and I believe it is a manufacturing defect. I would like to start a warranty claim.||My kit arrived with a bag of hardware missing. I need the missing screws and shims sent to complete the build.||I received the wrong part in my order and need the correct one shipped and the wrong one returned.||My order arrived with crush damage to the box and a cracked part. I want to arrange a replacement.'},
  new List<String>{'Other','Feedback','Low',
    'thanks for the help||great support experience||troubleshooting guide worked||appreciation||positive feedback',
    'I just wanted to say the troubleshooting guide you sent fixed my issue completely. Thank you for the clear help.||Your support team was great and got me back running quickly. I really appreciate the fast response.||The setup advice worked perfectly on the first try. Thank you for the quick and clear answer.||I am impressed with the service. The replacement part arrived fast and solved my problem.'}
};

Integer T_TYPE = 0, T_REASON = 1, T_PRIO = 2, T_SUBJ = 3, T_DESC = 4;

List<String> vehicles = new List<String>{
  '1/10 buggy','1/8 nitro buggy','short course truck','rock crawler','drift car',
  'touring car','monster truck','RC airplane','RC helicopter','FPV drone',
  'RC boat','1/5 scale truck','sport plane','quadcopter','basher truck',
  '1/10 stadium truck','1/16 buggy','trophy truck','sailplane glider','racing catamaran'};
List<String> brands = new List<String>{
  'Traxxas','Arrma','Losi','Team Associated','Tamiya','HPI','Axial','HobbyWing',
  'Spektrum','Castle','Redcat','ECX','Kyosho','Tekno','Pro-Line','Futaba'};
// Randomized closing sentences to keep every description unique and clearly English.
List<String> closers = new List<String>{
  'Any guidance would be appreciated.','I have attached photos if that helps.',
  'This is my main vehicle so I want to fix it correctly.','I am fairly new so please keep it simple.',
  'I have already tried the basic steps in the manual.','Let me know what information you need from me.',
  'I want to avoid making the problem worse.','Thanks in advance for the help.',
  'I run this vehicle most weekends.','I would prefer a durable long-term fix.'};

Integer target = 1200;
List<Case> cases = new List<Case>();
Integer ti = 0, vi = 0, bi = 0, si = 0, dpi = 0, ci = 0;

while (cases.size() < target) {
  List<String> row = topics[Math.mod(ti, topics.size())];
  List<String> subjOpts = row[T_SUBJ].split('\\|\\|');
  List<String> descOpts = row[T_DESC].split('\\|\\|');

  String vehicle = vehicles[Math.mod(vi, vehicles.size())];
  String brand = brands[Math.mod(bi, brands.size())];
  String subjText = subjOpts[Math.mod(si, subjOpts.size())];
  String descText = descOpts[Math.mod(dpi, descOpts.size())];
  String closer = closers[Math.mod(ci, closers.size())];

  String subject = 'RC: ' + subjText + ' (' + brand + ' ' + vehicle + ')';
  String description = 'Vehicle: ' + brand + ' ' + vehicle + '. ' + descText + ' ' + closer;

  cases.add(new Case(
    Subject     = subject.length() > 255 ? subject.substring(0, 255) : subject,
    Description = description,
    Type        = row[T_TYPE],
    Reason      = row[T_REASON],
    Priority    = row[T_PRIO],
    Origin      = 'Web',
    Status      = 'Closed'
  ));

  // Different strides ensure combinations spread widely and rarely repeat.
  ti++; vi += 1; bi += 1; si += 1; dpi += 1; ci += 1;
  if (Math.mod(ti, topics.size()) == 0) { vi++; ci += 2; }
  if (Math.mod(ti, topics.size() * 2) == 0) { bi++; si++; dpi++; }
}

insert cases;
System.debug('Inserted ' + cases.size() + ' additional RC training cases (batch 3).');

/* -----------------------------------------------------------------------------
 * VERIFY:  SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%'
 * CLEANUP: delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 * ----------------------------------------------------------------------------- */
