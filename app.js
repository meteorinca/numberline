/* ============================================================
   Number Line – app.js
   Modes: integers | decimals | fractions | addfractions
   SVG-rendered number line with proper ticks & arrowheads
   ============================================================ */

// ── helpers ──────────────────────────────────────────────────
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
function simplify(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), d);
  return [n / g, d / g];
}

function fracHTML(n, d) {
  if (d === 1) return `<span>${n}</span>`;
  return `<span class="frac"><span class="frac-num">${n}</span><span class="frac-bar"></span><span class="frac-den">${d}</span></span>`;
}

function fmtDec(v) { return parseFloat(v.toFixed(4)).toString(); }

// ── parse user answer ────────────────────────────────────────
function parseAns(text, mode) {
  const t = String(text).trim();
  if (!t) return null;
  if (mode === "fractions" || mode === "addfractions") {
    const m = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) { const n = +m[1], d = +m[2]; return d === 0 ? null : { n, d }; }
    if (/^-?\d+$/.test(t)) return { n: +t, d: 1 };
    return null;
  }
  if (mode === "decimals") { const v = parseFloat(t); return isNaN(v) ? null : v; }
  return /^-?\d+$/.test(t) ? parseInt(t, 10) : null;
}

function ansMatch(user, expected, mode) {
  if (user === null) return false;
  if (mode === "fractions" || mode === "addfractions") {
    const [en, ed] = simplify(expected.n, expected.d);
    const [un, ud] = simplify(user.n, user.d);
    return en === un && ed === ud;
  }
  if (mode === "decimals") return Math.abs(user - expected) < 0.001;
  return user === expected;
}

// ── problem generators ──────────────────────────────────────

function makeIntegers(diff) {
  const range = diff === "medium" ? 12 : 8;
  let a, b, sub, op, result;
  // Keep generating until the result fits on the number line
  do {
    a = randInt(-range, range);
    b = randInt(1, range);
    if (Math.random() < 0.5) b = -b;
    sub = Math.random() < 0.45;
    result = sub ? a - b : a + b;
  } while (result < -range || result > range);
  op = sub ? "−" : "+";
  const bStr = b >= 0 ? `${b}` : `(${b})`;
  const ticks = [];
  for (let i = -range; i <= range; i++) ticks.push({ value: i, label: `${i}` });
  return {
    mode: "integers", promptText: `${a} ${op} ${bStr}`,
    answer: result, startVal: a, moveAmt: sub ? -b : b, ticks,
    rangeMin: -range, rangeMax: range,
  };
}

function makeDecimals(diff) {
  // range 0–3 easy, 0–5 medium, step 0.5
  const hi = diff === "medium" ? 5 : 3;
  const lo = 0;
  const step = 0.5;
  const n = Math.round((hi - lo) / step);
  let aIdx, bIdx, a, b, sub, result;
  // Keep generating until the result fits on the number line
  do {
    aIdx = randInt(0, n);
    bIdx = randInt(1, Math.min(n, 6));
    if (Math.random() < 0.4) bIdx = -bIdx;
    a = lo + aIdx * step;
    b = bIdx * step;
    sub = Math.random() < 0.45;
    result = parseFloat((sub ? a - b : a + b).toFixed(4));
  } while (result < lo || result > hi);
  const op = sub ? "−" : "+";
  const bStr = b >= 0 ? fmtDec(b) : `(${fmtDec(b)})`;
  const ticks = [];
  for (let i = 0; i <= n; i++) {
    const v = parseFloat((lo + i * step).toFixed(4));
    ticks.push({ value: v, label: Number.isInteger(v) ? `${v}` : fmtDec(v) });
  }
  return {
    mode: "decimals", promptText: `${fmtDec(a)} ${op} ${bStr}`,
    answer: result, startVal: a, moveAmt: sub ? -b : b, ticks,
    rangeMin: lo, rangeMax: hi,
  };
}

function makeFractions(diff) {
  // Easy: denom 3,4,5 range -1 to 1. Medium: denom 3-6, range -2 to 2.
  // Only whole-number ticks get labels so the answer isn't given away.
  const denoms = diff === "medium" ? [3, 4, 5, 6] : [3, 4, 5];
  const den = denoms[randInt(0, denoms.length - 1)];
  const maxWhole = diff === "medium" ? 2 : 1;
  const numMin = -maxWhole * den;
  const numMax = maxWhole * den;
  let num;
  do {
    num = randInt(numMin + 1, numMax - 1);
  } while (num === 0 || num % den === 0);
  const [sn, sd] = simplify(num, den);
  const ticks = [];
  for (let i = numMin; i <= numMax; i++) {
    const v = i / den;
    // Only label whole numbers — hide fraction labels so student must figure it out
    let lbl = "";
    if (i % den === 0) lbl = `${i / den}`;
    ticks.push({ value: v, label: lbl });
  }
  return {
    mode: "fractions",
    promptHTML: `Locate ${fracHTML(sn, sd)} on the number line`,
    answer: { n: sn, d: sd }, answerVal: sn / sd,
    startVal: 0, moveAmt: sn / sd, ticks,
    rangeMin: -maxWhole, rangeMax: maxWhole,
  };
}

function makeAddFractions(diff) {
  const denoms = diff === "medium" ? [2, 3, 4, 5, 6] : [2, 3, 4];
  const maxWhole = diff === "medium" ? 2 : 1;
  let s1n, s1d, s2n, s2d, fn, fd, resultVal;
  // Keep generating until the sum fits within a reasonable tick range
  do {
    const d1 = denoms[randInt(0, denoms.length - 1)];
    const d2 = denoms[randInt(0, denoms.length - 1)];
    let n1 = randInt(1, maxWhole * d1);
    while (n1 % d1 === 0 && d1 > 1) n1 = randInt(1, maxWhole * d1);
    let n2 = randInt(1, maxWhole * d2);
    while (n2 % d2 === 0 && d2 > 1) n2 = randInt(1, maxWhole * d2);
    [s1n, s1d] = simplify(n1, d1);
    [s2n, s2d] = simplify(n2, d2);
    const cd = lcm(s1d, s2d);
    const rn = s1n * (cd / s1d) + s2n * (cd / s2d);
    [fn, fd] = simplify(rn, cd);
    resultVal = fn / fd;
  } while (resultVal > maxWhole + 1);
  const cd = lcm(s1d, s2d);
  // ticks along common denominator, range covers the result
  const tickDen = cd;
  const tickMaxWhole = Math.ceil(resultVal);
  const tickMax = Math.max(tickMaxWhole, maxWhole + 1) * tickDen;
  const ticks = [];
  for (let i = 0; i <= tickMax; i++) {
    const v = i / tickDen;
    let lbl;
    if (i % tickDen === 0) lbl = `${i / tickDen}`;
    else { const [tn, td] = simplify(i, tickDen); lbl = `${tn}/${td}`; }
    ticks.push({ value: v, label: lbl });
  }
  return {
    mode: "addfractions",
    promptHTML: `${fracHTML(s1n, s1d)} + ${fracHTML(s2n, s2d)}`,
    answer: { n: fn, d: fd }, answerVal: fn / fd,
    startVal: s1n / s1d, moveAmt: s2n / s2d, ticks,
    rangeMin: 0, rangeMax: Math.max(tickMaxWhole, maxWhole + 1),
  };
}

function makeProblem(mode, diff) {
  switch (mode) {
    case "decimals": return makeDecimals(diff);
    case "fractions": return makeFractions(diff);
    case "addfractions": return makeAddFractions(diff);
    default: return makeIntegers(diff);
  }
}

// Create a unique key for a problem to avoid duplicates
function problemKey(prob) {
  if (prob.promptText) return prob.promptText;
  if (prob.promptHTML) return prob.promptHTML;
  return JSON.stringify(prob.answer);
}

// ── SVG number line builder ──────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

function buildNumberLineSVG(prob, onTickClick) {
  const ticks = prob.ticks;
  const count = ticks.length;

  // layout: ensure a minimum SVG width so arrows stay proportional
  const minTotalW = 500;
  const baseSpacing = 44;
  const rawW = 30 + (count - 1) * baseSpacing + 30;
  const tickSpacing = rawW >= minTotalW ? baseSpacing : Math.floor((minTotalW - 60) / Math.max(count - 1, 1));
  const padL = 28;
  const padR = 28;
  const totalW = padL + (count - 1) * tickSpacing + padR;
  const lineY = 34;
  const tickH = 14;
  const labelY = lineY + tickH + 14;
  const svgH = labelY + 8;
  const dotR = 7;

  // arrow size – always 8x6 SVG units
  const aw = 8, ah = 6;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${totalW} ${svgH}`);
  svg.setAttribute("class", "numberline-svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // defs: arrowheads
  const defs = document.createElementNS(SVG_NS, "defs");
  const mid = `ar-${Math.random().toString(36).slice(2, 8)}`;
  const midL = `al-${Math.random().toString(36).slice(2, 8)}`;

  // right arrow
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", mid);
  marker.setAttribute("markerWidth", aw);
  marker.setAttribute("markerHeight", ah);
  marker.setAttribute("refX", aw);
  marker.setAttribute("refY", ah / 2);
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");
  const poly = document.createElementNS(SVG_NS, "polygon");
  poly.setAttribute("points", `0 0, ${aw} ${ah / 2}, 0 ${ah}`);
  poly.setAttribute("fill", "#1a1a1a");
  marker.appendChild(poly);
  defs.appendChild(marker);

  // left arrow
  const markerL = document.createElementNS(SVG_NS, "marker");
  markerL.setAttribute("id", midL);
  markerL.setAttribute("markerWidth", aw);
  markerL.setAttribute("markerHeight", ah);
  markerL.setAttribute("refX", 0);
  markerL.setAttribute("refY", ah / 2);
  markerL.setAttribute("orient", "auto");
  markerL.setAttribute("markerUnits", "userSpaceOnUse");
  const polyL = document.createElementNS(SVG_NS, "polygon");
  polyL.setAttribute("points", `${aw} 0, 0 ${ah / 2}, ${aw} ${ah}`);
  polyL.setAttribute("fill", "#1a1a1a");
  markerL.appendChild(polyL);
  defs.appendChild(markerL);

  svg.appendChild(defs);

  // main axis line with arrowheads
  const axis = document.createElementNS(SVG_NS, "line");
  axis.setAttribute("x1", 4);
  axis.setAttribute("y1", lineY);
  axis.setAttribute("x2", totalW - 4);
  axis.setAttribute("y2", lineY);
  axis.setAttribute("stroke", "#1a1a1a");
  axis.setAttribute("stroke-width", "2");
  axis.setAttribute("marker-end", `url(#${mid})`);
  axis.setAttribute("marker-start", `url(#${midL})`);
  svg.appendChild(axis);

  // ticks & labels
  const fontSize = count > 18 ? 8 : count > 12 ? 9 : 10;
  ticks.forEach((t, i) => {
    const x = padL + i * tickSpacing;
    const isZero = t.value === 0;
    const h = isZero ? tickH + 4 : tickH;

    // tick mark
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", lineY - h / 2);
    line.setAttribute("x2", x);
    line.setAttribute("y2", lineY + h / 2);
    line.setAttribute("stroke", "#1a1a1a");
    line.setAttribute("stroke-width", isZero ? "2" : "1.5");
    svg.appendChild(line);

    // label
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", labelY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", fontSize);
    text.setAttribute("font-family", "Inter, sans-serif");
    text.setAttribute("font-weight", isZero ? "800" : "600");
    text.setAttribute("fill", "#374151");
    text.textContent = t.label;
    svg.appendChild(text);

    // invisible clickable rect
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x - tickSpacing / 2);
    rect.setAttribute("y", 0);
    rect.setAttribute("width", tickSpacing);
    rect.setAttribute("height", svgH);
    rect.setAttribute("fill", "transparent");
    rect.setAttribute("cursor", "pointer");
    rect.addEventListener("click", () => onTickClick(t.value, x));
    svg.appendChild(rect);
  });

  // ── animated dot
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", dotR);
  dot.setAttribute("cy", lineY);
  dot.setAttribute("fill", "#f59e0b");
  dot.setAttribute("stroke", "#d97706");
  dot.setAttribute("stroke-width", "2");
  dot.style.transition = "cx 0.45s ease";
  svg.appendChild(dot);

  // ── path highlight
  const pathRect = document.createElementNS(SVG_NS, "rect");
  pathRect.setAttribute("y", lineY - 3);
  pathRect.setAttribute("height", 6);
  pathRect.setAttribute("rx", 3);
  pathRect.setAttribute("fill", "#60a5fa");
  pathRect.setAttribute("opacity", "0.5");
  pathRect.setAttribute("width", 0);
  pathRect.style.transition = "x 0.45s ease, width 0.45s ease";
  svg.insertBefore(pathRect, dot); // behind dot

  // helper: value → x
  const valToX = (v) => {
    const min = ticks[0].value;
    const max = ticks[count - 1].value;
    if (max === min) return padL;
    return padL + ((v - min) / (max - min)) * (count - 1) * tickSpacing;
  };

  return { svg, dot, pathRect, valToX, totalW, svgH };
}

// ── build problem element ────────────────────────────────────

function buildProblem(index, prob) {
  const el = document.createElement("div");
  el.className = "problem";
  el._prob = prob;

  // top row
  const top = document.createElement("div");
  top.className = "problem-top";
  const qn = document.createElement("span");
  qn.className = "qnum";
  qn.textContent = `${index}.`;
  const pr = document.createElement("span");
  pr.className = "prompt";
  if (prob.promptHTML) pr.innerHTML = prob.promptHTML;
  else pr.textContent = prob.promptText;
  top.appendChild(qn);
  top.appendChild(pr);
  el.appendChild(top);

  // SVG number line
  let inAns; // forward ref
  const qfb = document.createElement("div");
  qfb.className = "qfeedback";

  const clearMarks = () => {
    inAns.classList.remove("correct", "wrong");
    qfb.textContent = "";
    qfb.style.color = "";
  };

  const onTickClick = (val, x) => {
    nl.dot.setAttribute("cx", x);
    // fill input depending on mode
    if (prob.mode === "fractions" || prob.mode === "addfractions") {
      const tick = prob.ticks.find(t => Math.abs(t.value - val) < 1e-9);
      inAns.value = tick ? tick.label : val;
    } else if (prob.mode === "decimals") {
      inAns.value = fmtDec(val);
    } else {
      inAns.value = val;
    }
    clearMarks();
  };

  const nl = buildNumberLineSVG(prob, onTickClick);
  el.appendChild(nl.svg);

  // answer row
  const row = document.createElement("div");
  row.className = "answerRow";

  const lbl = document.createElement("label");
  lbl.textContent = "Answer:";

  inAns = document.createElement("input");
  inAns.type = "text";
  inAns.placeholder = (prob.mode === "fractions" || prob.mode === "addfractions") ? "n/d" : "number";

  const btnShow = document.createElement("button");
  btnShow.type = "button";
  btnShow.className = "smallBtn";
  btnShow.textContent = "Show move";

  const btnReset = document.createElement("button");
  btnReset.type = "button";
  btnReset.className = "smallBtn";
  btnReset.textContent = "Reset";

  // input → move dot
  inAns.addEventListener("input", () => {
    clearMarks();
    const parsed = parseAns(inAns.value, prob.mode);
    if (parsed === null) return;
    const val = (prob.mode === "fractions" || prob.mode === "addfractions") ? parsed.n / parsed.d : parsed;
    const min = prob.ticks[0].value;
    const max = prob.ticks[prob.ticks.length - 1].value;
    if (val >= min && val <= max) {
      nl.dot.setAttribute("cx", nl.valToX(val));
    }
  });

  // show move
  btnShow.addEventListener("click", () => {
    const sx = nl.valToX(prob.startVal);
    const endVal = prob.startVal + prob.moveAmt;
    const ex = nl.valToX(endVal);
    const leftX = Math.min(sx, ex);
    const w = Math.abs(ex - sx);
    nl.pathRect.setAttribute("x", leftX);
    nl.pathRect.setAttribute("width", w);
    nl.dot.setAttribute("cx", sx);
    setTimeout(() => nl.dot.setAttribute("cx", ex), 60);
    const dir = prob.moveAmt >= 0 ? "right" : "left";
    qfb.textContent = `Move ${dir} ${Math.abs(prob.moveAmt)}`;
    qfb.style.color = "#6b7280";
  });

  // reset
  btnReset.addEventListener("click", () => {
    nl.dot.setAttribute("cx", nl.valToX(prob.startVal));
    nl.pathRect.setAttribute("width", 0);
    inAns.value = "";
    clearMarks();
  });

  row.appendChild(lbl);
  row.appendChild(inAns);
  row.appendChild(btnShow);
  row.appendChild(btnReset);
  el.appendChild(row);
  el.appendChild(qfb);

  // initial dot position
  nl.dot.setAttribute("cx", nl.valToX(prob.startVal));

  return el;
}

// ── quiz lifecycle ───────────────────────────────────────────

function newSet() {
  const quiz = document.getElementById("quiz");
  const fb = document.getElementById("globalFeedback");
  quiz.innerHTML = "";
  fb.textContent = "";
  fb.style.color = "";
  const count = +document.getElementById("count").value;
  const diff = document.getElementById("difficulty").value;
  const mode = document.getElementById("mode").value;
  const seen = new Set();
  let idx = 0;
  let attempts = 0;
  while (idx < count && attempts < count * 20) {
    const prob = makeProblem(mode, diff);
    const key = problemKey(prob);
    attempts++;
    if (seen.has(key)) continue;
    seen.add(key);
    idx++;
    quiz.appendChild(buildProblem(idx, prob));
  }
}

function checkAll() {
  const rows = document.querySelectorAll(".problem");
  const fb = document.getElementById("globalFeedback");
  let perfect = true;
  rows.forEach(row => {
    const prob = row._prob;
    const inp = row.querySelector('input[type="text"]');
    const qfb = row.querySelector(".qfeedback");
    const user = parseAns(inp.value, prob.mode);
    if (user === null) {
      inp.classList.add("wrong");
      qfb.textContent = "Enter an answer";
      qfb.style.color = "#ef4444";
      perfect = false;
      return;
    }
    if (ansMatch(user, prob.answer, prob.mode)) {
      inp.classList.remove("wrong");
      inp.classList.add("correct");
      qfb.textContent = "✅ Correct!";
      qfb.style.color = "#16a34a";
    } else {
      inp.classList.remove("correct");
      inp.classList.add("wrong");
      qfb.textContent = "Try again";
      qfb.style.color = "#ef4444";
      perfect = false;
    }
  });
  if (rows.length === 0) return;
  if (perfect) {
    fb.textContent = "🌟 All correct!";
    fb.style.color = "#16a34a";
  } else {
    fb.textContent = "Some answers need fixing — check the red ones.";
    fb.style.color = "#ef4444";
  }
}

// ── init ─────────────────────────────────────────────────────
document.getElementById("btnNew").addEventListener("click", newSet);
document.getElementById("btnCheck").addEventListener("click", checkAll);
document.getElementById("mode").addEventListener("change", newSet);
document.getElementById("difficulty").addEventListener("change", newSet);
newSet();
