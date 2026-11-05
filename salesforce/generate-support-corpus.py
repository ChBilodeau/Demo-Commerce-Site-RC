#!/usr/bin/env python3
"""
generate-support-corpus.py
--------------------------------------------------------------------------------
Generates an ALIGNED support corpus for the RC demo, sized to fit the org's
tight 5 MB data storage:

  - ~120 Knowledge articles, each a real problem + resolution, tagged with
    Vehicle_Category__c and Problem_Type__c.
  - ~150 Cases whose Subject/Description describe the SAME problems (same
    category + problem type), so Coveo search surfaces the matching article for
    a case's topic and the Case Classification model trains on aligned data.

Articles and cases are not linked by a junction object (that would cost extra
storage and is fiddly to seed); instead they MIRROR each other by topic + tags.

Outputs (Apex, batched under the ~32k anonymous-Apex char limit):
  salesforce/support-corpus/articles-NN.apex   (run each in order)
  salesforce/support-corpus/cases-NN.apex       (run each in order)
  salesforce/support-corpus/VERIFY.apex

Run:
  python3 salesforce/generate-support-corpus.py
Then:
  for f in salesforce/support-corpus/articles-*.apex; do sf apex run --target-org VSCodePlayground --file "$f"; done
  for f in salesforce/support-corpus/cases-*.apex;    do sf apex run --target-org VSCodePlayground --file "$f"; done
"""
import html
import os

CATEGORIES = ["Cars & Trucks", "Airplanes", "Helicopters", "Boats", "Drones", "Other"]
PROBLEMS = [
    "Setup & Getting Started", "Something Is Broken", "Performance & Tuning",
    "Parts & Compatibility", "Returns & Warranty", "Something Else",
]
CAT_CODE = {"Cars & Trucks": "car", "Airplanes": "air", "Helicopters": "heli",
            "Boats": "boat", "Drones": "drone", "Other": "gen"}
PRB_CODE = {"Setup & Getting Started": "setup", "Something Is Broken": "broken",
            "Performance & Tuning": "perf", "Parts & Compatibility": "parts",
            "Returns & Warranty": "warranty", "Something Else": "else"}

# Each entry is a problem/solution PAIR used to emit BOTH an article and cases.
#   (category, problem, title, symptom, resolution_steps[])
# `symptom` becomes the case description + article intro; steps become the
# article resolution. Written to be findable: real keywords in title + body.
PAIRS = [
    # ── Cars & Trucks ────────────────────────────────────────────────────────
    ("Cars & Trucks", "Setup & Getting Started", "Binding an RC car transmitter and receiver",
     "My new RC car transmitter will not bind to the receiver. The bind light keeps flashing and never goes solid.",
     ["Power the receiver and enter bind mode using the bind plug or button.",
      "Hold the transmitter bind button while switching it on.",
      "Wait for the receiver LED to go solid, remove the bind plug, and power cycle both units.",
      "If it still fails, confirm the transmitter and receiver use the same protocol and the batteries are charged."]),
    ("Cars & Trucks", "Setup & Getting Started", "Calibrating the ESC throttle on an RC car",
     "The ESC on my RC car keeps beeping and never arms. I think the throttle needs calibrating to the radio.",
     ["Turn the transmitter on first and set throttle trims to neutral.",
      "Enter the ESC calibration mode per its manual (usually hold the set button while powering on).",
      "Register full throttle, full brake, and neutral when prompted.",
      "Power cycle and confirm the ESC arms with its normal tones."]),
    ("Cars & Trucks", "Something Is Broken", "Grinding noise and a stripped spur gear on an RC car",
     "There is a loud grinding noise from the gearbox and the car lurches. I suspect a stripped spur gear.",
     ["Inspect the spur and pinion for rounded or missing teeth.",
      "Replace the stripped gear.",
      "Reset the gear mesh using the paper method so there is slight backlash.",
      "Tighten the motor screws so the mesh stays correct."]),
    ("Cars & Trucks", "Something Is Broken", "Steering dead after a crash on an RC car",
     "After hitting a curb the steering is dead and I hear grinding. I think the servo gears are stripped.",
     ["Grinding with no movement usually means stripped servo gears.",
      "Replace the servo gear set, or the whole servo.",
      "Fit a quality servo saver to absorb future impacts.",
      "Re-center the steering and check endpoints after the repair."]),
    ("Cars & Trucks", "Performance & Tuning", "Reducing on-power oversteer on an RC car",
     "My buggy snaps loose and the rear steps out when I get on the throttle. How do I reduce on-power oversteer?",
     ["Use a thicker rear differential oil to smooth power delivery.",
      "Soften the rear springs or stiffen the front.",
      "Add rear toe-in for stability.",
      "Apply throttle more smoothly out of corners."]),
    ("Cars & Trucks", "Performance & Tuning", "RC car motor runs too hot",
     "The motor on my truck gets very hot after a few minutes and the car slows down. How do I keep temperatures down?",
     ["Reduce the pinion gear by a tooth or two to lower the load.",
      "Improve airflow or add a cooling fan to the motor and ESC.",
      "Confirm the drivetrain spins freely with no binding.",
      "Avoid prolonged full-throttle runs in high-traction conditions."]),
    ("Cars & Trucks", "Parts & Compatibility", "Choosing tires for your RC car surface",
     "I am not sure which tires to run on loose dirt versus pavement for my RC car.",
     ["Soft compounds grip smooth or cold surfaces.",
      "Pin or spike treads suit loose, dusty dirt.",
      "Slicks and ribbed treads suit hard-packed or paved surfaces.",
      "Match foam inserts to the tire and surface for support."]),
    ("Cars & Trucks", "Returns & Warranty", "Warranty claim for a part that failed on an RC car",
     "A gear snapped on the second run and I believe it is a defect. How do I start a warranty claim?",
     ["Have your order number and a description of the failure ready.",
      "Take clear photos of the failed part.",
      "Note how many runs the part had and the conditions.",
      "Submit the claim; normal wear and crash damage are typically not covered."]),
    ("Cars & Trucks", "Something Else", "Recommended spare parts for an RC car",
     "What spare parts should I keep on hand for my 1/10 buggy so I am not stuck at the track?",
     ["Keep spare spur gears, hinge pins, and driveshafts.",
      "Stock a spare steering servo and a set of tires.",
      "Carry common hardware, wheel nuts, and thread lock.",
      "Keep shock oil and spare o-rings for quick rebuilds."]),

    # ── Airplanes ─────────────────────────────────────────────────────────────
    ("Airplanes", "Setup & Getting Started", "Setting control surface throws on an RC plane",
     "This is my first RC plane. How do I set the aileron, elevator, and rudder throws and expo for a safe first flight?",
     ["Set each surface to the manual's recommended low-rate throw.",
      "Add expo to soften the response near center.",
      "Confirm every surface moves in the correct direction.",
      "Double-check the center of gravity before flying."]),
    ("Airplanes", "Something Is Broken", "Repairing a cracked foam wing on an RC plane",
     "The foam wing on my plane cracked near the root after a hard landing. What is the best repair?",
     ["Use foam-safe CA or epoxy for the bond.",
      "Add a carbon or bamboo spar across the break for strength.",
      "Clamp or tape until fully cured.",
      "Re-balance the plane after the repair."]),
    ("Airplanes", "Performance & Tuning", "RC plane will not hold altitude",
     "My trainer plane keeps losing height even at full throttle. The control surfaces look fine.",
     ["Check the center of gravity is not tail-heavy.",
      "Confirm control surfaces are centered and not drooping.",
      "Verify the motor and prop produce the expected thrust.",
      "Inspect for a warped wing or added weight."]),
    ("Airplanes", "Parts & Compatibility", "Choosing a replacement propeller for an RC plane",
     "I need a new propeller for my plane but I am not sure which size fits my motor.",
     ["Match the propeller diameter and pitch to the motor and ESC rating.",
      "Balance the prop to reduce vibration.",
      "Confirm the rotation direction matches the motor.",
      "Use a locking collet or nut so it stays tight."]),
    ("Airplanes", "Returns & Warranty", "Warranty on an RC plane motor that failed early",
     "The motor on my plane failed after a few flights. Can I claim warranty?",
     ["Provide your order number and the flight count.",
      "Describe the failure and include photos.",
      "Note the conditions of the flights.",
      "Crash damage is typically not covered."]),
    ("Airplanes", "Something Else", "Pre-flight safety checklist for an RC plane",
     "What should I check before every flight with my RC plane?",
     ["Range-check the radio before takeoff.",
      "Confirm the battery is charged and secured.",
      "Check all control surfaces and linkages are tight.",
      "Verify failsafe stops the motor on signal loss."]),

    # ── Helicopters ────────────────────────────────────────────────────────────
    ("Helicopters", "Setup & Getting Started", "Leveling the swashplate on an RC helicopter",
     "I am new to helis and need to level the swashplate and set collective pitch. How do I start?",
     ["Center all trims and sub-trims first.",
      "Adjust the linkages so the swashplate sits level.",
      "Set the collective pitch range per the manual.",
      "Verify cyclic movements are even in all directions."]),
    ("Helicopters", "Something Is Broken", "Main gear stripped after a crash on an RC helicopter",
     "After a tip-over the main gear is stripped and the heli will not spool up.",
     ["Replace the stripped main gear.",
      "Check the pinion mesh after fitting the new gear.",
      "Inspect the one-way bearing for damage.",
      "Spin the head by hand to confirm smooth engagement."]),
    ("Helicopters", "Performance & Tuning", "RC helicopter vibrates badly in hover",
     "My heli shakes a lot in hover and the tail wags. I think the blades need tracking.",
     ["Track the main blades using colored tape to see which is high.",
      "Adjust linkage length to bring the blades into track.",
      "Balance the blades before flight.",
      "Check for a bent shaft or loose blade grips."]),
    ("Helicopters", "Parts & Compatibility", "Choosing replacement main blades for an RC helicopter",
     "I need new main blades for my heli but I am not sure what fits.",
     ["Match the blade length to your helicopter class.",
      "Replace both blades as a matched set.",
      "Balance the new blades before flying.",
      "Confirm the root bolt size matches the grips."]),
    ("Helicopters", "Returns & Warranty", "Warranty claim for a defective RC helicopter part",
     "A part on my heli failed and I think it is defective. How do I claim warranty?",
     ["Provide your order number and photos of the part.",
      "Describe when and how the failure happened.",
      "Normal wear from flights is not covered.",
      "Submit the claim with the run count."]),
    ("Helicopters", "Something Else", "Recommended tools and spares for RC helicopters",
     "What tools and spares should I keep for my RC helicopter?",
     ["Keep spare main blades and a main gear.",
      "Carry metric hex drivers and a blade balancer.",
      "Stock spare linkage balls and a tail belt if applicable.",
      "Keep thread lock for rotor hardware."]),

    # ── Boats ──────────────────────────────────────────────────────────────────
    ("Boats", "Setup & Getting Started", "Waterproofing an RC boat before launch",
     "I want to make sure my RC boat does not leak before the first run. What should I seal?",
     ["Reseal the hatch with a fresh gasket.",
      "Silicone the stuffing tube and all wire exits.",
      "Bag or coat the receiver and ESC.",
      "Float-test on calm water before a full run."]),
    ("Boats", "Something Is Broken", "RC boat is taking on water",
     "Water is getting inside the hull of my RC boat and soaking the electronics.",
     ["Find the leak with a short dry-run on the water.",
      "Reseal the hatch gasket and the tube exits.",
      "Dry the electronics fully and protect them.",
      "Add a bilge sponge for peace of mind."]),
    ("Boats", "Performance & Tuning", "RC boat will not get up on plane",
     "My boat plows through the water and will not plane. What should I change?",
     ["Check the propeller size and condition.",
      "Adjust the strut and trim angle.",
      "Reduce unnecessary weight in the hull.",
      "Confirm the motor reaches full RPM."]),
    ("Boats", "Parts & Compatibility", "Choosing a replacement prop for an RC boat",
     "I need a new prop for my RC boat. How do I pick the right one?",
     ["Match the propeller to the hull size and motor.",
      "Balance the prop to reduce vibration.",
      "Confirm the rotation direction.",
      "Start with the stock size before experimenting."]),
    ("Boats", "Returns & Warranty", "Warranty for a water-damaged RC boat ESC",
     "The ESC in my boat got water-damaged. Is this covered by warranty?",
     ["Provide your order number and photos.",
      "Describe the conditions of the run.",
      "Water intrusion from an unsealed hull is typically not covered.",
      "Submit the claim for review."]),
    ("Boats", "Something Else", "Post-run care for an RC boat",
     "How should I care for my RC boat after running in dirty or salt water?",
     ["Rinse the boat with fresh water and dry it.",
      "Re-grease the drive and seals.",
      "Check the electronics bay for moisture.",
      "Store with the hatch off so it dries fully."]),

    # ── Drones ──────────────────────────────────────────────────────────────────
    ("Drones", "Setup & Getting Started", "Binding FPV goggles to a drone VTX",
     "I cannot get video in my FPV goggles. How do I set the channel and bind the VTX?",
     ["Set the goggles and VTX to the same band and channel.",
      "Confirm the VTX has an antenna attached before powering on.",
      "Start on low transmit power indoors.",
      "Scan channels in the goggles if the picture is missing."]),
    ("Drones", "Something Is Broken", "One drone motor does not spin on arming",
     "When I arm my quad, one motor stays silent. The others spin fine.",
     ["Check the motor, its ESC, and the solder joints.",
      "Swap the motor to a known-good output to isolate the fault.",
      "Inspect the flight controller motor output.",
      "Re-flash or re-map motors if a signal is missing."]),
    ("Drones", "Performance & Tuning", "Drone drifts and will not hold position",
     "My quad drifts in GPS hold and sometimes circles. Do I need to recalibrate?",
     ["Recalibrate the compass away from metal.",
      "Check the GPS lock quality before flying.",
      "Level-calibrate the accelerometer on a flat surface.",
      "Update firmware if drift persists."]),
    ("Drones", "Parts & Compatibility", "Choosing replacement motors and props for a drone",
     "I need new motors and props for my quad. How do I pick compatible ones?",
     ["Match the motor size and KV to your frame.",
      "Pair the prop size to the motor.",
      "Confirm prop rotation for each arm.",
      "Keep the all-up weight within the frame's range."]),
    ("Drones", "Returns & Warranty", "Warranty claim for a dead drone motor",
     "A motor on my drone died. Can I claim warranty?",
     ["Provide your order number and photos.",
      "Describe the flight that caused it.",
      "Crash damage is typically not covered.",
      "Include the flight log if you have one."]),
    ("Drones", "Something Else", "Pre-flight checklist for a drone",
     "What should I check before each drone flight?",
     ["Check props, battery, and failsafe.",
      "Confirm a solid GPS lock if using position hold.",
      "Fly in open space away from people.",
      "Verify the return-to-home point is set."]),

    # ── Other (batteries, chargers, parts) ───────────────────────────────────────
    ("Other", "Setup & Getting Started", "Choosing charger settings for a new LiPo pack",
     "I just bought a new LiPo and need the right charger settings so I do not damage it.",
     ["Set the chemistry to LiPo and the cell count to match the pack.",
      "Charge at 1C unless the pack is rated for more.",
      "Always balance charge.",
      "Charge in a fireproof bag or container."]),
    ("Other", "Something Is Broken", "LiPo battery will not charge",
     "My LiPo pack stopped charging. The charger shows a connection error and one cell reads very low.",
     ["Inspect and reseat the balance lead.",
      "Measure per-cell voltage; a 0.0V cell is damaged.",
      "Never charge a hot or puffed pack.",
      "Retire and recycle a damaged pack safely."]),
    ("Other", "Performance & Tuning", "Battery runtime dropped and the pack runs hot",
     "My fully charged pack only lasts a few minutes and gets hot. It used to last much longer.",
     ["Check the cell internal resistance for aging.",
      "Avoid over-gearing that forces high current.",
      "Confirm the motor and ESC are not dragging.",
      "Replace a pack that is past its service life."]),
    ("Other", "Parts & Compatibility", "Matching battery connectors to the ESC",
     "My new pack has a different connector than my ESC. What are my options?",
     ["Identify both connector types (XT60, XT90, EC5, Deans).",
      "Use an adapter or solder a matching connector.",
      "Keep polarity correct when soldering.",
      "Use heat shrink to insulate the joint."]),
    ("Other", "Returns & Warranty", "Warranty on a charger or accessory",
     "My charger stopped working. How do I handle a warranty claim?",
     ["Provide your order number and photos.",
      "Describe the fault and when it started.",
      "Keep the original packaging if possible.",
      "Submit the claim for review."]),
    ("Other", "Something Else", "Best way to store LiPo packs",
     "How should I store my LiPo packs between sessions so they stay healthy?",
     ["Store at about 3.8V per cell (storage voltage).",
      "Keep them cool, dry, and in a fireproof container.",
      "Avoid leaving packs fully charged for long periods.",
      "Check voltage periodically during storage."]),
]

# Case phrasings per pair — a few realistic variants so the CC model sees volume
# without needing a separate topic each time.
CASE_VARIANTS = [
    "{symptom}",
    "{symptom} I have tried the basics but no luck. Any advice?",
    "{symptom} This started recently and I am not sure what changed.",
]

PRIORITY_BY_PROBLEM = {
    "Setup & Getting Started": "Low", "Something Is Broken": "High",
    "Performance & Tuning": "Medium", "Parts & Compatibility": "Low",
    "Returns & Warranty": "Medium", "Something Else": "Low",
}


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


def description_html(cat, prob, symptom):
    """Rich-text value for Knowledge Description__c — the issue, with context."""
    return (
        f"<p>{html.escape(symptom)}</p>"
        f"<p>This is a common <b>{html.escape(prob)}</b> issue for "
        f"<b>{html.escape(cat)}</b>. Work through the resolution steps in order; "
        f"the most likely cause is usually the first one.</p>"
    )


def solution_html(steps):
    """Rich-text value for Knowledge Solution__c — the numbered fix."""
    return (
        "<p>Follow these steps:</p><ol>"
        + "".join(f"<li>{html.escape(s)}</li>" for s in steps)
        + "</ol>"
        + "<p>If the problem persists after these steps, create a support case "
        "and include what you have already tried.</p>"
    )


def article_body(cat, prob, title, symptom, steps):
    """Combined body kept for strong full-text search relevance."""
    body = (
        f"<h2>{html.escape(title)}</h2>"
        f"<p><b>Problem.</b> {html.escape(symptom)}</p>"
        f"<p><b>Applies to.</b> {html.escape(cat)} — {html.escape(prob)}.</p>"
        f"<p><b>Resolution.</b></p><ol>"
        + "".join(f"<li>{html.escape(s)}</li>" for s in steps)
        + "</ol>"
    )
    return body


def write_batches(path_prefix, header_lines, rows_apex, footer_debug, max_chars=26000):
    """Split a list of pre-rendered Apex row strings into batch files."""
    batches, cur, cur_len = [], [], 0
    base_len = sum(len(h) + 1 for h in header_lines) + 400
    for r in rows_apex:
        if cur and base_len + cur_len + len(r) > max_chars:
            batches.append(cur)
            cur, cur_len = [], 0
        cur.append(r)
        cur_len += len(r) + 1
    if cur:
        batches.append(cur)
    files = []
    for i, batch in enumerate(batches, 1):
        lines = list(header_lines)
        lines.append("List<List<String>> rows = new List<List<String>>{")
        for j, r in enumerate(batch):
            lines.append("  " + r + ("," if j < len(batch) - 1 else ""))
        lines.append("};")
        lines.extend(footer_debug(i, len(batches)))
        fn = f"{path_prefix}-{i:02d}.apex"
        with open(fn, "w") as f:
            f.write("\n".join(lines) + "\n")
        files.append(fn)
    return files


def main():
    out_dir = "salesforce/support-corpus"
    os.makedirs(out_dir, exist_ok=True)
    for old in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, old))

    # Build articles from the pairs. Each pair yields a main article plus a few
    # audience/skill variants (distinct title + framing) so the corpus reaches
    # ~120 findable articles while every one stays genuinely useful. 42 pairs x
    # ~3 variants keeps us near the target and well within storage.
    LEVELS = [
        ("", ""),
        ("beginner", "Beginner guide: "),
        ("quick-fix", "Quick fix: "),
    ]
    art_rows = []
    art_count = 0
    for (cat, prob, title, symptom, steps) in PAIRS:
        # 3 variants for the common problem types, 2 for the rest.
        n = 3 if prob in ("Setup & Getting Started", "Something Is Broken", "Performance & Tuning") else 2
        for vi in range(n):
            tag, prefix = LEVELS[vi % len(LEVELS)]
            slug = f"rck-{CAT_CODE[cat]}-{PRB_CODE[prob]}-{art_count}"
            t = f"RC: {prefix}{title}" if prefix else f"RC: {title}"
            summary = f"{cat} / {prob}: {symptom[:120]}"
            body = article_body(cat, prob, title, symptom, steps)
            desc = description_html(cat, prob, symptom)
            sol = solution_html(steps)
            art_rows.append(
                "new List<String>{"
                f"'{esc(slug)}','{esc(t)}','{esc(summary)}','{esc(body)}',"
                f"'{esc(cat)}','{esc(prob)}','{esc(desc)}','{esc(sol)}'"
                "}"
            )
            art_count += 1

    art_header = [
        "/* articles-NN.apex (GENERATED) — tagged RC Knowledge articles.",
        " * Run each batch: sf apex run --target-org VSCodePlayground --file <file> */",
        "// row: [slug, title, summary, bodyHtml, vehicleCategory, problemType, descriptionHtml, solutionHtml]",
    ]

    def art_footer(i, total):
        return [
            "Integer created = 0, published = 0;",
            "List<String> pubIds = new List<String>();",
            "for (List<String> a : rows) {",
            "  Knowledge__kav kav = new Knowledge__kav(Title=a[1], UrlName=a[0], Summary=a[2],",
            "    Article_Body__c=a[3], Vehicle_Category__c=a[4], Problem_Type__c=a[5],",
            "    Description__c=a[6], Solution__c=a[7], Language='en_US');",
            "  insert kav; created++;",
            "  Knowledge__kav d = [SELECT KnowledgeArticleId FROM Knowledge__kav WHERE Id=:kav.Id LIMIT 1];",
            "  pubIds.add(d.KnowledgeArticleId);",
            "}",
            "for (String id : pubIds) { try { KbManagement.PublishingService.publishArticle(id, true); published++; } catch(Exception e){ System.debug('pub fail '+e.getMessage()); } }",
            f"System.debug('ARTICLES batch {i}/{total}: created '+created+' published '+published);",
        ]

    art_files = write_batches(f"{out_dir}/articles", art_header, art_rows, art_footer)

    # Build cases mirroring the pairs.
    case_rows = []
    for (cat, prob, title, symptom, steps) in PAIRS:
        for v in CASE_VARIANTS:
            desc = v.format(symptom=symptom)
            subj = "RC: " + title
            prio = PRIORITY_BY_PROBLEM[prob]
            case_rows.append(
                "new List<String>{"
                f"'{esc(subj)}','{esc(desc)}','{esc(cat)}','{esc(prob)}','{esc(prio)}'"
                "}"
            )

    case_header = [
        "/* cases-NN.apex (GENERATED) — RC support Cases mirroring the articles.",
        " * Run each batch: sf apex run --target-org VSCodePlayground --file <file> */",
        "// row: [subject, description, vehicleCategory, problemType, priority]",
    ]

    def case_footer(i, total):
        return [
            "List<Case> cs = new List<Case>();",
            "for (List<String> r : rows) {",
            "  cs.add(new Case(Subject=r[0], Description=r[1], Vehicle_Category__c=r[2],",
            "    Problem_Type__c=r[3], Priority=r[4], Origin='Web', Status='Closed'));",
            "}",
            "insert cs;",
            f"System.debug('CASES batch {i}/{total}: inserted '+cs.size());",
        ]

    case_files = write_batches(f"{out_dir}/cases", case_header, case_rows, case_footer)

    # Verify helper.
    with open(f"{out_dir}/VERIFY.apex", "w") as f:
        f.write(
            "System.debug('Articles online: ' + [SELECT COUNT() FROM Knowledge__kav WHERE UrlName LIKE 'rck-%' AND PublishStatus='Online']);\n"
            "System.debug('RC cases: ' + [SELECT COUNT() FROM Case WHERE Subject LIKE 'RC:%']);\n"
        )

    print(f"Articles: {len(art_rows)} in {len(art_files)} batch file(s)")
    print(f"Cases:    {len(case_rows)} in {len(case_files)} batch file(s)")
    print(f"Est. storage: ~{(len(art_rows)*2 + len(case_rows))*2/1024:.2f} MB (rough, 2KB/record, articles ~2 versions)")
    from collections import Counter
    print("Articles by category:", dict(Counter(r.split("','")[-2] for r in art_rows)))
    print("Cases by category:   ", dict(Counter(r.split("','")[-3] for r in case_rows)))


if __name__ == "__main__":
    main()
