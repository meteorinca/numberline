function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseIntSafe(text) {
  const t = String(text).trim();
  if (!/^-?\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

function makeProblem(difficulty) {
  const range = difficulty === "medium" ? 15 : 10;
  const a = randInt(-range, range);
  let b = randInt(-range, range);
  while (b === 0) b = randInt(-range, range);

  const useSub = Math.random() < 0.45;
  const op = useSub ? "-" : "+";
  const result = useSub ? a - b : a + b;

  return { a, b, op, result, range };
}

function buildTicks(range, onSelect) {
  const ticks = document.createElement("div");
  ticks.className = "ticks";

  for (let i = -range; i <= range; i++) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.dataset.value = String(i);

    const mark = document.createElement("div");
    mark.className = "mark";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = i;

    tick.appendChild(mark);
    tick.appendChild(label);
    tick.addEventListener("click", () => onSelect(i, tick));

    ticks.appendChild(tick);
  }

  return ticks;
}

function positionForValue(value, range) {
  const total = range * 2;
  return ((value + range) / total) * 100;
}

function buildProblem(index, prob) {
  const wrapper = document.createElement("div");
  wrapper.className = "problem";
  wrapper.dataset.answer = String(prob.result);
  wrapper.dataset.range = String(prob.range);
  wrapper.dataset.start = String(prob.a);
  wrapper.dataset.move = String(prob.op === "+" ? prob.b : -prob.b);

  const top = document.createElement("div");
  top.className = "problem-top";

  const qnum = document.createElement("div");
  qnum.className = "qnum";
  qnum.textContent = `${index}.`;

  const prompt = document.createElement("div");
  prompt.className = "prompt";
  const bText = prob.b >= 0 ? prob.b : `(${prob.b})`;
  prompt.textContent = `Start at ${prob.a}. Compute: ${prob.a} ${prob.op} ${bText}`;

  top.appendChild(qnum);
  top.appendChild(prompt);

  const main = document.createElement("div");
  main.className = "problem-main";

  const left = document.createElement("div");
  left.className = "panel";

  const title = document.createElement("h3");
  title.textContent = "Number line";
  left.appendChild(title);

  const numberline = document.createElement("div");
  numberline.className = "numberline";

  const line = document.createElement("div");
  line.className = "line";
  numberline.appendChild(line);

  const path = document.createElement("div");
  path.className = "path";
  numberline.appendChild(path);

  const dot = document.createElement("div");
  dot.className = "dot";
  numberline.appendChild(dot);

  const clearSelect = () => {
    numberline.querySelectorAll(".tick").forEach(t => t.classList.remove("selected"));
  };

  const onSelect = (value, tickEl) => {
    clearSelect();
    tickEl.classList.add("selected");
    dot.style.left = `${positionForValue(value, prob.range)}%`;
    inAns.value = value;
    clearMarks();
  };

  const ticks = buildTicks(prob.range, onSelect);
  numberline.appendChild(ticks);
  left.appendChild(numberline);

  const answerRow = document.createElement("div");
  answerRow.className = "answerRow";

  const ansLabel = document.createElement("div");
  ansLabel.className = "fracLabel";
  ansLabel.textContent = "Answer:";

  const inAns = document.createElement("input");
  inAns.type = "text";
  inAns.inputMode = "numeric";
  inAns.placeholder = "number";

  const btnShow = document.createElement("button");
  btnShow.type = "button";
  btnShow.className = "smallBtn";
  btnShow.textContent = "Show move";

  const btnReset = document.createElement("button");
  btnReset.type = "button";
  btnReset.className = "smallBtn";
  btnReset.textContent = "Reset";

  const qfb = document.createElement("div");
  qfb.className = "qfeedback";

  const clearMarks = () => {
    inAns.classList.remove("correct", "wrong");
    qfb.textContent = "";
    qfb.style.color = "";
  };

  inAns.addEventListener("input", () => {
    clearMarks();
    const v = parseIntSafe(inAns.value);
    if (v === null) return;
    dot.style.left = `${positionForValue(v, prob.range)}%`;
    clearSelect();
  });

  btnShow.addEventListener("click", () => {
    const start = parseInt(wrapper.dataset.start, 10);
    const move = parseInt(wrapper.dataset.move, 10);
    const end = start + move;

    const startPos = positionForValue(start, prob.range);
    const endPos = positionForValue(end, prob.range);

    const leftPos = Math.min(startPos, endPos);
    const width = Math.abs(endPos - startPos);

    path.style.left = `${leftPos}%`;
    path.style.width = `${width}%`;

    dot.style.left = `${startPos}%`;
    setTimeout(() => {
      dot.style.left = `${endPos}%`;
    }, 50);

    qfb.textContent = `Move ${move >= 0 ? "right" : "left"} ${Math.abs(move)}.`;
    qfb.style.color = "#6b7280";
  });

  btnReset.addEventListener("click", () => {
    dot.style.left = `${positionForValue(prob.a, prob.range)}%`;
    path.style.width = "0%";
    clearSelect();
    inAns.value = "";
    clearMarks();
  });

  answerRow.appendChild(ansLabel);
  answerRow.appendChild(inAns);
  answerRow.appendChild(btnShow);
  answerRow.appendChild(btnReset);

  left.appendChild(answerRow);
  left.appendChild(qfb);

  main.appendChild(left);
  wrapper.appendChild(top);
  wrapper.appendChild(main);

  // Set initial dot position at the start value
  dot.style.left = `${positionForValue(prob.a, prob.range)}%`;
  path.style.width = "0%";

  return wrapper;
}

function newSet() {
  const quiz = document.getElementById("quiz");
  const globalFeedback = document.getElementById("globalFeedback");
  quiz.innerHTML = "";
  globalFeedback.textContent = "";
  globalFeedback.style.color = "";

  const count = parseInt(document.getElementById("count").value, 10);
  const difficulty = document.getElementById("difficulty").value;

  for (let i = 1; i <= count; i++) {
    quiz.appendChild(buildProblem(i, makeProblem(difficulty)));
  }
}

function checkAll() {
  const rows = document.querySelectorAll(".problem");
  const globalFeedback = document.getElementById("globalFeedback");
  let allCorrect = true;

  rows.forEach(row => {
    const answer = parseInt(row.dataset.answer, 10);
    const inAns = row.querySelector("input[type=\"text\"]");
    const qfb = row.querySelector(".qfeedback");

    const user = parseIntSafe(inAns.value);
    if (user === null) {
      inAns.classList.add("wrong");
      qfb.textContent = "Enter a number";
      qfb.style.color = "#e74c3c";
      allCorrect = false;
      return;
    }

    if (user === answer) {
      inAns.classList.remove("wrong");
      inAns.classList.add("correct");
      qfb.textContent = "✅ Correct";
      qfb.style.color = "#27ae60";
    } else {
      inAns.classList.remove("correct");
      inAns.classList.add("wrong");
      qfb.textContent = "Try again";
      qfb.style.color = "#e74c3c";
      allCorrect = false;
    }
  });

  if (allCorrect) {
    globalFeedback.textContent = "🌟 Nailed it. Your number line moves are correct.";
    globalFeedback.style.color = "#27ae60";
  } else {
    globalFeedback.textContent = "Some are off. Fix the red ones and check again.";
    globalFeedback.style.color = "#e74c3c";
  }
}

document.getElementById("btnNew").addEventListener("click", newSet);
document.getElementById("btnCheck").addEventListener("click", checkAll);

newSet();
