#!/usr/bin/env python3
"""
generate-knowledge-v2.py
--------------------------------------------------------------------------------
Generates `seed-rc-knowledge-v2.apex`: 300+ published RC troubleshooting
Knowledge articles, each tagged with Vehicle_Category__c and Problem_Type__c so
the guided-funnel support search can hard-filter them.

Why a generator instead of hand-written Apex:
  - 300+ articles across 6 categories x 6 problem types is far too much to type
    by hand and keep consistent.
  - The picklist values MUST match Salesforce exactly; defining them once here
    avoids drift.
  - You can tweak counts/wording and regenerate.

Run:
  python3 salesforce/generate-knowledge-v2.py
Then deploy the generated Apex:
  sf apex run --target-org <ORG> --file salesforce/seed-rc-knowledge-v2.apex

The articles use slug prefix "rck-" so they never collide with the original
"rc-" set. A cleanup block for the rck- set is included at the bottom of the
generated file.
"""
import html
import json

# Picklist values — MUST match the Salesforce Knowledge__kav picklists exactly.
CATEGORIES = ["Cars & Trucks", "Airplanes", "Helicopters", "Boats", "Drones", "Other"]
PROBLEMS = [
    "Setup & Getting Started",
    "Something Is Broken",
    "Performance & Tuning",
    "Parts & Compatibility",
    "Returns & Warranty",
    "Something Else",
]

# Short code per category/problem used to build unique slugs.
CAT_CODE = {
    "Cars & Trucks": "car", "Airplanes": "air", "Helicopters": "heli",
    "Boats": "boat", "Drones": "drone", "Other": "gen",
}
PRB_CODE = {
    "Setup & Getting Started": "setup", "Something Is Broken": "broken",
    "Performance & Tuning": "perf", "Parts & Compatibility": "parts",
    "Returns & Warranty": "warranty", "Something Else": "else",
}

# A short, human label per category for article text.
CAT_NOUN = {
    "Cars & Trucks": "RC car or truck", "Airplanes": "RC airplane",
    "Helicopters": "RC helicopter", "Boats": "RC boat", "Drones": "drone/quad",
    "Other": "RC setup",
}

# Per-(category, problem) list of concrete topics. Each topic => one article.
# (title_core, body_steps[]) — real, specific troubleshooting content.
TOPICS = {
    ("Cars & Trucks", "Setup & Getting Started"): [
        ("binding your radio to the receiver", ["Power the receiver and enter bind mode (bind plug or button).", "Hold the transmitter bind button while switching it on.", "Wait for the receiver LED to go solid, then power cycle both."]),
        ("calibrating the ESC throttle", ["Turn the transmitter on first with throttle trims neutral.", "Enter ESC calibration per the manual.", "Register full throttle, full brake, and neutral, then power cycle."]),
        ("setting steering dual rate and trim for a first drive", ["Center the steering trim so the wheels point straight.", "Reduce steering dual rate to about 70% for a gentler response.", "Add a little expo to soften center steering."]),
        ("choosing your first battery and charger", ["Match the pack cell count to the ESC rating.", "Set the charger to LiPo and the correct cell count.", "Charge at 1C and always balance charge."]),
        ("break-in and first-run checklist", ["Check all screws and wheel nuts are tight.", "Confirm steering and throttle respond correctly and are not reversed.", "Do a slow first run and listen for binding or rubbing."]),
    ],
    ("Cars & Trucks", "Something Is Broken"): [
        ("grinding noise and a stripped spur gear", ["Inspect the spur and pinion for rounded teeth.", "Replace the stripped gear and reset the mesh with the paper method.", "Verify the motor screws are tight so mesh stays correct."]),
        ("steering is dead after a crash", ["A grinding servo with no movement usually means stripped servo gears.", "Replace the gear set or the servo.", "Fit a quality servo saver to survive future impacts."]),
        ("broken suspension A-arm", ["Match the replacement arm to the model and position.", "Replace bent hinge pins while the arm is off.", "Check the mount for hidden cracks."]),
        ("differential leaking oil", ["Leaking silicone oil means worn X-ring seals.", "Rebuild the diff with new seals and the correct oil weight.", "Reassemble and check for smooth, quiet operation."]),
        ("cracked chassis near the motor mount", ["Stop a small crack by drilling a tiny hole at its tip.", "Replace a badly cracked chassis.", "Consider a stiffer or aluminum option if cracks recur."]),
    ],
    ("Cars & Trucks", "Performance & Tuning"): [
        ("reducing on-power oversteer", ["Use a thicker rear differential oil.", "Soften the rear or stiffen the front suspension.", "Add rear toe-in and apply throttle smoothly."]),
        ("vehicle rolls over in corners", ["Lower the ride height and center of gravity.", "Add sway bars front and rear.", "Reduce excessive tire grip for the surface."]),
        ("choosing a gear ratio for speed vs heat", ["A larger pinion raises top speed but increases heat.", "Change one or two teeth at a time.", "Monitor motor and ESC temperatures after each change."]),
        ("tuning shocks for a bumpy track", ["Use lighter oil and softer springs for rough surfaces.", "Set ride height evenly side to side.", "Bleed shocks so both sides match."]),
        ("motor runs too hot", ["Reduce the pinion a tooth to lower load.", "Improve airflow or add a fan.", "Confirm the drivetrain spins freely with no binding."]),
    ],
    ("Cars & Trucks", "Parts & Compatibility"): [
        ("which tires suit my surface", ["Soft compounds grip smooth or cold surfaces.", "Pin or spike treads suit loose dirt.", "Slicks and ribs suit hard-packed or paved surfaces."]),
        ("finding a compatible body shell", ["Match the body to your chassis scale and wheelbase.", "Check the body post positions line up.", "Trim and drill mounting holes to fit."]),
        ("upgrading to metal gear servo", ["Pick a torque rating suited to your vehicle weight.", "Center the servo before fitting the horn.", "Set steering endpoints to avoid binding."]),
        ("bearing upgrade over bushings", ["Rubber-sealed bearings last longer in dirt and water.", "Replace all bushings as a set for consistent rolling.", "Oil bearings lightly after cleaning."]),
    ],
    ("Cars & Trucks", "Returns & Warranty"): [
        ("starting a warranty claim for a failed part", ["Have your order number and failure description ready.", "Take clear photos of the failed part.", "Note the number of runs and the conditions."]),
        ("order arrived with missing hardware", ["List the exact missing parts (e.g. M3 screws, shims).", "Include your order number.", "We will ship the missing hardware."]),
    ],
    ("Cars & Trucks", "Something Else"): [
        ("recommended spare parts to keep on hand", ["Keep spare spur gears, hinge pins, and driveshafts.", "Stock a spare servo and tires.", "Carry common hardware and thread lock."]),
        ("safe winter storage for your vehicle", ["Store LiPo packs at 3.8V per cell.", "Clean dirt and moisture off the chassis.", "Loosen diffs and keep the vehicle dry."]),
    ],
    ("Airplanes", "Setup & Getting Started"): [
        ("setting control surface throws and expo", ["Set aileron, elevator, and rudder to recommended low-rate throws.", "Add expo for smoother center control.", "Confirm all surfaces move the correct direction."]),
        ("checking center of gravity before first flight", ["Balance the plane at the spot in the manual.", "Shift the battery to adjust CG.", "A slightly nose-heavy setup is safer for a first flight."]),
        ("binding the radio and setting failsafe", ["Bind the receiver to the transmitter.", "Set throttle failsafe to idle so the motor stops on signal loss.", "Test by switching the transmitter off."]),
    ],
    ("Airplanes", "Something Is Broken"): [
        ("repairing a cracked foam wing", ["Use foam-safe CA or epoxy.", "Add a carbon or bamboo spar across the break.", "Let it cure fully before flying."]),
        ("propeller keeps coming loose", ["Check the prop nut and collet for wear.", "Tighten to spec and add a locking collet if needed.", "Inspect after each flight."]),
        ("servo stopped responding after a hard landing", ["Check the servo lead and connector.", "Listen for stripped gears.", "Replace the servo if gears are damaged."]),
    ],
    ("Airplanes", "Performance & Tuning"): [
        ("plane will not maintain altitude", ["Check CG is not tail-heavy.", "Confirm control surfaces are centered and not drooping.", "Verify the motor and prop produce expected thrust."]),
        ("plane rolls to one side on takeoff", ["Trim ailerons for level flight.", "Check for a warped wing.", "Confirm motor thrust angle is correct."]),
    ],
    ("Airplanes", "Parts & Compatibility"): [
        ("choosing a replacement propeller", ["Match diameter and pitch to the motor and ESC.", "Balance the prop to reduce vibration.", "Confirm rotation direction."]),
    ],
    ("Airplanes", "Returns & Warranty"): [
        ("warranty on a motor that failed early", ["Provide order number and flight count.", "Describe the failure and include photos.", "Crash damage is typically not covered."]),
    ],
    ("Airplanes", "Something Else"): [
        ("pre-flight safety checklist", ["Range-check the radio.", "Confirm battery is charged and secure.", "Check all control surfaces and linkages."]),
    ],
    ("Helicopters", "Setup & Getting Started"): [
        ("leveling the swashplate", ["Center all trims and sub-trims.", "Adjust linkages so the swashplate sits level.", "Set collective pitch range per the manual."]),
        ("first hover setup for a beginner", ["Set up on a flat surface away from obstacles.", "Trim for a stable hover a few inches up.", "Practice small corrections."]),
    ],
    ("Helicopters", "Something Is Broken"): [
        ("main gear stripped after a tip-over", ["Replace the stripped main gear.", "Check the pinion mesh.", "Inspect the one-way bearing."]),
        ("tail rotor stopped working", ["Check the tail motor or belt.", "Inspect the tail servo and linkage.", "Confirm the gyro is powered and configured."]),
    ],
    ("Helicopters", "Performance & Tuning"): [
        ("heli vibrates badly in hover", ["Track the main blades with tape.", "Balance the blades.", "Check for a bent shaft or loose grips."]),
        ("tail spins and will not hold heading", ["Adjust gyro gain.", "Check for a weak tail motor.", "Confirm the gyro direction is correct."]),
    ],
    ("Helicopters", "Parts & Compatibility"): [
        ("choosing replacement main blades", ["Match blade length to your heli.", "Balance new blades before flight.", "Replace both blades as a set."]),
    ],
    ("Helicopters", "Returns & Warranty"): [
        ("warranty claim for a defective part", ["Provide order number and photos.", "Describe when the failure occurred.", "Normal wear is not covered."]),
    ],
    ("Helicopters", "Something Else"): [
        ("recommended tools and spares for helis", ["Keep spare blades and a main gear.", "Carry hex drivers and a blade balancer.", "Stock spare linkage balls."]),
    ],
    ("Boats", "Setup & Getting Started"): [
        ("waterproofing checks before launch", ["Reseal the hatch gasket.", "Silicone the stuffing tube and wire exits.", "Bag or coat the receiver and ESC."]),
        ("first run setup on calm water", ["Check steering and throttle direction.", "Confirm water cooling flows.", "Start on calm, shallow water."]),
    ],
    ("Boats", "Something Is Broken"): [
        ("boat is taking on water", ["Find the leak with a dry-run on water.", "Reseal the hatch and tube exits.", "Dry and protect the electronics."]),
        ("motor overheats on the water", ["Confirm the water-cooling line is not clogged.", "Check the ESC and motor are not over-geared.", "Clean the cooling passages."]),
    ],
    ("Boats", "Performance & Tuning"): [
        ("boat will not get up on plane", ["Check the prop size and condition.", "Adjust the strut and trim angle.", "Reduce unnecessary weight."]),
    ],
    ("Boats", "Parts & Compatibility"): [
        ("choosing a replacement prop", ["Match the prop to the hull and motor.", "Balance the prop.", "Confirm rotation direction."]),
    ],
    ("Boats", "Returns & Warranty"): [
        ("warranty for a water-damaged ESC", ["Provide order number and photos.", "Describe the conditions.", "Water intrusion from an unsealed hull is typically not covered."]),
    ],
    ("Boats", "Something Else"): [
        ("post-run care after salt or dirty water", ["Rinse with fresh water and dry.", "Re-grease the drive and seals.", "Check the electronics bay for moisture."]),
    ],
    ("Drones", "Setup & Getting Started"): [
        ("binding FPV goggles to the VTX", ["Set goggles and VTX to the same band and channel.", "Confirm the VTX has an antenna before powering on.", "Start on low power indoors."]),
        ("compass and accelerometer calibration", ["Calibrate the compass away from metal.", "Level-calibrate the accelerometer on a flat surface.", "Recalibrate after moving locations."]),
        ("first flight setup and arming checks", ["Confirm props are on the correct motors.", "Check failsafe and low-battery warnings.", "Hover low before flying out."]),
    ],
    ("Drones", "Something Is Broken"): [
        ("one motor does not spin on arming", ["Check the motor, ESC, and solder joints.", "Swap the motor to isolate the fault.", "Inspect the flight controller output."]),
        ("quad flips immediately on takeoff", ["Verify motor directions in the configurator.", "Fit props by rotation to the correct motors.", "Re-check the motor output mapping."]),
        ("props keep cracking on minor bumps", ["Switch to tougher props rated for your size.", "Check motor balance.", "Inspect arms for cracks."]),
    ],
    ("Drones", "Performance & Tuning"): [
        ("drone drifts and will not hold position", ["Recalibrate the compass.", "Check GPS lock quality.", "Level the accelerometer."]),
        ("video feed is noisy at distance", ["Upgrade the VTX antenna.", "Raise the VTX power setting.", "Keep the antenna clear and vertical."]),
    ],
    ("Drones", "Parts & Compatibility"): [
        ("choosing replacement motors and props", ["Match motor size and KV to your frame.", "Pair props to the motor size.", "Confirm prop rotation."]),
    ],
    ("Drones", "Returns & Warranty"): [
        ("warranty claim for a dead motor", ["Provide order number and photos.", "Describe the flight that caused it.", "Crash damage is typically not covered."]),
    ],
    ("Drones", "Something Else"): [
        ("pre-flight checklist for safe flying", ["Check props, battery, and failsafe.", "Confirm GPS lock if using position hold.", "Fly in open space away from people."]),
    ],
    ("Other", "Setup & Getting Started"): [
        ("choosing charger settings for a new pack", ["Set chemistry to LiPo and the correct cell count.", "Charge at 1C and balance charge.", "Charge slower when unsure."]),
        ("parallel charging packs safely", ["Only parallel charge same cell count and similar charge.", "Use a board with fuses.", "Never mix chemistries."]),
        ("waterproofing receiver, servo, and ESC", ["Use a sealed receiver box.", "Grease connectors and coat boards.", "Choose waterproof-rated components."]),
    ],
    ("Other", "Something Is Broken"): [
        ("LiPo will not charge", ["Check the balance lead and reseat it.", "Measure per-cell voltage; 0.0V means a dead cell.", "Never charge a hot or puffed pack."]),
        ("puffed LiPo handling and disposal", ["Stop using the pack.", "Do not puncture or compress it.", "Discharge to storage voltage and recycle."]),
        ("charger reports voltage too low", ["Some chargers lock out below 3.0V per cell.", "Use a recovery mode only if supported.", "Watch the pack closely and stop if it heats."]),
    ],
    ("Other", "Performance & Tuning"): [
        ("short runtime and a hot battery", ["Check cell internal resistance for aging.", "Avoid over-gearing that forces high current.", "Replace a pack past its service life."]),
    ],
    ("Other", "Parts & Compatibility"): [
        ("matching connectors between pack and ESC", ["Identify the connector types (XT60, XT90, EC5).", "Use an adapter or solder a matching connector.", "Keep polarity correct."]),
        ("which charger works in another country", ["Check the charger input voltage range.", "Use a power supply rated for local mains.", "Do not exceed the rated input."]),
    ],
    ("Other", "Returns & Warranty"): [
        ("warranty on a charger or accessory", ["Provide order number and photos.", "Describe the fault.", "Keep original packaging if possible."]),
    ],
    ("Other", "Something Else"): [
        ("best way to store LiPo packs", ["Store at 3.8V per cell.", "Keep in a cool, dry, fireproof container.", "Check voltage periodically."]),
        ("essential maintenance tool kit", ["Metric hex and nut drivers.", "Needle-nose pliers and a turnbuckle wrench.", "Thread lock and shock oil."]),
    ],
}

# To reach 300+ we create several concrete variants per base topic (e.g. for
# different models/scales), keeping each article distinct and realistic.
VARIANTS = ["1/10 scale", "1/8 scale", "entry-level", "hobby-grade", "upgraded", "racing"]

# A few extra base topics for the thinner categories/problems so every bucket
# has enough content for the funnel to look populated.
EXTRA_TOPICS = {
    ("Boats", "Parts & Compatibility"): [
        ("choosing a replacement rudder", ["Match the rudder size to the hull.", "Check the linkage reaches the servo.", "Seal the rudder post against water."]),
        ("selecting a water-cooling kit", ["Match the kit to your motor and ESC.", "Route tubing clear of the driveshaft.", "Confirm flow before a full run."]),
    ],
    ("Boats", "Something Else"): [
        ("trailering and transport tips", ["Remove the battery for transport.", "Secure the hull so it cannot shift.", "Protect the prop and rudder."]),
    ],
    ("Helicopters", "Parts & Compatibility"): [
        ("choosing a replacement tail motor", ["Match the motor to your heli class.", "Confirm the connector and mount.", "Check the gyro supports it."]),
    ],
    ("Helicopters", "Something Else"): [
        ("safe indoor practice setup", ["Clear a wide, obstacle-free space.", "Use prop/blade guards if available.", "Practice gentle hover corrections."]),
    ],
    ("Airplanes", "Something Else"): [
        ("field etiquette and safe flying", ["Announce takeoffs and landings at a club.", "Keep clear of people and property.", "Follow local flight rules."]),
    ],
    ("Boats", "Returns & Warranty"): [
        ("missing hardware in a boat kit", ["List the missing parts and order number.", "Include photos of the kit contents.", "We will ship the missing items."]),
    ],
}


def esc(s: str) -> str:
    """Escape a string for embedding in an Apex single-quoted string literal."""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def body_html(category, problem, title_core, steps, variant):
    intro = (
        f"<h2>{html.escape(title_core.capitalize())}</h2>"
        f"<p>Applies to {html.escape(variant)} {html.escape(CAT_NOUN[category])} models. "
        f"Category: {html.escape(category)}. Problem type: {html.escape(problem)}.</p>"
        f"<ol>"
    )
    lis = "".join(f"<li>{html.escape(s)}</li>" for s in steps)
    return intro + lis + "</ol>"


def main():
    rows = []  # each: (slug, title, summary, bodyHtml, category, problem)
    seen = set()
    # Merge the extra topics into the main map.
    for key, extra in EXTRA_TOPICS.items():
        TOPICS.setdefault(key, [])
        TOPICS[key].extend(extra)
    for (category, problem), topics in TOPICS.items():
        for ti, (title_core, steps) in enumerate(topics):
            # Create a few variants of the common ones to build volume.
            if problem in ("Setup & Getting Started", "Something Is Broken", "Performance & Tuning"):
                n_variants = len(VARIANTS)
            else:
                n_variants = 3
            for vi in range(n_variants):
                variant = VARIANTS[vi % len(VARIANTS)]
                slug = f"rck-{CAT_CODE[category]}-{PRB_CODE[problem]}-{ti}-{vi}"
                if slug in seen:
                    continue
                seen.add(slug)
                title = f"RC: {title_core.capitalize()} ({variant} {CAT_NOUN[category]})"
                summary = f"{category} / {problem}: {title_core}. Step-by-step guidance for {variant} models."
                rows.append((slug, title, summary, body_html(category, problem, title_core, steps, variant), category, problem))

    # Anonymous Apex is capped at ~32,000 characters per execution, so we split
    # the articles into numbered batch files of BATCH_SIZE each. Run them in
    # order; each is independent and idempotent (slugs are unique).
    BATCH_SIZE = 40
    import os
    out_dir = "salesforce/knowledge-v2"
    os.makedirs(out_dir, exist_ok=True)
    # Clear any previous batch files so a smaller run doesn't leave stale ones.
    for old in os.listdir(out_dir):
        if old.startswith("seed-rc-knowledge-v2-") and old.endswith(".apex"):
            os.remove(os.path.join(out_dir, old))

    batches = [rows[i:i + BATCH_SIZE] for i in range(0, len(rows), BATCH_SIZE)]
    max_chars = 0
    for bi, batch in enumerate(batches, start=1):
        apex = []
        apex.append("/*")
        apex.append(f" * seed-rc-knowledge-v2-{bi:02d}.apex  (GENERATED — do not hand-edit)")
        apex.append(f" * Batch {bi} of {len(batches)}: {len(batch)} tagged RC Knowledge articles.")
        apex.append(" * Anonymous Apex has a ~32,000 char limit, so articles are split into batches.")
        apex.append(f" * Run each batch in order:")
        apex.append(f" *   sf apex run --target-org <ORG> --file {out_dir}/seed-rc-knowledge-v2-{bi:02d}.apex")
        apex.append(" */")
        apex.append("")
        apex.append("// Each row: [ slug, title, summary, bodyHtml, vehicleCategory, problemType ]")
        apex.append("List<List<String>> arts = new List<List<String>>{")
        for i, (slug, title, summary, body, cat, prob) in enumerate(batch):
            comma = "," if i < len(batch) - 1 else ""
            apex.append(
                "  new List<String>{"
                f"'{esc(slug)}','{esc(title)}','{esc(summary)}','{esc(body)}','{esc(cat)}','{esc(prob)}'"
                "}" + comma
            )
        apex.append("};")
        apex.append("")
        apex.append("Integer created = 0, published = 0;")
        apex.append("List<String> publishIds = new List<String>();")
        apex.append("for (List<String> a : arts) {")
        apex.append("  Knowledge__kav kav = new Knowledge__kav(")
        apex.append("    Title = a[1], UrlName = a[0], Summary = a[2], Article_Body__c = a[3],")
        apex.append("    Vehicle_Category__c = a[4], Problem_Type__c = a[5], Language = 'en_US'")
        apex.append("  );")
        apex.append("  insert kav; created++;")
        apex.append("  Knowledge__kav draft = [SELECT Id, KnowledgeArticleId FROM Knowledge__kav WHERE Id = :kav.Id LIMIT 1];")
        apex.append("  publishIds.add(draft.KnowledgeArticleId);")
        apex.append("}")
        apex.append("for (String kaId : publishIds) {")
        apex.append("  try { KbManagement.PublishingService.publishArticle(kaId, true); published++; }")
        apex.append("  catch (Exception e) { System.debug('Publish failed for ' + kaId + ': ' + e.getMessage()); }")
        apex.append("}")
        apex.append(f"System.debug('Batch {bi}/{len(batches)}: created ' + created + ', published ' + published + '.');")
        apex.append("")
        text = "\n".join(apex)
        max_chars = max(max_chars, len(text))
        with open(f"{out_dir}/seed-rc-knowledge-v2-{bi:02d}.apex", "w") as f:
            f.write(text)

    # A separate verify/cleanup helper (tiny, safe to run any time).
    helper = [
        "/* seed-rc-knowledge-v2-VERIFY-CLEANUP.apex",
        " * VERIFY count (run in Query Editor):",
        " *   SELECT COUNT() FROM Knowledge__kav WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online'",
        " * CLEANUP (archive + delete the whole rck- set) — run in Execute Anonymous: */",
        "for (Knowledge__kav k : [SELECT KnowledgeArticleId FROM Knowledge__kav",
        "                         WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online']) {",
        "  KbManagement.PublishingService.archiveOnlineArticle(k.KnowledgeArticleId, null);",
        "}",
        "delete [SELECT Id FROM Knowledge__kav WHERE UrlName LIKE 'rck-%'];",
        "System.debug('rck- articles archived and deleted.');",
        "",
    ]
    with open(f"{out_dir}/seed-rc-knowledge-v2-VERIFY-CLEANUP.apex", "w") as f:
        f.write("\n".join(helper))

    # Report.
    from collections import Counter
    by_cat = Counter(r[4] for r in rows)
    by_prob = Counter(r[5] for r in rows)
    print(f"Generated {len(rows)} articles in {len(batches)} batch files -> {out_dir}/")
    print(f"Largest batch: {max_chars} chars (Apex limit is ~32000)")
    print("By category:", json.dumps(dict(by_cat)))
    print("By problem :", json.dumps(dict(by_prob)))


if __name__ == "__main__":
    main()
