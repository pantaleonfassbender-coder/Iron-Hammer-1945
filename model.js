/* Iron Hammer, 1945 — the campaign model.
   Takes the decisions of the playable study and the figures in data/model.json and runs the
   attack: what reaches which plant, what is hit, how long the damage lasts, what it costs.
   Every probability is either the file's own or an assumption named in model.json. */
"use strict";

const IH = (function () {
  let D = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dist(a, b) {
    const r = x => x * Math.PI / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  const COURLAND = { lat: 56.51, lon: 21.01 };

  // Day of 1945 at the middle of a fortnight (16 Jan = day 16).
  const fortnightDay = fn => 16 + 15.25 * fn + 7;
  const DAY_WAR_ENDS = 128;   // 8 May 1945
  const DAY_AUG1 = 213;
  const dateOf = day => {
    const m = [["January", 31], ["February", 28], ["March", 31], ["April", 30], ["May", 31], ["June", 30], ["July", 31], ["August", 31], ["September", 30], ["October", 31]];
    let d = Math.round(day);
    for (const [name, len] of m) { if (d <= len) return `${d} ${name}`; d -= len; }
    return "late 1945";
  };

  function targetsFor(choice) {
    if (choice === "tula") return D.targets.filter(t => t.group === "tula");
    if (choice === "yt") return D.targets.filter(t => t.group !== "gorki");
    return D.targets.slice();
  }

  function strikeFortnight(c) {
    if (c.decision === "postpone" || !c.decision) return null;
    let fn = { now: 2, later: 3, last: 4, file: 1, greatonly: 2 }[c.decision];
    if (c.method === "forecast") fn += 1;
    return fn;
  }

  function available(fn, c) {
    if (c.decision === "file") return 100;
    const dl = D.deliveries;
    return Math.min(dl.cap, dl.atFeb7 + dl.perFortnight * Math.max(0, fn - 1));
  }

  // Resolve the base actually usable at the strike fortnight.
  function baseAt(c, fn, longReady) {
    const order = ["koenigsberg", "danzig", "oder", "berlin"];
    let id = c.decision === "file" ? "koenigsberg" : (c.base || "danzig");
    if (id === "berlin" && !longReady) id = "oder";
    let i = order.indexOf(id);
    const moved = [];
    while (i < order.length) {
      const b = D.bases.find(x => x.id === order[i]);
      if (fn <= b.lastFortnight || c.decision === "file") return { base: b, moved };
      moved.push(b);
      i++;
    }
    return { base: null, moved };
  }

  function run(c, seed, forceReadings) {
    const A = D.assumptions;
    const R = mulberry32(seed >>> 0);
    const rnd = () => R();
    const readings = forceReadings || {
      longRange: rnd() < A.longRangeBaumbach ? "baumbach" : "file",
      fuelTransfer: rnd() < 0.5 ? "baumbach" : "notransfer",
    };
    const out = { choices: c, readings, log: [], struck: false, fn: null };
    const L = (msg, cite) => out.log.push({ msg, cite: cite || null });
    out.fuelT = c.fuel === "full" ? 1400 : c.fuel === "half" ? 700 : 0;
    out.longOrdered = c.mistel === "long";

    const fn = strikeFortnight(c);
    if (fn === null) { L("Operation Eisenhammer is postponed. The combinations are finished and kept for other tasks."); return finish(out); }
    if (c.decision === "greatonly") return great(c, out, rnd, readings, fn, L);
    if (c.fuel === "none") { L("Without the 1,400 tons of fuel there is no training and no operation: the attack does not take place."); return finish(out); }
    if (fn > 6) { L("By the time the forecast is good, the war in the East has reached Berlin."); return finish(out); }
    out.fn = fn;
    out.day = c.decision === "file" ? 32 : fortnightDay(fn);   // the file's planned date: 1 February

    const longReady = out.longOrdered && (c.decision === "file" ? false : readings.longRange === "baumbach" && fn >= 4);
    const range = longReady ? 2500 : 1500;
    const { base, moved } = baseAt(c, fn, longReady);
    for (const b of moved) L(`${b.name} is no longer usable in ${D.fortnights[fn]}.`);
    if (!base) { L("No jump-off airfield is left within reach of any target."); return finish(out); }
    out.base = base;
    out.range = range;
    if (out.longOrdered && !longReady) L(readings.longRange === "file" && fn >= 4 ? "The long-range Mistel are not ready: the file's estimate holds, not before May." : "The long-range Mistel are not yet ready; the attack flies with the 1,500 km combinations.");
    if (longReady) L("The long-range Mistel are ready, as Baumbach later wrote, and can fly from the Berlin area.");

    const wanted = targetsFor(c.targets || "all");
    const reach = wanted.map(t => ({ t, d: dist(base, t) })).filter(x => x.d <= range);
    const lost = wanted.filter(t => !reach.find(x => x.t === t));
    if (lost.length) L(`From ${base.name}, ${lost.length} of the ${wanted.length} planned plants are out of range (${range.toLocaleString("en")} km).`);
    if (!reach.length) { L("No planned target is within range. The attack is called off."); return finish(out); }

    const avail = available(fn, c);
    const launched = Math.round(avail * A.serviceable);
    out.available = avail; out.launched = launched; out.struck = true;
    L(`${c.decision === "file" ? "1 February (the file's date)" : D.fortnights[fn]}: ${launched} of ${avail} combinations take off from ${base.name} against ${reach.length} of the planned plants.`);

    // allocate by capacity, at least one each while combinations last
    const totalMw = reach.reduce((s, x) => s + x.t.mw, 0);
    let left = launched;
    const alloc = reach.map(x => { const k = Math.max(1, Math.round(launched * x.t.mw / totalMw)); return { ...x, k }; });
    let s = alloc.reduce((a, x) => a + x.k, 0);
    while (s > launched) { const m = alloc.reduce((a, x) => x.k > a.k ? x : a); m.k--; s--; }
    left = launched - s; if (left > 0) alloc[0].k += left;

    const fog = {};
    const night = c.method === "night";
    const hitP = A.hitFile * (night ? A.hitNightFactor : 1) * (c.fuel === "half" ? A.hitLowTraining : 1);
    out.pilotsLost = 0; out.hits = 0; out.arrived = 0; out.found = 0; out.enroute = 0; out.fogged = 0;
    out.damage = [];
    for (const a of alloc) {
      const g = a.t.group;
      if (!night && !(g in fog)) fog[g] = rnd() < (c.method === "forecast" ? A.fogForecast : A.fogDawn);
      let destroyed = 0, hits = 0;
      for (let i = 0; i < a.k; i++) {
        let pilotOut = true;
        if (rnd() < A.enrouteLoss) { out.enroute++; if (rnd() < 0.6) out.pilotsLost++; continue; }
        out.arrived++;
        if (!night && fog[g]) { out.fogged++; }
        else {
          const pFind = a.d > 1500 ? A.findLong : night ? A.findNight : A.findDawn;
          if (rnd() < pFind) { out.found++; if (rnd() < hitP) { hits++; if (destroyed < a.t.units) destroyed++; } }
        }
        const back = Math.max(0, dist(a.t, COURLAND));
        let pRet = readings.fuelTransfer === "baumbach" ? A.returnBaumbach : A.returnNoTransfer;
        if (back > 1200) pRet *= A.returnLongLeg;
        if (pilotOut && rnd() >= pRet) out.pilotsLost++;
      }
      out.hits += hits;
      const unitMw = a.t.mw / a.t.units;
      const repairs = [];
      for (let u = 0; u < destroyed; u++) {
        const [lo, hi] = a.t.type === "hydro" ? A.repairHydro : A.repairSteam;
        repairs.push(lo + rnd() * (hi - lo));
      }
      out.damage.push({ id: a.t.id, name: a.t.name, group: g, sent: a.k, hits, destroyed, mw: Math.round(destroyed * unitMw), unitMw, repairs, fog: !night && fog[g] });
    }
    if (c.great) great(c, out, rnd, readings, fn, L, true);
    for (const g of Object.keys(fog)) if (fog[g]) L(`Ground fog over the ${D.groups[g].name} at dawn: the pilots cannot see their targets.`, { label: "Koller 3c", href: "#/file/a2" });
    out.illLost = 0;
    for (let i = 0; i < A.illuminators; i++) if (rnd() < A.illuminatorLoss) out.illLost++;
    return finish(out);
  }

  // Extreme what-if: a few He 177 / Fw 190 "Great Mistel" combinations from the Berlin area.
  function great(c, out, rnd, readings, fn, L, joined) {
    const G = D.great;
    out.great = { count: 0, hits: 0, mw: 0 };
    if (fn < G.fromFortnight) { L("The Great Mistel are not ready before mid-February."); return joined ? null : finish(out); }
    const berlin = D.bases.find(b => b.id === "berlin");
    if (fn > berlin.lastFortnight) { L("The Berlin airfields are no longer usable for the Great Mistel."); return joined ? null : finish(out); }
    const n = G.countMin + Math.floor(rnd() * (G.countMax - G.countMin + 1));
    out.great.count = n;
    out.struck = true; out.fn = fn; out.day = out.day || fortnightDay(fn);
    if (!out.damage) { out.damage = []; out.pilotsLost = 0; out.hits = 0; out.enroute = 0; out.fogged = 0; out.illLost = 0; }
    const wanted = targetsFor(c.targets || "all").filter(t => dist(berlin, t) <= G.range).sort((a, b) => b.mw - a.mw);
    L(`Extreme what-if: ${n} He 177 / Fw 190 combinations take off from the Berlin area against the largest plants.`);
    for (let i = 0; i < n && wanted.length; i++) {
      const t = wanted[i % wanted.length];
      let d = out.damage.find(x => x.id === t.id);
      if (!d) { d = { id: t.id, name: t.name, group: t.group, sent: 0, hits: 0, destroyed: 0, mw: 0, unitMw: t.mw / t.units, repairs: [], fog: false }; out.damage.push(d); }
      d.sent++;
      out.pilotsLost++;   // a 1,600–2,000 km run: the fighter cannot get home
      if (rnd() < G.abort) { out.enroute++; L(`A Great Mistel bound for ${t.name} is lost on the way.`); continue; }
      if (rnd() >= G.find || rnd() >= G.hitP) { L(`The Great Mistel bound for ${t.name} misses or does not find it.`); continue; }
      const k = Math.min(G.unitsPerHit, t.units - d.destroyed);
      d.hits++; out.hits++; out.great.hits++;
      for (let u = 0; u < k; u++) {
        d.destroyed++;
        const [lo, hi] = t.type === "hydro" ? D.assumptions.repairHydro : D.assumptions.repairSteam;
        d.repairs.push(lo + rnd() * (hi - lo));
      }
      d.mw = Math.round(d.destroyed * d.unitMw);
      L(`A Great Mistel hits ${t.name}: ${k} generating set${k > 1 ? "s" : ""} destroyed.`);
    }
    return joined ? null : finish(out);
  }

  function finish(out) {
    const dmg = out.damage || [];
    out.mwHit = dmg.reduce((s, d) => s + d.mw, 0);
    const mwAt = day => out.struck ? Math.round(dmg.reduce((s, d) => s + d.repairs.filter(m => out.day + m * 30.4 > day).length * d.unitMw, 0)) : 0;
    out.mwWarEnd = mwAt(DAY_WAR_ENDS);
    out.mwAug = mwAt(DAY_AUG1);
    out.frontDay = out.struck && out.mwHit > 0 ? out.day + D.assumptions.frontDelayMonths * 30.4 : null;
    out.frontBeforeEnd = out.frontDay !== null && out.frontDay < DAY_WAR_ENDS;
    out.wanted = targetsFor((out.choices && out.choices.targets) || "all");
    out.fileExpect = Math.round(out.wanted.reduce((s, t) => s + t.mw, 0) * D.assumptions.hitFile);
    if (out.struck) {
      const L = msg => out.log.push({ msg, cite: null });
      L(`${out.hits} hits; ${out.mwHit} MW of generating capacity destroyed. ${out.enroute} combinations lost on the way, ${out.fogged} defeated by fog.`);
      L(`The earliest effect at the front, three months on (Baumbach), would fall about ${dateOf(out.frontDay || out.day + 91)}. The war in Europe ends on 8 May.`);
    }
    return out;
  }

  function monteCarlo(c, n, seed0) {
    const res = [];
    for (let i = 0; i < n; i++) res.push(run(c, (seed0 || 7000) + i * 7919));
    const q = (arr, f) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(f * (s.length - 1))]; };
    const pick = k => res.map(r => r[k] || 0);
    return {
      n, struck: res.filter(r => r.struck).length / n,
      hit: { p10: q(pick("mwHit"), 0.1), med: q(pick("mwHit"), 0.5), p90: q(pick("mwHit"), 0.9) },
      warEnd: { p10: q(pick("mwWarEnd"), 0.1), med: q(pick("mwWarEnd"), 0.5), p90: q(pick("mwWarEnd"), 0.9) },
      front: res.filter(r => r.frontBeforeEnd).length / n,
      pilots: q(pick("pilotsLost"), 0.5), launched: q(pick("launched"), 0.5),
      zero: res.filter(r => r.struck && r.mwHit === 0).length / n,
    };
  }

  return { setData: d => { D = d; }, run, monteCarlo, dist, dateOf, fortnightDay, targetsFor, strikeFortnight };
})();

if (typeof module !== "undefined") module.exports = IH;
