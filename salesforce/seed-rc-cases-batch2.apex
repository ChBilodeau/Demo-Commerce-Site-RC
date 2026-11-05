/*
 * seed-rc-cases-batch2.apex
 * -----------------------------------------------------------------------------
 * Generates 200 ADDITIONAL realistic RC support Cases for Coveo Case
 * Classification training. Run AFTER seed-rc-cases.apex (which added 106).
 *
 * Strategy: combine labeled component "topics" (each a row of
 * [key, Type, Reason, Priority, subjects..., | , descriptions...]) with vehicle
 * types and brand names to produce varied, realistic, UNIQUE Subject +
 * Description text, while keeping a clean text -> label mapping for the CC model.
 *
 * NOTE: This uses only flat Lists (no inner classes). Anonymous Apex can
 * mis-parse local classes, so we avoid them here.
 *
 * All subjects are prefixed "RC:" so they sit alongside batch 1 and clean up
 * together:   delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 *
 * HOW TO RUN (Salesforce CLI):
 *   sf apex run --target-org <your-org-alias> --file salesforce/seed-rc-cases-batch2.apex
 *
 * Type values:   Mechanical, Electrical, Electronic, Structural, Other
 * Reason values: Installation, Equipment Complexity, Performance, Breakdown, Feedback
 * -----------------------------------------------------------------------------
 */

// Each topic row: [ type, reason, priority, subjectsJoined, descriptionsJoined ]
// subjects and descriptions are '||'-separated phrasing variants.
List<List<String>> topics = new List<List<String>>{
  // ---- ELECTRICAL ----
  new List<String>{'Electrical','Breakdown','High',
    'LiPo pack will not charge||battery dead after storage||one cell reads zero volts||charger reports connection error',
    'The LiPo pack stopped taking a charge and the balance charger shows an error. One cell appears completely dead.||After sitting over the off-season the battery will not charge at all. The charger beeps and stops immediately.||My pack reads very low total voltage and the charger refuses to start. Can this be recovered safely?'},
  new List<String>{'Electrical','Performance','Medium',
    'runtime dropped dramatically||battery drains too fast||pack gets very hot||short runtime after charge',
    'A fully charged pack now lasts only a few minutes when it used to run much longer. The motor is not unusually hot.||The battery gets hot during normal driving and runtime has dropped a lot. Is the pack worn out or drawing too much current?||Runtime is way down even on a full charge and nothing else changed in the setup.'},
  new List<String>{'Electrical','Installation','Low',
    'which charger settings||how to set charge rate||balance charging question||charger setup help',
    'I just bought a new pack and need the correct charger type, cell count, and charge rate so I do not damage it.||Can you explain the right balance-charging settings for my pack so I charge it safely?||Not sure what amperage to set on the charger for my battery. What is safe?'},

  // ---- ELECTRONIC ----
  new List<String>{'Electronic','Performance','High',
    'motor cuts out under load||brushless motor stutters||power loss at full throttle||motor overheats',
    'The brushless motor runs fine until I apply full throttle, then it cuts out. Possibly thermal protection on the ESC.||Under load the motor stutters and loses power, then recovers. It is smooth at part throttle.||The motor and ESC get very hot and power fades after a few minutes of hard running.'},
  new List<String>{'Electronic','Equipment Complexity','Low',
    'which motor KV to choose||brushed to brushless upgrade||understanding motor ratings||motor selection help',
    'I do not understand KV ratings. For my vehicle and terrain, what motor should I pick for good speed without overheating?||I want to upgrade from brushed to brushless. What motor, ESC, and battery combination works together?||Can you explain how motor KV and turns relate to speed and torque for my setup?'},
  new List<String>{'Electronic','Installation','High',
    'ESC will not calibrate||cannot arm the ESC||ESC throttle setup fails||ESC not responding to throttle',
    'I cannot complete throttle calibration. The ESC keeps beeping and never arms with my radio.||The ESC will not arm no matter how I set the throttle endpoints. What is the correct calibration sequence?||After wiring everything the ESC does not respond to the throttle at all. Did I miss a calibration step?'},
  new List<String>{'Electronic','Breakdown','Medium',
    'ESC flashing error code||ESC overheats and shuts off||ESC died suddenly||burning smell from ESC',
    'The ESC shows a repeating flash pattern and the vehicle will not move. What does the code mean?||After a few minutes the ESC overheats and cuts power until it cools down. Gearing or cooling issue?||There was a puff of smoke from the ESC and now nothing works. Is it fried?'},
  new List<String>{'Electronic','Installation','High',
    'transmitter will not bind||receiver will not pair||bind light keeps flashing||cannot pair radio',
    'The bind light keeps flashing and never goes solid. I followed the manual but the radio will not pair.||My new transmitter and receiver will not bind. What is the correct binding procedure?||I cannot get the receiver to pair with the transmitter even after a reset.'},
  new List<String>{'Electronic','Performance','High',
    'range loss and glitching||servos twitch at distance||signal drops out||radio interference',
    'The vehicle loses signal past a short distance and the servos twitch. The antenna is routed correctly.||I get glitching and dropouts when driving away. Is this interference or a failing receiver?||Control gets erratic at range even on a fresh battery. How do I diagnose radio range issues?'},
  new List<String>{'Electronic','Equipment Complexity','Low',
    'how to set dual rate and trim||model memory setup||reversing a channel||expo and endpoint help',
    'I am new to the hobby. Can you explain dual rate, trim, sub-trim, and expo and how to set them?||I have two vehicles on one radio. How do I save separate model memories and switch between them?||The steering is reversed on my new radio. Which setting flips the channel direction?'},
  new List<String>{'Electronic','Performance','High',
    'drone drifts in hover||quad will not hold position||toilet-bowl effect||GPS hold unstable',
    'My quad drifts in GPS hold and sometimes circles on its own. Do I need to recalibrate the compass?||The drone will not hold position and slowly wanders. Is this a compass or accelerometer calibration issue?||In position hold the quad oscillates and drifts. How do I fix the stability?'},
  new List<String>{'Electronic','Installation','High',
    'one motor will not spin||quad flips on takeoff||motor direction wrong||props in wrong position',
    'When I arm the drone one motor stays silent. Is it the ESC, motor, or flight controller?||The quad flips over the instant I throttle up. Likely motor spin direction or prop placement?||After a rebuild the drone will not lift evenly. I think a motor is spinning the wrong way.'},

  // ---- MECHANICAL ----
  new List<String>{'Mechanical','Breakdown','High',
    'grinding from gearbox||spur gear stripped||pinion slipped||gear mesh noise',
    'Loud grinding under power and the vehicle lurches. I suspect a stripped spur gear or slipped pinion.||I keep stripping spur gears even though the mesh looks right. What am I doing wrong?||There is a harsh grinding noise from the gearbox and power delivery is intermittent.'},
  new List<String>{'Mechanical','Equipment Complexity','Low',
    'how to set gear mesh||pinion spur ratio help||gearing for terrain||slipper clutch setup',
    'Can you explain how to set the correct gear mesh using the paper method so I stop stripping gears?||What pinion and spur combination should I run for my terrain and desired speed?||When should the slipper clutch slip and how tight should I set it for a high-power setup?'},
  new List<String>{'Mechanical','Breakdown','Medium',
    'differential leaking oil||diff feels locked||driveshaft pops out||cv joint failure',
    'The differential is leaking silicone oil onto the chassis. Do I need new seals or a full rebuild?||The center diff feels locked and the vehicle darts. Should I switch to lighter diff oil?||A driveshaft keeps popping out of the cup under hard acceleration. How do I keep it seated?'},
  new List<String>{'Mechanical','Performance','Medium',
    'shocks bottoming out||suspension too soft||shock oil leaking||car bounces on landings',
    'On jumps the shocks bottom hard and the vehicle bounces on landing. Change oil weight or springs?||The suspension feels spongy and oil is weeping from the shocks. Rebuild needed?||The vehicle rebounds and hops after bumps. How should I tune the shocks?'},
  new List<String>{'Mechanical','Performance','Medium',
    'car flips in corners||oversteer on throttle||vehicle pulls to one side||poor cornering grip',
    'The vehicle rolls over in tight corners. Is this camber, ride height, or sway bar tuning?||It snaps loose when I get on the throttle. What tuning reduces on-power oversteer?||The vehicle drifts to one side even with trim centered. Alignment or a weak servo?'},
  new List<String>{'Mechanical','Breakdown','High',
    'steering servo stripped||no steering after crash||servo gears grinding||steering dead',
    'After a crash the steering is dead and I hear grinding. I think the servo gears are stripped.||The steering stopped working and there is a grinding sound from the servo. Replacement steps?||Following an impact the wheels will not turn and the servo makes noise.'},
  new List<String>{'Mechanical','Performance','Medium',
    'steering jitters at center||front wheels shake||servo twitch when idle||steering not centered',
    'The front wheels shake constantly when the vehicle is sitting still even after a new servo saver.||The steering jitters around center. Is this a servo, radio, or mechanical issue?||The wheels twitch at idle and the vehicle wanders. How do I stop the jitter?'},
  new List<String>{'Mechanical','Installation','Low',
    'tires coming unglued||tire separated from rim||which tires for terrain||wheel hex stripped',
    'My tires keep separating from the rims mid-run. What glue and surface prep do you recommend?||A tire unseated from the wheel during a run. How do I properly glue and seat them?||What tire compound and tread should I run for my surface and conditions?'},
  new List<String>{'Mechanical','Breakdown','High',
    'nitro engine will not start||engine floods||engine idles then dies||nitro tuning help',
    'My nitro vehicle will not fire. The glow plug lights and the tank is full but it just floods.||The engine starts then dies after a few seconds. I think the low-speed needle is off.||Can you walk me through tuning the high and low needles so the engine runs cleanly?'},
  new List<String>{'Mechanical','Breakdown','Low',
    'bearings feel rough||bearings seized with dirt||noisy wheel bearings||gritty motor bearings',
    'Several bearings feel gritty and noisy after a dusty run. Clean and re-oil, or replace?||After a muddy session some bearings seized. What is the best way to service them?||There is a rough, grinding feel when I spin the wheels by hand. Bad bearings?'},

  // ---- STRUCTURAL (boosted) ----
  new List<String>{'Structural','Breakdown','Medium',
    'chassis cracked||broken suspension arm||chassis flexes too much||bulkhead cracked',
    'The plastic chassis is cracking near the motor mount. Is there a stiffer or aluminum replacement?||A lower suspension arm snapped in a crash. Which replacement fits and how hard is the swap?||The chassis flexes and has started to crack. Should I brace it or upgrade the material?'},
  new List<String>{'Structural','Breakdown','Low',
    'lexan body cracked||body posts broke||foam wing cracked||fuselage split on landing',
    'The polycarbonate body cracked after a hard hit. Best way to repair and reinforce it?||The foam wing cracked near the root on landing. What glue and reinforcement should I use?||The body mounts broke off. Can I reinforce the mounting points so it lasts?'},
  new List<String>{'Structural','Breakdown','High',
    'boat taking on water||water inside hull||sealing the hull||electronics got wet',
    'Water is getting into the hull and soaking the electronics. How do I seal it properly?||My boat hull leaks around the hatch. What is the right sealing method and gasket?||After a wet run water pooled inside. How do I waterproof the compartment?'},

  // ---- OTHER ----
  new List<String>{'Other','Equipment Complexity','Low',
    'which starter kit to buy||RTR vs kit question||first RC recommendation||upgrade path advice',
    'Buying a first RC for a beginner. What durable, easy-to-drive model do you recommend?||What is the difference between ready-to-run and a build kit, and which suits a newcomer?||My vehicle is stock. What is the recommended order of upgrades to add speed safely?'},
  new List<String>{'Other','Installation','Low',
    'waterproofing electronics||LED light kit install||body trimming help||tool list for maintenance',
    'I want to run in wet grass. How do I waterproof the receiver, servo, and ESC safely?||I want to add an LED light kit. Where does it connect and will it drain the battery much?||What hex and nut drivers and other tools do I need to fully maintain my vehicle?'},
  new List<String>{'Other','Feedback','Medium',
    'warranty claim for defect||missing parts in box||wrong part shipped||order issue',
    'A part failed on the second run and I believe it is defective. How do I start a warranty claim?||My kit arrived with a bag of hardware missing. Can you send the missing screws and shims?||I received the wrong part in my order. How do I get the correct one sent?'},
  new List<String>{'Other','Feedback','Low',
    'thanks for the help||great support experience||troubleshooting guide worked||appreciation',
    'Just wanted to say the troubleshooting guide you sent fixed my issue. Thanks for the help.||Your support team was great and got me back running quickly. Appreciate it.||The setup advice worked perfectly. Thank you for the quick and clear answer.'}
};

// Column indexes into each topic row.
Integer T_TYPE = 0, T_REASON = 1, T_PRIO = 2, T_SUBJ = 3, T_DESC = 4;

List<String> vehicles = new List<String>{
  '1/10 buggy','1/8 nitro buggy','short course truck','rock crawler','drift car',
  'touring car','monster truck','RC airplane','RC helicopter','FPV drone',
  'RC boat','1/5 scale truck','sport plane','quadcopter','basher truck'};
List<String> brands = new List<String>{
  'Traxxas','Arrma','Losi','Team Associated','Tamiya','HPI','Axial','HobbyWing',
  'Spektrum','Castle','Redcat','ECX'};

Integer target = 200;
List<Case> cases = new List<Case>();
Integer ti = 0, vi = 0, bi = 0, si = 0, di = 0;

while (cases.size() < target) {
  List<String> row = topics[Math.mod(ti, topics.size())];
  List<String> subjOpts = row[T_SUBJ].split('\\|\\|');
  List<String> descOpts = row[T_DESC].split('\\|\\|');

  String vehicle = vehicles[Math.mod(vi, vehicles.size())];
  String brand = brands[Math.mod(bi, brands.size())];
  String subjText = subjOpts[Math.mod(si, subjOpts.size())];
  String descText = descOpts[Math.mod(di, descOpts.size())];

  String subject = 'RC: ' + subjText + ' (' + brand + ' ' + vehicle + ')';
  String description = 'Vehicle: ' + brand + ' ' + vehicle + '. ' + descText;

  cases.add(new Case(
    Subject     = subject.length() > 255 ? subject.substring(0, 255) : subject,
    Description = description,
    Type        = row[T_TYPE],
    Reason      = row[T_REASON],
    Priority    = row[T_PRIO],
    Origin      = 'Web',
    Status      = 'Closed'
  ));

  // Advance with offset strides so brand/vehicle/phrasing combinations vary.
  ti++; vi++; bi++; si++; di++;
  if (Math.mod(ti, topics.size()) == 0) { vi++; }
  if (Math.mod(ti, topics.size() * 2) == 0) { bi++; si++; di++; }
}

insert cases;
System.debug('Inserted ' + cases.size() + ' additional RC training cases (batch 2).');

/* -----------------------------------------------------------------------------
 * VERIFY:  SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%'
 * CLEANUP: delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 * ----------------------------------------------------------------------------- */
