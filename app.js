/* Iron Hammer, 1945 — a hypothetical campaign study from the Luftwaffe's own file.
   Two ways through the same chapters: read the dossier, or take the staff's seat and decide. */
"use strict";

const D = {};
// Set when the itch.io page exists; the itch build sets window.IH_ITCH instead.
const ITCH_URL = "";
function supportBox() {
  if (window.IH_ITCH) return `<div class="support"><b>This study is free.</b> It took weeks of work in the archives. If you found it useful, please support it with a donation: use the <b>Support</b> / donate button on this itch.io page. Every contribution helps to open the next file.</div>`;
  if (ITCH_URL) return `<div class="support"><b>This study is free.</b> If you found it useful, you can support the work with a donation on its <a href="${ITCH_URL}" target="_blank" rel="noopener">itch.io page</a>.</div>`;
  return "";
}
const KEY = "ironhammer_state";
let S = { mode: null, great: false, choices: {}, seed: 1, reached: 1 };

const $ = s => document.querySelector(s);
const view = $("#view");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => Math.round(n).toLocaleString("en");
const pct = x => Math.round(x * 100) + " %";

function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && "choices" in s) S = s; } catch (e) { /* none */ } }

async function boot() {
  const get = f => fetch(f, { cache: "no-cache" }).then(r => r.json());
  [D.study, D.file, D.model, D.plates, D.sources, D.map] = await Promise.all(
    ["data/study.json", "data/file.json", "data/model.json", "data/plates.json", "data/sources.json", "data/map.json"].map(get));
  IH.setData(D.model);
  load();
  window.addEventListener("hashchange", route);
  route();
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [page, arg] = parts;
  document.querySelectorAll("nav a").forEach(a => {
    const t = a.getAttribute("href").replace(/^#\/?/, "").split("/")[0];
    a.classList.toggle("on", t === (page === "strike" || page === "result" ? "ch" : page));
  });
  modebar();
  window.scrollTo(0, 0);
  const pages = { "": start, ch: chapter, strike, result, file, data, plates, reflection, sources };
  (pages[page || ""] || start)(arg);
}

function modebar() {
  const m = S.mode === "play" ? `You are in the staff's seat${S.great ? " · extreme what-if: the Great Mistel" : ""}. <a href="#/">Change</a>`
    : S.mode === "read" ? `You are reading the study. <a href="#/">Take the staff's seat instead</a>` : "";
  $("#modebar").innerHTML = m;
}

/* ------------------------------------------------------------ start */
function start() {
  view.innerHTML = `
  <div class="hero">
    <div>
      <span class="tag">January – April 1945 · Luftwaffe operations staff · KG 200</span>
      <h1>The power stations of Moscow and the Upper Volga, from the file that planned to destroy them</h1>
      <p class="lede">In January 1945 the Luftwaffe's General Staff proposed to send about a hundred Mistel, pilotless Ju 88 bombers steered by a fighter on their backs, against thirteen Soviet power stations. Three weeks later its operations staff proposed to postpone the operation. Both memos survive in the captured German records of the US National Archives.</p>
      <p class="readable">This is a hypothetical campaign study built on that file. It does not ask whether the attack could have won the war; it follows the staff's own arithmetic, shows what that arithmetic left out, and sets the Soviet side beside it. You can read it as a dossier, or take the staff's seat and decide at each point where the file decides. A model then runs the attack with the file's figures and the Soviet record, and states where it has to assume.</p>
      <div class="modes">
        <div class="mode"><h3>Read the study</h3><p class="fine">Eight chapters with the file in facsimile and translation, the data and the other side. At each decision point you see what the staff proposed, and the study computes the file's own plan of 18 January at the end.</p><button class="primary" data-mode="read">Read</button></div>
        <div class="mode play"><h3>Take the staff's seat</h3><p class="fine">The same chapters, but you decide: targets, weapon, airfields, fuel, method, and on 7 February whether to attack at all. The study runs your plan and sets it against the file and the Soviet figures.</p><button class="primary" data-mode="play">Decide</button></div>
      </div>
      <label class="whatif"><input type="checkbox" id="great" ${S.great ? "checked" : ""}>
        <span><b>Extreme what-if: the Great Mistel.</b> <span class="fine">Adds a handful of He 177 bombers with a Fw 190 on top, a project of 1944 that was suspended on 28 January 1945 and abandoned in March; it never flew. In this variant two to four exist from mid-February and can reach every target from the Berlin area. Every figure for it is an assumption, and the study says so.</span></span></label>
      ${supportBox()}
      <p class="fine">The study shows the planning of an attack from the side of those who planned it. It does not adopt their view: chapter 7 and the reflection follow what the file does not count. No swastika is shown; where one appears on a photograph, it is masked.</p>
    </div>
    <figure class="facs"><img src="assets/file/b2-eighteen.jpg" alt="Facsimile: 'Bisher sind 18 Gespanne an die Truppe ausgeliefert'">
      <figcaption>7 February 1945: "So far 18 combinations have been delivered to the unit." <a href="#/file/b2">The page →</a></figcaption></figure>
  </div>`;
  view.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    const mode = b.dataset.mode;
    if (mode !== S.mode || mode === "play") { S.choices = {}; S.seed = Math.floor(Math.random() * 1e9); S.reached = 1; }
    S.mode = mode; S.great = $("#great").checked; save(); location.hash = "#/ch/1";
  });
}

/* ------------------------------------------------------------ chapters */
function progress(cur) {
  const chs = D.study.chapters;
  const items = chs.map(c => `<a href="#/ch/${c.n}" class="${cur === c.n ? "on" : c.n < S.reached ? "done" : ""}">${c.n}. ${esc(c.title)}</a>`);
  const strikeOn = S.mode === "play" && S.choices.decision && S.choices.decision !== "postpone";
  if (strikeOn) items.splice(6, 0, `<a href="#/strike" class="${cur === "strike" ? "on" : ""}">The strike</a>`);
  items.push(`<a href="#/result" class="${cur === "result" ? "on" : ""}">Accounting</a>`);
  return `<div class="progress">${items.join("")}</div>`;
}

function chapter(arg) {
  if (!S.mode) { S.mode = "read"; save(); modebar(); }
  const n = Math.max(1, Math.min(8, +arg || 1));
  const c = D.study.chapters[n - 1];
  S.reached = Math.max(S.reached || 1, n); save();
  const side = [
    ...(c.facsimiles || []).map(f => `<figure class="facs"><a href="${f.href}"><img src="${f.src}" alt="${esc(f.caption)}" loading="lazy"></a><figcaption>${esc(f.caption)} <a href="${f.href}">Transcription and translation →</a></figcaption></figure>`),
    ...(c.plates || []).map(id => plateFig(id)),
    ...(c.data || []).map(id => `<div class="panel">${PANELS[id] ? PANELS[id]() : ""}</div>`),
    n === 2 && S.great ? `<div class="panel">${PANELS.great()}</div>` : "",
  ].join("");
  view.innerHTML = `
    ${progress(n)}
    <div class="chapter">
      <div>
        <span class="tag">Chapter ${n} · ${esc(c.date)}</span>
        <h1>${esc(c.title)}</h1>
        <p class="lede">${esc(c.lede)}</p>
        <div class="readable">${c.body.map(p => `<p>${esc(p)}</p>`).join("")}</div>
        ${(c.quotes || []).map(q => `<div class="quote readable"><div class="de">${esc(q.de)}</div><div class="en">${esc(q.en)}</div><div class="fine"><a href="${q.cite.href}">${esc(q.cite.label)}</a></div></div>`).join("")}
        ${decisionBox(c)}
        <p class="fine">Sources: ${(c.sources || []).map(id => `<a href="#/sources" title="${esc(D.sources[id].cite)}">${esc(D.sources[id].short)}</a>`).join(" · ")}</p>
        <div class="navrow">${n > 1 ? `<a class="btn" href="#/ch/${n - 1}">← Chapter ${n - 1}</a>` : "<span></span>"}<span id="next"></span></div>
      </div>
      <div class="side">${side}</div>
    </div>`;
  wireDecision(c, n);
}

function decisionBox(c) {
  const d = c.decision;
  if (!d) return "";
  let opts = d.options.slice();
  if (d.key === "decision" && S.great) opts.push({ value: "greatonly", label: "Send only the Great Mistel (extreme what-if)", detail: "Postpone Eisenhammer, but fly the two to four He 177 combinations from the Berlin area in late February." });
  if (S.mode === "play") {
    const cur = S.choices[d.key];
    return `<div class="decision"><span class="tag">Your decision</span><h3>${esc(d.prompt)}</h3>
      <div class="opts">${opts.map(o => `<button class="opt ${cur === o.value ? "chosen" : ""}" data-v="${o.value}"><b>${esc(o.label)}</b><span>${esc(o.detail)}</span></button>`).join("")}</div>
      <p class="filenote">The file: ${esc(d.fileNote)}</p></div>`;
  }
  return `<div class="decision"><span class="tag">Decision point</span><h3>${esc(d.prompt)}</h3>
    <div class="opts">${opts.map(o => `<div class="opt ${d.file === o.value ? "chosen" : ""}"><b>${esc(o.label)}${d.file === o.value ? " · the file's answer" : ""}</b><span>${esc(o.detail)}</span></div>`).join("")}</div>
    <p class="filenote">${esc(d.fileNote)}</p></div>`;
}

function wireDecision(c, n) {
  const next = $("#next");
  const nextTarget = () => {
    if (n === 6 && S.mode === "play" && S.choices.decision && S.choices.decision !== "postpone") return ["#/strike", "The strike →"];
    if (n === 8) return ["#/result", "The accounting →"];
    return [`#/ch/${n + 1}`, `Chapter ${n + 1} →`];
  };
  const draw = () => {
    const need = S.mode === "play" && c.decision && !S.choices[c.decision.key];
    const [href, label] = nextTarget();
    next.innerHTML = need ? `<span class="fine">Decide to continue.</span>` : `<a class="btn primary" href="${href}">${label}</a>`;
  };
  view.querySelectorAll(".opt[data-v]").forEach(b => b.onclick = () => {
    S.choices[c.decision.key] = b.dataset.v;
    if (c.decision.key === "decision") S.choices.great = S.great;
    save();
    view.querySelectorAll(".opt[data-v]").forEach(x => x.classList.toggle("chosen", x === b));
    draw();
  });
  draw();
}

/* ------------------------------------------------------------ the strike (play) */
function playChoices() { return { ...S.choices, great: S.great }; }

function strike() {
  if (S.mode !== "play" || !S.choices.decision) { location.hash = "#/ch/6"; return; }
  const r = IH.run(playChoices(), S.seed);
  view.innerHTML = `
    ${progress("strike")}
    <span class="tag">${r.fn !== null && r.fn !== undefined ? esc(D.model.fortnights[r.fn]) : "February 1945"} · in this study only</span>
    <h1>The strike</h1>
    <p class="lede readable">What follows did not happen. It is the model's run of your plan, with the file's figures where it gives them and named assumptions where it does not.</p>
    <div class="log readable">${r.log.map(l => `<p>${esc(l.msg)}${l.cite ? ` <a href="${l.cite.href}">${esc(l.cite.label)}</a>` : ""}</p>`).join("")}</div>
    ${r.struck && r.damage && r.damage.length ? `<h2>Plant by plant</h2>
    <table><tr><th>Plant</th><th class="num">Sent</th><th class="num">Hits</th><th class="num">Sets destroyed</th><th class="num">MW</th><th>Back in service (model)</th></tr>
    ${r.damage.map(d => `<tr><td>${esc(d.name)}${d.fog ? ' <span class="flag">fog</span>' : ""}</td><td class="num">${d.sent}</td><td class="num">${d.hits}</td><td class="num">${d.destroyed}</td><td class="num">${d.mw}</td><td>${d.repairs.length ? d.repairs.map(m => IH.dateOf(r.day + m * 30.4)).join(", ") : "—"}</td></tr>`).join("")}
    </table>` : ""}
    <div class="navrow"><a class="btn" href="#/ch/6">← Chapter 6</a><a class="btn primary" href="#/ch/7">Chapter 7: the other side →</a></div>`;
}

/* ------------------------------------------------------------ accounting */
function result() {
  const fileRun = IH.monteCarlo({ decision: "file", targets: "all", fuel: "full", method: "dawn", mistel: "short" }, 1000, 3000);
  const play = S.mode === "play" && S.choices.decision;
  const r = play ? IH.run(playChoices(), S.seed) : null;
  const mc = play ? IH.monteCarlo(playChoices(), 1000, 9000) : null;
  const mos = D.model.soviet.mosenergo1945, ussr = D.model.soviet.ussr1945mw;
  const lostSoviet = mw => `${pct(mw / mos)} of the Moscow system's 1,189 MW in 1945, ${pct(mw / ussr)} of the USSR's 11,124 MW`;

  const fileCol = c => {
    const t = IH.targetsFor(c.targets || "all"), mw = t.reduce((s, x) => s + x.mw, 0);
    return `<div class="col"><span class="tag">What the file expected</span>
      <div class="big">${fmt(mw * 0.6)} MW</div>
      <p class="fine">Koller's arithmetic for ${t.length === 12 ? "all thirteen plants" : t.length === 9 ? "the ten plants of the Yaroslavl and Tula groups" : "the Tula group"}: ${fmt(mw)} MW covered × 60 % hit probability. For all thirteen, 1.5 million kW × 60 % = 0.9 million kW, "the loss of 40 %" of the region's 2.5 million. One probability, no weather, no losses on the way, no repair.</p></div>`;
  };
  const sovCol = mw => `<div class="col soviet"><span class="tag">What the Soviet figures suggest</span>
      <div class="big">${mw ? pct(mw / mos) : "—"}</div><p class="fine">${mw ? "of the Moscow system's capacity in 1945" : ""}</p>
      <p class="fine">${mw ? `${fmt(mw)} MW is ${lostSoviet(mw)}. ` : ""}In 1941 the Moscow system evacuated 726 MW, 54 % of its capacity, and its output fell by half in 1942; the armament works round Moscow went on producing. Steam sets destroyed or removed in 1941 ran again within five to eleven months. By 1945 the system had more capacity than before the war.</p></div>`;

  let body;
  if (play) {
    const longCost = S.choices.mistel === "long" ? `<li>The long-range Mistel ordered: by the file's own count 100 Fw 190 lost to the day fighters, the Ju 88 G-6 night fighter out of production for three months, 5,000 workers for three months, the Ar 234 C and Ju 388 delayed, 500 new tanks.</li>` : "";
    const greatTxt = r.great ? `<li>Extreme what-if: ${r.great.count} Great Mistel flown, ${r.great.hits} hit${r.great.hits === 1 ? "" : "s"}; their pilots could not get home.</li>` : "";
    body = `
      <h2>Your plan, this run</h2>
      <div class="cols3">
        ${fileCol(S.choices)}
        <div class="col model"><span class="tag">What this run produced</span>
          <div class="big">${r.struck ? fmt(r.mwHit) + " MW" : "No attack"}</div>
          <p class="fine">${r.struck ? `${r.launched || 0} Mistel launched${r.great ? ` and ${r.great.count} Great Mistel` : ""}, ${r.hits} hits. Still out of service on 8 May 1945: ${fmt(r.mwWarEnd)} MW; on 1 August: ${fmt(r.mwAug)} MW. Earliest effect at the front (three months, after Baumbach): ${r.frontDay ? IH.dateOf(r.frontDay) : "none"}${r.frontDay ? (r.frontBeforeEnd ? ", before the end of the war." : ", after the end of the war in Europe.") : "."}` : "The attack did not take place. " + esc(r.log[0] ? r.log[r.log.length - 1].msg : "")}</p></div>
        ${sovCol(r.mwHit)}
      </div>
      <h2>Your plan, run 1,000 times</h2>
      <table><tr><th></th><th class="num">10 %</th><th class="num">median</th><th class="num">90 %</th></tr>
        <tr><td>MW destroyed</td><td class="num">${mc.hit.p10}</td><td class="num">${mc.hit.med}</td><td class="num">${mc.hit.p90}</td></tr>
        <tr><td>MW still out on 8 May 1945</td><td class="num">${mc.warEnd.p10}</td><td class="num">${mc.warEnd.med}</td><td class="num">${mc.warEnd.p90}</td></tr></table>
      <p class="fine">Runs in which the attack takes place: ${pct(mc.struck)}; with no hit at all: ${pct(mc.zero)}; in which any effect reaches the front before 8 May: ${pct(mc.front)}. Median pilots lost: ${mc.pilots}.</p>
      <h2>What it cost the German side</h2>
      <ul class="readable">
        <li>Fuel claimed: ${fmt(r.fuelT)} tons${r.fuelT ? `, ${pct(r.fuelT / 2000)} of Luftflotte Reich's February allotment, taken in the file's words from "the Eastern Front, which the attack is meant to relieve"` : ""}.</li>
        ${r.struck ? `<li>${r.launched || 0} combinations expended; ${r.pilotsLost} fighter pilots did not come back; ${r.illLost || 0} illuminator crews lost.</li>` : ""}
        ${longCost}${greatTxt}
      </ul>
      ${readingsBox(r)}`;
  } else {
    body = `
      <h2>The file's own plan, computed</h2>
      <p class="readable">Koller's plan of 18 January: about 100 Mistel against all thirteen plants on the planned date of 1 February, from Königsberg, at dawn, with full fuel. That date had already passed when the operations staff wrote on 7 February that only 18 combinations had been delivered and Königsberg was lost; the plan never existed in this form. Run 1,000 times with the file's figures and the study's named assumptions:</p>
      <div class="cols3">
        ${fileCol({ targets: "all" })}
        <div class="col model"><span class="tag">What the model gives</span><div class="big">${fmt(fileRun.hit.med)} MW</div>
          <p class="fine">Median; 10 % of runs below ${fmt(fileRun.hit.p10)}, 10 % above ${fmt(fileRun.hit.p90)}. The file counted one probability; the model counts serviceability, losses on the way, ground fog and target finding as well. In ${pct(fileRun.front)} of runs an effect would just reach the front, three months on, in the last week of the war.</p></div>
        ${sovCol(fileRun.hit.med)}
      </div>
      <h2>What happened</h2>
      <p class="readable">The staff proposed on 7 February to postpone Eisenhammer. Speer and Baumbach presented it to Hitler again in March; the Mistel were spent against the Oder bridges; in mid-April the General Staff stopped the preparations. No power station on the list was attacked. <a href="#/" onclick="return true">Take the staff's seat</a> to run your own plan.</p>`;
  }
  view.innerHTML = `
    ${progress("result")}
    <span class="tag">The accounting</span>
    <h1>What the file expected, what the model gives, what the Soviet record suggests</h1>
    ${body}
    <h2>What no column counts</h2>
    <p class="readable">The model counts megawatts. It does not count the people at the plants on the night of an attack, the prisoners of the Volgolag who built Rybinsk and Uglich, the workers in the factories the file wanted to stop, or the German prisoners of war whom Baumbach, writing in 1949, imagined rebuilding the damage. It cannot say what a loss of current would have meant for any of them, and it does not try. See the <a href="#/reflection">reflection</a>.</p>
    ${supportBox()}
    <div class="navrow"><a class="btn" href="#/ch/8">← Chapter 8</a>${S.mode === "play" ? `<button id="again">Plan again</button>` : `<a class="btn primary" href="#/">Take the staff's seat</a>`}</div>`;
  const again = $("#again");
  if (again) again.onclick = () => { S.choices = {}; S.seed = Math.floor(Math.random() * 1e9); S.reached = 1; save(); location.hash = "#/ch/1"; };
}

function readingsBox(r) {
  const out = [];
  if (S.choices.mistel === "long") out.push(`<li><b>The long-range Mistel:</b> this game drew ${r.readings.longRange === "baumbach" ? "Baumbach's reading (ready in March from the Berlin area)" : "the file's reading (not before May)"}.</li>`);
  if (r.struck) out.push(`<li><b>The fighter's fuel:</b> this game drew ${r.readings.fuelTransfer === "baumbach" ? "Baumbach's reading (fuel drawn from the Ju 88 on the way out, so the fighter keeps its own tanks for the return)" : "the later accounts' reading (the fighter cannot use the Ju 88's fuel and must reach Courland on its own tanks)"}.</li>`);
  return out.length ? `<h2>The readings you played against</h2><ul class="readable">${out.join("")}</ul><p class="fine">Where the sources disagree, the study draws one reading per game instead of deciding. See <a href="#/data">Data</a> for every assumption.</p>` : "";
}

/* ------------------------------------------------------------ panels */
const flag = k => k === "soviet" ? '<span class="flag soviet">Soviet figure</span>' : k === "apportioned" ? '<span class="flag">apportioned from the file</span>' : k === "estimate" ? '<span class="flag assume">estimate</span>' : "";

const PANELS = {
  targets() {
    const rows = D.model.targets.map(t => `<tr><td>${esc(t.name)}</td><td>${t.type}</td><td class="num">${t.mw}</td><td>${flag(t.mwFrom)}</td></tr>`).join("");
    return `<h3>The thirteen plants</h3><table><tr><th>Plant</th><th>Type</th><th class="num">MW</th><th></th></tr>${rows}
      <tr class="sum"><td colspan="2">Total (the file: 1.5 million kW)</td><td class="num">${fmt(D.model.targets.reduce((s, t) => s + t.mw, 0))}</td><td></td></tr></table>
      <p class="fine">Where a Soviet figure for 1945 has been found it is used; the rest of the file's 1.5 million kW is apportioned. The German total for the region (2.5 million kW) is larger than the Moscow system's own 1,189 MW in 1945, because the region reaches beyond Moscow; how far the German estimate is too high cannot be settled from these sources. <a href="#/data">All data →</a></p>`;
  },
  mistel() {
    return `<h3>The Mistel in figures</h3><table>
      <tr><td>Lower component</td><td>Ju 88 (A-4, G-1, H-4, G-10), pilotless, with a hollow-charge warhead of about 3.5 t</td><td><span class="flag">secondary</span></td></tr>
      <tr><td>Upper component</td><td>Fw 190 A-8/F-8 or Bf 109, the pilot's aircraft</td><td><span class="flag">secondary</span></td></tr>
      <tr><td>Mistel 3C</td><td>Ju 88 G-10 with Fw 190 F-8; S3C its training version</td><td><span class="flag">secondary</span></td></tr>
      <tr><td>Penetration depth</td><td>1,500 km (in production); 2,500 km (ordered, not before May)</td><td><span class="flag file">the file</span></td></tr>
      <tr><td>Needed / delivered</td><td>about 100 / 18 by 7 February 1945</td><td><span class="flag file">the file</span></td></tr>
      <tr><td>Working hours</td><td>7,000 per combination; 20,000 for the long-range version</td><td><span class="flag file">the file</span></td></tr>
      <tr><td>Hit probability</td><td>60 % (the file); "about eighty per cent" (Baumbach 1949)</td><td><span class="flag file">the file</span></td></tr>
    </table>`;
  },
  map() { return `<h3>Airfields, targets and 1,500 km</h3>${mapSvg(["koenigsberg", "danzig", "oder"])}<p class="fine">Great-circle distances; circles of 1,500 km round Königsberg, Danzig/Stolp and Stargard. Coastline: Natural Earth. The front is not drawn: the airfields' dates are in the text.</p>`; },
  distances() {
    const bs = D.model.bases;
    const head = `<tr><th>Plant</th>${bs.map(b => `<th class="num">${esc(b.name.split(" (")[0])}</th>`).join("")}</tr>`;
    const rows = D.model.targets.map(t => `<tr><td>${esc(t.name)}</td>${bs.map(b => { const d = IH.dist(b, t); return `<td class="num" style="${d <= 1500 ? "font-weight:600" : "color:var(--ink2)"}">${fmt(d)}</td>`; }).join("")}</tr>`).join("");
    return `<h3>Distances in km</h3><table>${head}${rows}</table><p class="fine">Bold: within 1,500 km. The result matches the memo of 7 February: everything from Königsberg, the Yaroslavl and Tula groups from Danzig/Stolp, from west of the Oder only Tula and Aleksin.</p>`;
  },
  fuel() {
    return `<h3>1,400 of 2,000 tons</h3><div class="bar"><i style="width:70%"></i></div>
      <p class="fine">Eisenhammer's need for training and operation against Luftflotte Reich's fuel for February 1945 (the file, 7 February, point 6).</p>`;
  },
  probabilities() {
    const A = D.model.assumptions;
    const chain = [["serviceable", A.serviceable], ["not lost on the way", 1 - A.enrouteLoss], ["no fog over the group", 1 - A.fogDawn], ["target found", A.findDawn], ["hit", A.hitFile]];
    const prod = chain.reduce((p, x) => p * x[1], 1);
    return `<h3>One probability, or five</h3>
      <p class="fine">The file counts one: 60 % hits. The study counts the chain the file itself describes:</p>
      <div class="chain">${chain.map(([l, p]) => `<span class="p">${l} ${pct(p)}</span>`).join(" × ")} = <b>${pct(prod)}</b></div>
      <p class="fine">Only the last figure is the file's; the others are the study's assumptions, each named on the <a href="#/data">Data</a> page.</p>`;
  },
  soviet() {
    const st = D.model.soviet.stats;
    const max = Math.max(...st.map(x => x.mosGwh));
    return `<h3>The Moscow system, 1940–1945</h3><table><tr><th>Year</th><th class="num">MW</th><th class="num">GWh</th><th style="width:40%"></th></tr>
      ${st.map(x => `<tr><td>${x.year}</td><td class="num">${fmt(x.mosMw)}</td><td class="num">${fmt(x.mosGwh)}</td><td><div class="bar"><i style="width:${Math.round(x.mosGwh / max * 100)}%;background:var(--soviet)"></i></div></td></tr>`).join("")}</table>
      <p class="fine">Mosenergo capacity and output; ${esc(D.model.soviet.statsSource)}</p>`;
  },
  great() {
    const G = D.model.great;
    return `<h3>Extreme what-if: the Great Mistel</h3>
      <p class="fine">${esc(G.notes.count)}</p>
      <table><tr><td>Available</td><td>${G.countMin}–${G.countMax}, from mid-February</td><td><span class="flag assume">assumption</span></td></tr>
      <tr><td>Reach</td><td>every target, from the Berlin area</td><td><span class="flag assume">assumption</span></td></tr>
      <tr><td>Lost before the target</td><td>${pct(G.abort)}</td><td><span class="flag assume">assumption</span></td></tr>
      <tr><td>Effect of a hit</td><td>up to ${G.unitsPerHit} generating sets</td><td><span class="flag assume">assumption</span></td></tr>
      <tr><td>The pilot</td><td>cannot get home</td><td><span class="flag assume">assumption</span></td></tr></table>`;
  },
};

function plateFig(id) {
  const p = D.plates.plates.find(x => x.id === id);
  if (!p) return "";
  return `<figure><a href="assets/plates/${p.id}.jpg"><img src="assets/plates/${p.id}_t.jpg" alt="${esc(p.titel)}" loading="lazy"></a><figcaption><b>${esc(p.titel)}.</b> ${esc(p.caption)}</figcaption></figure>`;
}

/* ------------------------------------------------------------ map */
function mapSvg(circleBases) {
  const M = D.map;
  const P = (lon, lat) => [((lon - M.lon0) * M.cos * M.k).toFixed(1), ((M.lat1 - lat) * M.k).toFixed(1)];
  const circle = (b, km) => {
    const pts = [], R = 6371, d = km / R, la = b.lat * Math.PI / 180, lo = b.lon * Math.PI / 180;
    for (let a = 0; a <= 360; a += 4) {
      const br = a * Math.PI / 180;
      const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(br));
      const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
      pts.push(P(lo2 * 180 / Math.PI, la2 * 180 / Math.PI).join(","));
    }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--steel)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  };
  const bases = D.model.bases.map(b => { const [x, y] = P(b.lon, b.lat); return `<g><rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="var(--steel)"/><text x="${+x + 8}" y="${+y - 6}" font-size="13" fill="var(--ink)">${esc(b.name.split(" (")[0])}</text></g>`; }).join("");
  const OFF = { balachna: [8, -8, "start"], gorki: [9, 4, "start"], dserschinsk: [8, 16, "start"], alexin: [-8, 4, "end"], tula: [-8, 12, "end"], uglitsch: [-8, 4, "end"] };
  const targets = D.model.targets.map(t => { const [x, y] = P(t.lon, t.lat); const [dx, dy, an] = OFF[t.id] || [7, 4, "start"]; return `<g><circle cx="${x}" cy="${y}" r="5" fill="var(--accent)"/><text x="${+x + dx}" y="${+y + dy}" text-anchor="${an}" font-size="11.5" fill="var(--ink)">${esc(t.name.replace(" (2 plants)", ""))}</text></g>`; }).join("");
  const cl = circleBases.map(id => circle(D.model.bases.find(b => b.id === id), 1500)).join("");
  return `<div class="mapwrap"><svg viewBox="0 0 ${M.w} ${M.h}" role="img" aria-label="Map of jump-off airfields and target power stations">
    <rect width="${M.w}" height="${M.h}" fill="var(--sea)"/><path d="${M.land}" fill="var(--land)" stroke="var(--ink2)" stroke-width="0.6" fill-rule="evenodd"/>${cl}${bases}${targets}</svg></div>`;
}

/* ------------------------------------------------------------ the file */
function file(arg) {
  const pages = D.file.docs.flatMap(d => d.pages.map(p => ({ ...p, doc: d })));
  const cur = pages.find(p => p.id === arg);
  const list = D.file.docs.map(d => `<div><b>${esc(d.title)}</b><div class="pagelist">${d.pages.map((p, i) => `<a class="btn" href="#/file/${p.id}">page ${i + 1}</a>`).join("")}</div></div>`).join("");
  if (!cur) {
    view.innerHTML = `<span class="tag">The file</span><h1>${esc(D.file.title)}</h1>
      <p class="lede readable">Seven pages, two memos, transcribed and translated in full. ${esc(D.file.note)}</p>
      <div class="panel readable">${list}</div>
      <figure class="facs readable"><img src="assets/file/card.jpg" alt="The archive's target card"><figcaption>The archive's own card on the film: "Operations 'Eisenhammer' code name for air attack on USSR hydro-electric plants … Photostated, seven (7) pages." T-971, roll 22, first frame 240.</figcaption></figure>
      <p class="fine">Source: ${esc(D.file.source)} <a href="${D.file.url}">NARA catalog →</a></p>`;
    return;
  }
  const i = pages.indexOf(cur);
  view.innerHTML = `<span class="tag">The file · ${esc(cur.doc.short)} · frame ${cur.frame}</span>
    <h1>${esc(cur.doc.title)}</h1>
    <div class="pagelist">${pages.map(p => `<a class="btn ${p === cur ? "primary" : ""}" href="#/file/${p.id}">${esc(p.doc.short.split(",")[0])} ${p.id.slice(1)}</a>`).join("")}</div>
    <div class="pageview">
      <figure class="facs"><a href="assets/file/${cur.id}.jpg"><img src="assets/file/${cur.id}.jpg" alt="Facsimile of page ${esc(cur.id)}"></a><figcaption>NARA T-971, roll 22, frame ${cur.frame}; negative photostat, inverted.</figcaption></figure>
      <div><h3>Transcription</h3><pre>${esc(cur.de)}</pre><h3 style="margin-top:1rem">Translation</h3><div class="en">${esc(cur.en)}</div></div>
    </div>
    <div class="navrow">${i > 0 ? `<a class="btn" href="#/file/${pages[i - 1].id}">← previous page</a>` : "<span></span>"}${i < pages.length - 1 ? `<a class="btn" href="#/file/${pages[i + 1].id}">next page →</a>` : ""}</div>
    <p class="fine">${esc(D.file.note)}</p>`;
}

/* ------------------------------------------------------------ data */
function data() {
  const A = D.model.assumptions, N = D.model.assumptionNotes;
  const show = (k, v) => Array.isArray(v) ? `${v[0]}–${v[1]} months` : v < 1 && v > 0 ? pct(v) : String(v);
  view.innerHTML = `<span class="tag">Data</span><h1>The figures behind the study</h1>
    <p class="lede readable">Three kinds of number: the file's own, Soviet figures from the record, and the study's assumptions. They are marked as such wherever they appear.</p>
    <div class="panel">${PANELS.map()}</div>
    <div class="panel">${PANELS.distances()}</div>
    <div class="grid g2"><div class="panel">${PANELS.targets()}</div><div class="panel">${PANELS.soviet()}</div></div>
    <div class="grid g2"><div class="panel">${PANELS.mistel()}</div><div class="panel">${PANELS.probabilities()}</div></div>
    <h2>The airfields in the model</h2>
    <table>${D.model.bases.map(b => `<tr><td><b>${esc(b.name)}</b></td><td>usable until ${esc(D.model.fortnights[b.lastFortnight])}</td><td class="fine">${esc(b.note)}</td></tr>`).join("")}</table>
    <p class="fine">${esc(D.model.deliveries.note)}</p>
    <h2>The study's assumptions</h2>
    <table><tr><th>Parameter</th><th>Value</th><th>Basis</th></tr>${Object.keys(A).map(k => `<tr><td>${esc(k)}</td><td>${show(k, A[k])}</td><td class="fine">${esc(N[k] || "")}</td></tr>`).join("")}</table>
    <div class="panel">${PANELS.great()}</div>
    <p class="fine">The model is in <code>model.js</code>, every number in <code>data/model.json</code>. ${esc(D.map.source)}.</p>`;
}

/* ------------------------------------------------------------ plates, sources, reflection */
function plates() {
  view.innerHTML = `<span class="tag">Plates</span><h1>The Mistel, as the Allied armies found them</h1>
    <p class="lede readable">Photographs taken by the US Army and US Army Air Forces as their troops overran the airfields of central Germany in April and May 1945, a drawing of the Mistel 3C and a West Point map.</p>
    <div class="plates">${D.plates.plates.map(p => plateFig(p.id).replace("</figcaption>", ` <span class="fine">${esc(p.source.split(" (")[0])}</span></figcaption>`)).join("")}</div>
    <p class="fine">${esc(D.plates.credit)}</p>`;
}

function sources() {
  const order = ["t971", "hs186", "hs155", "hs189", "hs163", "baumbach", "chronology", "barch", "kopsov", "mosenergo2020", "burdin", "lendlease", "memorial", "forsyth", "westpoint", "greatmistel"];
  const read = { checked: "checked by the editor at the page images or text", research: "read by a research pass, not yet checked by the editor", referred: "referred to only", lead: "lead, not seen" };
  view.innerHTML = `<span class="tag">Sources, method, limits</span><h1>How this study is made</h1>
    <div class="readable">
      <p><b>The file first.</b> The core is the two memos of 18 January and 7 February 1945 in the captured German records of the US National Archives (microfilm T-971, roll 22). They are given in facsimile, full transcription and translation, and every figure the study takes from them links to its page.</p>
      <p><b>Public domain where it is quoted.</b> The German official records, the studies written for the US Air Force after the war, US government reports and Soviet official decrees are quoted. Books still in copyright (Baumbach's memoir in the US, Forsyth's technical accounts, the Mosenergo histories) are summarised and cited, not reproduced.</p>
      <p><b>Three kinds of number.</b> The file's own figures, Soviet figures from the record, and the study's assumptions, each named on the <a href="#/data">Data</a> page. Where the sources disagree (the hit rate, the fighter's fuel, when the long-range Mistel would be ready), the study draws one reading per game and says which.</p>
      <p><b>Hypothetical.</b> The strike in the playable study did not happen. The model is a way of reading the file's arithmetic against the record, not a forecast of an alternative war.</p>
    </div>
    <h2>Sources</h2>
    ${order.map(id => { const s = D.sources[id]; return `<div class="panel readable"><b>${esc(s.short)}</b><p class="fine">${esc(s.cite)}</p><p class="fine">${esc(s.status)} · <i>${read[s.read]}</i>${s.url ? ` · <a href="${s.url}" target="_blank" rel="noopener">online</a>` : ""}</p></div>`; }).join("")}
    <h2>Open questions</h2>
    <ul class="readable fine">
      <li>Steinmann's planning of 1943 and the floating-mine trials are on rolls 22 and 45 of T-971 and have not yet been read at the page images.</li>
      <li>The briefing to Hitler in March 1945 (Bundesarchiv RL 2-I/81) has not been seen.</li>
      <li>How many Mistel were lost at Rechlin on 10 April 1945 is not known from any source found.</li>
      <li>The dates of the Mistel attacks on the Oder bridges differ between accounts.</li>
      <li>The capacities of the smaller plants on the list (Gorki, Dzerzhinsk, Yaroslavl, Komsomolsk, Aleksin, Tula) have not been found.</li>
      <li>The Volgolag figures need checking against Memorial's handbook.</li>
      <li>No Soviet document has been found that knew of Eisenhammer.</li>
    </ul>`;
}

function reflection() {
  view.innerHTML = `<span class="tag">Reflection</span><h1>Reading a staff paper in the last winter of the war</h1>
    <div class="readable">
      <p>This study puts its reader in the seat of a Luftwaffe staff officer in January 1945. That is a choice that needs a reason. The reason is the file itself: two memos, three weeks apart, in which the same staff first proposes an attack and then talks itself out of it. Read closely, they show how an armed force in collapse still reasons, what it counts and what it leaves out, and how quickly a number becomes a certainty.</p>
      <p><b>One probability.</b> Koller's memo turns 2.5 million kilowatts, 60 per cent coverage and a 60 per cent hit probability into "the loss of 40 per cent". Everything else it knows (lost airfields, fog at dawn, beacons that reach two thirds of the way, fuel taken from the front it means to relieve) appears as a "difficulty", not as a factor in the sum. The study's model does nothing cleverer than multiply the difficulties in: the chance that any one Mistel destroys a generating set falls from the file's 60 per cent to about a fifth. Because a hundred combinations were to be spread over thirteen plants, the file's total is still nearly reached in its own best case. But that best case needs 1 February, the airfields of Königsberg and a hundred combinations, and on 7 February the staff had none of the three. The second memo does the arithmetic in words, and proposes to postpone.</p>
      <p><b>What the arithmetic did not know.</b> The Soviet power system had already lost half of Moscow's capacity in 1941 and kept the factories running; it repaired destroyed sets in months, built turbines in a besieged city, and had American generating sets. Even the file's own best case would have been felt at the front, by Baumbach's reckoning, only in the last days of the war. The idea of a single blow against a "weak point" that would turn a lost war is older than Eisenhammer and outlived it.</p>
      <p><b>What the arithmetic did not count.</b> The targets were not abstractions. Two of them, Rybinsk and Uglich, were built by prisoners of the Volgolag, a camp of the Gulag in which many died. The plants were worked by people, at night as by day. The model counts megawatts because that is what the file counts; it cannot count them, and it should not pretend to.</p>
      <p><b>Stories after the fact.</b> Baumbach, writing in Buenos Aires in 1949, explained the end of Eisenhammer by the loss of East Prussia and by humanity: it would have been "madness" to destroy what German prisoners of war would then have to rebuild. The file gives the staff's reasons of February: range, fuel, navigation, weather. Later accounts added a third story, of 18 Mistel destroyed at Rechlin. Each version serves its teller. The study's task is to set them side by side and say which rests on what.</p>
      <p><b>Why play it.</b> The playable part does not reward destruction; it measures plans against the record. Most plans that attack end with a few hundred megawatts destroyed and nothing reaching the front before 8 May. The point is not that the attack would have failed, but to see, decision by decision, what the people who planned it had in front of them, and what they chose not to see.</p>
    </div>`;
}

boot();
