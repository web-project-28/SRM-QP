const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-icon">SRM</div>
        <div>
          <h1>SRM AP Question Papers</h1>
          <p>Find previous question papers quickly</p>
        </div>
      </div>
    </header>

    <main class="chat-container">
      <section class="welcome">
        <h2>What question paper are you looking for?</h2>
        <p>
          Search by subject, course code, exam type, month, or year.
        </p>
      </section>

      <div class="quick-searches">
        <button data-query="previous year question papers">Previous Year</button>
        <button data-query="mid term question papers">Mid Term</button>
        <button data-query="end term question papers">End Term</button>
        <button data-query="show me all available question papers">All Papers</button>
      </div>

      <form id="search-form" class="search-box">
        <input
          id="search-input"
          type="text"
          placeholder="Search question papers..."
          autocomplete="off"
        />
        <button type="submit">Search</button>
      </form>

      <div id="status"></div>

      <section id="results" class="results"></section>
    </main>
  </div>
`;

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const results = document.querySelector("#results");
const status = document.querySelector("#status");

async function searchQuestionPapers(query) {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    status.textContent = "Enter a question paper name or subject.";
    results.innerHTML = "";
    return;
  }

  status.textContent = "Searching SRM AP question papers...";
  results.innerHTML = "";

  try {
    const response = await fetch(
      `${API_BASE}/api/search?q=${encodeURIComponent(cleanQuery)}`
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    renderResults(data.results || []);

    if ((data.results || []).length === 0) {
      status.textContent = "No matching question papers found.";
    } else {
      status.textContent =
        `${data.results.length} question paper${data.results.length === 1 ? "" : "s"} found`;
    }
  } catch (error) {
    console.error(error);

    status.textContent =
      "Unable to connect to the question-paper server.";
  }
}

function renderResults(papers) {
  results.innerHTML = "";

  for (const paper of papers) {
    const card = document.createElement("article");
    card.className = "paper-card";

    const title = document.createElement("h3");
    title.textContent =
      paper.title || paper.subject || "SRM AP Question Paper";

    const details = document.createElement("div");
    details.className = "paper-details";

    const information = [
      paper.courseCode,
      paper.examType,
      paper.month,
      paper.year
    ].filter(Boolean);

    details.textContent =
      information.length > 0
        ? information.join(" • ")
        : "Question Paper";

    const actions = document.createElement("div");
    actions.className = "paper-actions";

    const viewButton = document.createElement("a");
    viewButton.href = paper.pdfUrl;
    viewButton.target = "_blank";
    viewButton.rel = "noopener noreferrer";
    viewButton.className = "view-button";
    viewButton.textContent = "View PDF";

    const downloadButton = document.createElement("a");
    downloadButton.href = paper.pdfUrl;
    downloadButton.target = "_blank";
    downloadButton.rel = "noopener noreferrer";
    downloadButton.className = "download-button";
    downloadButton.textContent = "Download PDF";
    downloadButton.setAttribute("download", "");

    actions.appendChild(viewButton);
    actions.appendChild(downloadButton);

    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(actions);

    results.appendChild(card);
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchQuestionPapers(searchInput.value);
});

document.querySelectorAll("[data-query]").forEach(button => {
  button.addEventListener("click", () => {
    const query = button.dataset.query;

    searchInput.value = query;
    searchQuestionPapers(query);
  });
});
