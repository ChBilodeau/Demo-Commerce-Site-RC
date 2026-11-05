/*
 * seed-rc-cases.apex
 * -----------------------------------------------------------------------------
 * Seeds ~100 realistic remote-control (RC) support Cases into a Salesforce dev
 * org so a Coveo Case Classification (CC) model has enough training data.
 *
 * HOW TO RUN (Developer Console):
 *   1. Setup gear -> Developer Console
 *   2. Debug -> Open Execute Anonymous Window  (or press Ctrl/Cmd+E)
 *   3. Paste this ENTIRE file
 *   4. Check "Open Log" (optional) and click Execute
 *   5. Verify: App Launcher -> Cases, or run the SOQL at the bottom in the
 *      Query Editor:  SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%'
 *
 * NOTES
 *   - Writes to STANDARD Case fields only: Subject, Description, Type, Reason,
 *     Priority, Origin, Status. No custom fields or picklist edits required.
 *   - Every seeded Subject is prefixed with "RC:" so you can find/delete them
 *     easily (cleanup snippet at the bottom).
 *   - Type / Reason / Priority are the classification LABELS the Coveo CC model
 *     will learn to predict from Subject + Description.
 *   - Type and Reason values below are STANDARD picklist values that exist in a
 *     fresh dev org. If your org restricts them, see the "PICKLIST" note below.
 * -----------------------------------------------------------------------------
 */

// A single row of training data. category drives Type/Reason/Priority so the
// model has a clean, learnable signal from the text.
List<Case> cases = new List<Case>();

// Helper to push a case. We keep Status = 'Closed' so they look like history,
// and Origin = 'Web' to mimic storefront-created cases.
// -----------------------------------------------------------------------------
// Each entry: Subject | Description | Type | Reason | Priority
// Type/Reason use standard dev-org picklist values:
//   Type:   Mechanical, Electrical, Electronic, Structural, Other
//   Reason: Installation, Equipment Complexity, Performance, Breakdown,
//           Equipment Design, Feedback, Other
// (If a value is missing in your org, Apex will error on insert; see PICKLIST.)
// -----------------------------------------------------------------------------
List<List<String>> rows = new List<List<String>>{
  // ---- BATTERY / POWER (Electrical) ----
  new List<String>{'RC: LiPo battery will not charge', 'My 2S LiPo pack stopped charging. The balance charger shows a connection error and one cell reads 0.0V. Charger works with my other packs.', 'Electrical', 'Breakdown', 'High'},
  new List<String>{'RC: LiPo puffed up after a session', 'After a 20 minute run the battery is swollen. It still powers the car but I am worried it is damaged. What should I do?', 'Electrical', 'Breakdown', 'High'},
  new List<String>{'RC: Battery drains in minutes', 'Fully charged 5000mAh pack only lasts about 3 minutes under normal driving. Used to last 15. Motor is not hot.', 'Electrical', 'Performance', 'Medium'},
  new List<String>{'RC: Which charger for a 4S LiPo', 'I just bought a 4S pack and need to know which balance charger and settings I should use so I do not damage it.', 'Electrical', 'Installation', 'Low'},
  new List<String>{'RC: Battery connector does not fit ESC', 'My new pack has an XT90 connector but the ESC has XT60. Do I need an adapter or should I solder a new one?', 'Electrical', 'Installation', 'Low'},
  new List<String>{'RC: Charger says battery voltage too low', 'The charger refuses to charge and reports voltage too low to start. Can this pack be recovered safely?', 'Electrical', 'Breakdown', 'Medium'},
  new List<String>{'RC: NiMH vs LiPo for my truck', 'Should I upgrade from the stock NiMH battery to LiPo for more runtime and speed? What do I need to change?', 'Electrical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Battery gets very hot during use', 'The pack is hot to the touch after driving. Is this normal or a sign of a problem with the pack or ESC?', 'Electrical', 'Performance', 'Medium'},

  // ---- MOTOR (Electronic / Electrical) ----
  new List<String>{'RC: Brushless motor cuts out under load', 'The motor runs fine at low throttle but cuts out when I punch it. ESC may be going into thermal protection.', 'Electronic', 'Performance', 'High'},
  new List<String>{'RC: Motor stutters at low speed', 'At crawl speed the brushless motor cogs and stutters. Smooth at higher speed. Is this a timing or ESC issue?', 'Electronic', 'Performance', 'Medium'},
  new List<String>{'RC: Motor smells like burning', 'There was a burning smell and the motor is now very weak. I think I stalled it in deep grass. Is it dead?', 'Electronic', 'Breakdown', 'High'},
  new List<String>{'RC: How to choose motor KV rating', 'I do not understand KV ratings. For a 1/10 buggy on grass, what KV should I pick for good speed without overheating?', 'Electronic', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Brushed to brushless upgrade', 'I want to convert my brushed truck to brushless. What motor, ESC, and battery combination do you recommend?', 'Electronic', 'Installation', 'Low'},
  new List<String>{'RC: Motor runs in reverse', 'After swapping the motor the wheels spin backward. How do I reverse the direction on a brushless setup?', 'Electronic', 'Installation', 'Medium'},

  // ---- ESC (Electronic) ----
  new List<String>{'RC: ESC not calibrating with transmitter', 'I cannot complete the throttle calibration. The ESC keeps beeping and never arms. Using a new radio set.', 'Electronic', 'Installation', 'High'},
  new List<String>{'RC: ESC LED flashing red', 'The ESC shows a repeating red flash and the car will not move. What does this error code mean?', 'Electronic', 'Breakdown', 'Medium'},
  new List<String>{'RC: How to set ESC to blinky mode', 'For racing I need the ESC in zero-timing blinky mode. Can you walk me through the programming steps?', 'Electronic', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: ESC overheats and shuts down', 'After a few minutes the ESC gets hot and the car stops until it cools. Gearing or cooling problem?', 'Electronic', 'Performance', 'Medium'},
  new List<String>{'RC: No reverse after ESC reset', 'I reprogrammed the ESC and now I have no reverse, only brake. How do I re-enable reverse?', 'Electronic', 'Installation', 'Low'},

  // ---- RADIO / RECEIVER (Electronic) ----
  new List<String>{'RC: Transmitter will not bind to receiver', 'The bind light keeps flashing and never goes solid. I followed the manual but it will not pair.', 'Electronic', 'Installation', 'High'},
  new List<String>{'RC: Car has range issues and glitches', 'The car loses signal past about 20 feet and the servos twitch. Antenna is routed correctly.', 'Electronic', 'Performance', 'High'},
  new List<String>{'RC: How to set up dual rate and trim', 'New to the hobby. Can you explain dual rate, trim, and sub-trim and how to set them for a touring car?', 'Electronic', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Failsafe not working', 'When I turn the transmitter off the car keeps rolling. How do I program the failsafe so it stops?', 'Electronic', 'Installation', 'Medium'},
  new List<String>{'RC: Receiver died after water', 'I drove through a puddle and now the receiver is unresponsive. Can it be dried out or is it ruined?', 'Electronic', 'Breakdown', 'Medium'},

  // ---- SERVO / STEERING (Mechanical / Electronic) ----
  new List<String>{'RC: Steering servo jitters at center', 'The front wheels shake constantly when sitting still. Replaced the servo saver but it still jitters.', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: Servo gears stripped after crash', 'After hitting a curb the steering is dead and I hear grinding. I think the servo gears are stripped.', 'Mechanical', 'Breakdown', 'High'},
  new List<String>{'RC: Car pulls to one side', 'The truck drifts left even with trim centered. Could be alignment or a weak servo. How do I diagnose?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: How to install a metal gear servo', 'Upgrading to a metal gear steering servo. What torque rating do I need and how do I set the horn centered?', 'Mechanical', 'Installation', 'Low'},
  new List<String>{'RC: Steering range too small', 'The wheels barely turn compared to before. Is this an endpoint setting or a mechanical limit?', 'Electronic', 'Installation', 'Low'},

  // ---- DRIVETRAIN / GEARS (Mechanical) ----
  new List<String>{'RC: Grinding noise from gearbox', 'Loud grinding under power and the car lurches. I suspect a stripped spur gear or slipped pinion.', 'Mechanical', 'Breakdown', 'High'},
  new List<String>{'RC: Spur gear keeps stripping', 'I have stripped three spur gears in a week. Mesh seems fine. What am I doing wrong with the gearing?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: How to set pinion spur mesh', 'Can you explain how to set the correct gear mesh using the paper method so I stop stripping gears?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Differential is leaking oil', 'The front diff is leaking silicone oil onto the chassis. Do I need new seals or a rebuild?', 'Mechanical', 'Breakdown', 'Medium'},
  new List<String>{'RC: Driveshaft popped out', 'A center driveshaft keeps popping out of the cup under hard acceleration. How do I keep it seated?', 'Mechanical', 'Breakdown', 'Medium'},
  new List<String>{'RC: Slipper clutch adjustment', 'When should the slipper clutch slip and how tight should I set it for a high-power buggy?', 'Mechanical', 'Equipment Complexity', 'Low'},

  // ---- SUSPENSION / SHOCKS (Mechanical) ----
  new List<String>{'RC: Shocks are bottoming out', 'On jumps the shocks bottom hard and the car bounces. Should I change oil weight or spring rate?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: Shock oil leaking', 'Oil is weeping from the top of my rear shocks and they feel spongy. Rebuild needed?', 'Mechanical', 'Breakdown', 'Low'},
  new List<String>{'RC: How to tune suspension for bumpy track', 'My local track is very rough. How should I set shock oil, springs, and ride height for better handling?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Car flips over on turns', 'The buggy rolls over in tight corners. Is this a camber, ride height, or sway bar tuning issue?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: Broken A-arm after crash', 'The front lower A-arm snapped in a crash. Which replacement part fits and how hard is the swap?', 'Mechanical', 'Breakdown', 'Medium'},

  // ---- TIRES / WHEELS (Mechanical) ----
  new List<String>{'RC: Tires keep coming unglued', 'My tires keep separating from the rims mid-run. What glue and prep do you recommend?', 'Mechanical', 'Installation', 'Low'},
  new List<String>{'RC: Which tires for loose dirt', 'I drive on loose, dusty dirt. What tire compound and tread should I run for grip?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Wheel hex stripped', 'A wheel keeps wobbling and I found the hex is rounded out. Do I replace the hex, the axle, or both?', 'Mechanical', 'Breakdown', 'Low'},

  // ---- NITRO / ENGINE (Mechanical) ----
  new List<String>{'RC: Nitro engine will not start', 'My nitro buggy will not fire. Glow plug glows, tank is full, but it just floods. Tuning help?', 'Mechanical', 'Breakdown', 'High'},
  new List<String>{'RC: Nitro engine idles then dies', 'Engine starts but dies after a few seconds. I think the idle or low-speed needle is off.', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: How to break in a new nitro engine', 'I just got a new .21 engine. Can you give me the heat-cycle break-in procedure step by step?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Nitro running too lean', 'Not much smoke and the engine is very hot. I think it is lean. Which way do I turn the needle?', 'Mechanical', 'Performance', 'Medium'},

  // ---- AIRPLANE (Structural / Mechanical) ----
  new List<String>{'RC: Plane will not maintain altitude', 'My trainer plane keeps losing height even at full throttle. CG and control surfaces look okay.', 'Mechanical', 'Performance', 'High'},
  new List<String>{'RC: How to set control surface throws', 'First RC plane. How do I set aileron, elevator, and rudder throws and expo for a gentle first flight?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Foam wing cracked on landing', 'The foam wing cracked near the root after a hard landing. Best glue and reinforcement method?', 'Structural', 'Breakdown', 'Medium'},
  new List<String>{'RC: Plane rolls right on takeoff', 'On takeoff the plane rolls right every time. Is this trim, motor thrust angle, or warped wing?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: Prop keeps coming loose', 'The propeller nut backs off in flight. How tight should it be and do I need a locking collet?', 'Mechanical', 'Breakdown', 'High'},

  // ---- HELICOPTER (Mechanical) ----
  new List<String>{'RC: Heli vibrates badly in hover', 'My heli shakes a lot in hover and the tail wags. I think the blades need tracking and balancing.', 'Mechanical', 'Performance', 'High'},
  new List<String>{'RC: How to set up swashplate', 'New to helis. Can you explain leveling the swashplate and setting collective pitch for a beginner?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Tail spins uncontrollably', 'The tail keeps spinning and I cannot hold heading. Is this a gyro gain or tail motor problem?', 'Electronic', 'Performance', 'High'},
  new List<String>{'RC: Main gear stripped after crash', 'After a tip-over the main gear is stripped and the heli will not spool up. Replacement steps?', 'Mechanical', 'Breakdown', 'Medium'},

  // ---- DRONE / FPV (Electronic) ----
  new List<String>{'RC: Drone drifts and will not hold position', 'My quad drifts in GPS hold and sometimes toilet-bowls. Do I need to recalibrate the compass?', 'Electronic', 'Performance', 'High'},
  new List<String>{'RC: One motor does not spin on arm', 'When I arm the drone, one motor stays silent. ESC, motor, or flight controller problem?', 'Electronic', 'Breakdown', 'High'},
  new List<String>{'RC: How to bind FPV goggles', 'I cannot get video in my FPV goggles. How do I set the channel and bind the VTX to the receiver?', 'Electronic', 'Installation', 'Medium'},
  new List<String>{'RC: Drone flips on takeoff', 'The quad flips over immediately when I throttle up. Likely a motor direction or prop orientation issue?', 'Electronic', 'Installation', 'High'},
  new List<String>{'RC: Props keep cracking', 'My propellers crack after minor bumps. Are there tougher props that fit my 5 inch quad?', 'Mechanical', 'Breakdown', 'Low'},

  // ---- BOAT (Electrical / Mechanical) ----
  new List<String>{'RC: RC boat takes on water', 'Water is getting inside the hull and soaking the electronics. How do I seal it properly?', 'Structural', 'Breakdown', 'High'},
  new List<String>{'RC: Boat motor overheats', 'The brushless motor and ESC overheat quickly on the water. Is the water-cooling line clogged?', 'Electrical', 'Performance', 'Medium'},
  new List<String>{'RC: Boat will not plane', 'My boat plows through the water and will not get up on plane. Prop, strut, or weight issue?', 'Mechanical', 'Performance', 'Low'},

  // ---- GENERAL / QUESTION (Other / Feedback) ----
  new List<String>{'RC: Which starter kit for a 10 year old', 'Buying a first RC car for my kid. What durable, easy-to-drive ready-to-run would you recommend?', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Difference between RTR and kit', 'What is the difference between a ready-to-run and a build-it-yourself kit, and which is better for a beginner?', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Waterproofing my electronics', 'I want to run in wet grass. How do I waterproof the receiver, servo, and ESC safely?', 'Other', 'Installation', 'Low'},
  new List<String>{'RC: Recommended spare parts to keep', 'What spare parts should I always have on hand for a 1/10 buggy so I am not stuck at the track?', 'Other', 'Feedback', 'Low'},
  new List<String>{'RC: Order arrived with missing screws', 'My kit was missing a bag of hardware. Can you send the missing M3 screws and shims?', 'Other', 'Feedback', 'Medium'},
  new List<String>{'RC: Great support last time', 'Just wanted to say the troubleshooting guide you sent fixed my ESC issue. Thanks for the help.', 'Other', 'Feedback', 'Low'},
  new List<String>{'RC: Can I use this charger in Europe', 'I am traveling and want to know if my LiPo charger supports 230V or if I need a converter.', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Upgrade path for more speed', 'My truck is stock. What is the recommended order of upgrades to safely increase top speed?', 'Other', 'Equipment Complexity', 'Low'},

  // ---- MORE BATTERY / POWER ----
  new List<String>{'RC: Low voltage cutoff too aggressive', 'The ESC cuts power while I still have charge left. How do I adjust the LVC for a LiPo pack?', 'Electronic', 'Installation', 'Low'},
  new List<String>{'RC: Can I parallel charge packs', 'I have four identical 2S packs. Is it safe to parallel charge them and what board do I need?', 'Electrical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Battery swelled and now car is slow', 'Since the pack puffed the car is sluggish. Is the puffed pack causing the power loss?', 'Electrical', 'Performance', 'Medium'},

  // ---- MORE MOTOR / ESC ----
  new List<String>{'RC: Motor bearings feel rough', 'Spinning the motor by hand it feels gritty and noisy. Can I just replace the bearings?', 'Mechanical', 'Breakdown', 'Low'},
  new List<String>{'RC: Sensor wire fell off', 'The sensor cable between my brushless motor and ESC came loose. Will it run sensorless without it?', 'Electronic', 'Installation', 'Medium'},
  new List<String>{'RC: ESC capacitor fell off', 'One of the capacitors broke off the ESC. Is it safe to run and can it be re-soldered?', 'Electronic', 'Breakdown', 'Medium'},

  // ---- MORE RADIO ----
  new List<String>{'RC: How to set up model memory', 'I have two cars on one radio. How do I save separate model memories and switch between them?', 'Electronic', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Steering reversed after new radio', 'New transmitter and the steering is backward. Which setting reverses the channel direction?', 'Electronic', 'Installation', 'Low'},

  // ---- MORE DRIVETRAIN / CHASSIS ----
  new List<String>{'RC: Chassis flexes and cracks', 'The plastic chassis is cracking near the motor mount. Is there a stiffer or aluminum option?', 'Structural', 'Breakdown', 'Medium'},
  new List<String>{'RC: Bearings seized with dirt', 'After a muddy run several bearings are seized. Best way to clean, re-oil, or replace them?', 'Mechanical', 'Breakdown', 'Low'},
  new List<String>{'RC: Center diff too tight', 'The center differential feels locked and the car darts. Should I use lighter diff oil?', 'Mechanical', 'Performance', 'Low'},

  // ---- MORE SUSPENSION / HANDLING ----
  new List<String>{'RC: Car oversteers on throttle', 'The buggy snaps loose when I get on the throttle. What tuning reduces on-power oversteer?', 'Mechanical', 'Performance', 'Medium'},
  new List<String>{'RC: Ride height uneven side to side', 'One side of the car sits lower. Did I build the shocks with different oil or spring preload?', 'Mechanical', 'Installation', 'Low'},

  // ---- MORE AIR / HELI / DRONE ----
  new List<String>{'RC: Gyro drift on fixed wing', 'My plane with a gyro stabilizer slowly banks on its own. How do I recalibrate the gyro level?', 'Electronic', 'Performance', 'Medium'},
  new List<String>{'RC: Heli blades out of track', 'One blade flies higher than the other causing vibration. How do I track the blades with tape?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Drone GPS never locks', 'My quad never gets a GPS lock outdoors. Firmware, antenna, or interference issue?', 'Electronic', 'Breakdown', 'Medium'},
  new List<String>{'RC: Camera feed is noisy', 'The FPV video is full of static once I fly away. Antenna upgrade or VTX power setting?', 'Electronic', 'Performance', 'Low'},

  // ---- MORE GENERAL ----
  new List<String>{'RC: Need manual for discontinued model', 'I bought a used truck with no manual and the model is discontinued. Can you send a PDF?', 'Other', 'Feedback', 'Low'},
  new List<String>{'RC: Warranty claim for broken part', 'A gear snapped on the second run and I believe it is a defect. How do I start a warranty claim?', 'Other', 'Feedback', 'Medium'},
  new List<String>{'RC: Compatible body shells', 'What body shells fit my 1/10 touring chassis? I want a different look without changing mounts.', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Best way to store LiPos', 'How should I store my LiPo packs over winter so they stay healthy? What storage voltage?', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Tools needed to maintain my buggy', 'What hex drivers, nut drivers, and other tools do I need to fully maintain a 1/10 buggy?', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Paint cracking on lexan body', 'The paint on my polycarbonate body cracks and flakes. Did I use the wrong paint or prep?', 'Other', 'Installation', 'Low'},
  new List<String>{'RC: How to clean after beach run', 'I ran near the beach and got sand everywhere. What is the safe cleaning routine for the electronics?', 'Other', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Upgrade bearings worth it', 'Are rubber-sealed ball bearing upgrades worth it over the stock bushings for a budget truck?', 'Other', 'Feedback', 'Low'},
  new List<String>{'RC: LED light kit install', 'I want to add an LED light kit. Where do I plug it in and will it drain my battery much?', 'Electrical', 'Installation', 'Low'},
  new List<String>{'RC: Loud rattle at speed', 'There is a rattle that only appears at high speed. How do I track down loose screws or parts?', 'Mechanical', 'Performance', 'Low'},
  new List<String>{'RC: Antenna tube broke off', 'The receiver antenna tube snapped. Can I shorten the wire or do I need a full replacement?', 'Electronic', 'Breakdown', 'Low'},
  new List<String>{'RC: Steering trim will not hold', 'Every time I power on, the steering trim resets and the car pulls. Radio or receiver fault?', 'Electronic', 'Breakdown', 'Medium'},
  new List<String>{'RC: What gearing for top speed runs', 'I want to do speed runs on pavement. What pinion/spur and tires keep temps safe at high speed?', 'Mechanical', 'Equipment Complexity', 'Low'},
  new List<String>{'RC: Body posts too tall', 'My body sits too high because the posts are long. Can I trim them and how do I mark the holes?', 'Mechanical', 'Installation', 'Low'},
  new List<String>{'RC: Crawler has no low-end torque', 'My rock crawler struggles on steep climbs. Motor KV, gearing, or tire change to fix it?', 'Electronic', 'Performance', 'Medium'},
  new List<String>{'RC: Servo saver too soft', 'The steering feels vague and the servo saver is very soft. How tight should I set it?', 'Mechanical', 'Performance', 'Low'},
  new List<String>{'RC: Receiver box full of dust', 'Fine dust got into the receiver box. Should I seal it with grease or a cover and how?', 'Other', 'Installation', 'Low'}
};

for (List<String> r : rows) {
  cases.add(new Case(
    Subject     = r[0],
    Description = r[1],
    Type        = r[2],
    Reason      = r[3],
    Priority    = r[4],
    Origin      = 'Web',
    Status      = 'Closed'
  ));
}

insert cases;
System.debug('Inserted ' + cases.size() + ' RC training cases.');

/* -----------------------------------------------------------------------------
 * PICKLIST NOTE
 * If insert fails with "bad value for restricted picklist field: Type/Reason",
 * your org restricts those picklists. Fastest fix WITHOUT editing picklists:
 * comment out the Type and Reason lines in the loop above (leave Priority), then
 * re-run. The model can still train on Priority, and you can add RC-specific
 * picklist values later in Setup -> Object Manager -> Case -> Fields & Relationships
 * -> Type (or Reason) -> add values, then re-run with Type/Reason enabled.
 * -----------------------------------------------------------------------------
 * CLEANUP (to remove all seeded cases, run in Execute Anonymous):
 *   delete [SELECT Id FROM Case WHERE Subject LIKE 'RC:%'];
 * VERIFY COUNT (run in Query Editor):
 *   SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%'
 * ----------------------------------------------------------------------------- */
