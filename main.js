import "./style.css";

const API = "http://localhost:4000";

document.querySelector("#app").innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="badge">SRM AP • QUESTION PAPERS</div>
      <h1>Find your question paper.</h1>
      <p>Ask normally. Get matching SRM AP question-paper PDFs.</p>
    </section>

    <section class="chat" id="chat">
      <div class="message bot">
        <div class="avatar">Q</div>
        <div>
          <strong>Paper Finder</strong>
          <p>What question paper are you looking for?</p>
          <div class="chips">
            <button data-q="previous year question papers">Previous year papers</button>
            <button data-q="mid 1 question papers">Mid 1 papers</button>
            <button data-q="mid 2 question papers">Mid 2 papers</button>
          </div>
        </div>
      </div>
    </section>

    <form class="composer" id="form">
      <input id="query" autocomplete="off"
        placeholder="e.g. previous year Data Structures mid 1 paper" />
      <button type="submit">Search</button>
    </form>

    <footer>Documents are returned from the SRM AP intranet source.</footer>
  </main>
`;

const chat = document.querySelector("#chat");
const form = document.querySelector("#form");
const input = document.querySelector("#query");

function addMessage(html, cls = "bot") {
  const div = document.createElement("div");
  div.className = `message ${cls}`;
  div.innerHTML = html;
  chat.appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function renderResults(data) {
  if (!data.results.length) {
    addMessage(`<strong>No matching papers found.</strong>
      <p>Try the subject, exam type, semester, or year in a simpler phrase.</p>`);
    return;
  }

  const cards = data.results.map(p => `
    <article class="paper">
      <div class="paper-icon">PDF</div>
      <div class="paper-info">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">
          ${[p.subject, p.branch, p.semester, p.year, p.examType]
            .filter(Boolean).map(escapeHtml).join(" • ") || "SRM AP examination document"}
        </div>
        <div class="actions">
          <a href="${escapeHtml(p.pdfUrl)}" target="_blank" rel="noopener">View PDF</a>
          <a class="download" href="${escapeHtml(p.pdfUrl)}" download>Download PDF</a>
        </div>
      </div>
    </article>
  `).join("");

  addMessage(`<strong>Found ${data.count} matching paper${data.count === 1 ? "" : "s"}.</strong>
    <div class="results">${cards}</div>`);
}

async function search(q) {
  addMessage(`<p>${escapeHtml(q)}</p>`, "user");
  addMessage(`<div class="typing"><span></span><span></span><span></span></div>`);

  try {
    const response = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    chat.lastElementChild.remove();

    if (!response.ok) throw new Error(data.error || "Search failed");
    renderResults(data);
  } catch (err) {
    chat.lastElementChild?.remove();
    addMessage(`<strong>Search unavailable.</strong><p>Make sure the backend is running.</p>`);
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  search(q);
});

document.addEventListener("click", e => {
  if (e.target.matches("[data-q]")) search(e.target.dataset.q);
});