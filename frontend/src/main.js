const API_BASE =
  "https://srm-qp-backend.vercel.app";

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-shell">

    <header class="topbar">
      <div class="brand">
        <div class="brand-icon">SRM</div>

        <div>
          <h1>SRM AP Question Papers</h1>
          <p>
            Find previous question papers
          </p>
        </div>
      </div>
    </header>

    <main class="chat-container">

      <section class="welcome">
        <h2>
          Find Question Papers
        </h2>

        <p>
          Browse all available SRM AP question papers
          by exam type, year and semester.
        </p>
      </section>

      <section class="filters">

        <div class="filter-group">
          <label>Exam</label>

          <select id="exam-filter">
            <option value="all">
              All Exams
            </option>

            <option value="Mid Term">
              Mid Term
            </option>

            <option value="End Term">
              End Term
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Year</label>

          <select id="year-filter">
            <option value="all">
              All Years
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Semester</label>

          <select id="semester-filter">
            <option value="all">
              All Semesters
            </option>

            <option value="Odd">
              Odd Semester
            </option>

            <option value="Even">
              Even Semester
            </option>
          </select>
        </div>

      </section>

      <form
        id="search-form"
        class="search-box"
      >

        <input
          id="search-input"
          type="text"
          placeholder="Search year, exam type, or keyword..."
          autocomplete="off"
        />

        <button type="submit">
          Search
        </button>

      </form>

      <div class="quick-searches">

        <button data-exam="all">
          All Papers
        </button>

        <button data-exam="Mid Term">
          Mid Term
        </button>

        <button data-exam="End Term">
          End Term
        </button>

      </div>

      <div id="status"></div>

      <section
        id="results"
        class="results"
      ></section>

    </main>
  </div>
`;

const searchForm =
  document.querySelector(
    "#search-form"
  );

const searchInput =
  document.querySelector(
    "#search-input"
  );

const examFilter =
  document.querySelector(
    "#exam-filter"
  );

const yearFilter =
  document.querySelector(
    "#year-filter"
  );

const semesterFilter =
  document.querySelector(
    "#semester-filter"
  );

const results =
  document.querySelector(
    "#results"
  );

const status =
  document.querySelector(
    "#status"
  );


async function loadPapers() {

  status.textContent =
    "Loading SRM question papers...";

  results.innerHTML = "";

  const params =
    new URLSearchParams();

  const query =
    searchInput.value.trim();

  const examType =
    examFilter.value;

  const year =
    yearFilter.value;

  const semester =
    semesterFilter.value;

  if (query) {
    params.set("q", query);
  }

  params.set(
    "examType",
    examType
  );

  params.set(
    "year",
    year
  );

  params.set(
    "semester",
    semester
  );

  try {

    const response =
      await fetch(
        `${API_BASE}/api/search?${params.toString()}`
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    populateYears(
      data.results || []
    );

    renderResults(
      data.results || []
    );

    status.textContent =
      `${data.count} question paper${
        data.count === 1
          ? ""
          : "s"
      } found`;

  } catch (error) {

    console.error(
      "Search error:",
      error
    );

    status.textContent =
      "Unable to load question papers.";

    results.innerHTML = `
      <div class="error-card">
        <h3>
          Unable to load papers
        </h3>

        <p>
          The question-paper server could
          not return the papers.
        </p>
      </div>
    `;
  }
}


function populateYears(papers) {

  const currentValue =
    yearFilter.value;

  const years =
    [
      ...new Set(
        papers
          .map(paper => paper.year)
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        Number(b) - Number(a)
    );

  const existing =
    new Set(
      Array.from(
        yearFilter.options
      ).map(option =>
        option.value
      )
    );

  for (const year of years) {

    if (existing.has(year)) {
      continue;
    }

    const option =
      document.createElement(
        "option"
      );

    option.value = year;
    option.textContent = year;

    yearFilter.appendChild(
      option
    );
  }

  if (
    currentValue &&
    Array.from(
      yearFilter.options
    ).some(
      option =>
        option.value === currentValue
    )
  ) {
    yearFilter.value =
      currentValue;
  }
}


function renderResults(papers) {

  results.innerHTML = "";

  if (papers.length === 0) {

    results.innerHTML = `
      <div class="empty-card">
        <h3>
          No question papers found
        </h3>

        <p>
          Try All Exams and All Years.
        </p>
      </div>
    `;

    return;
  }

  for (const paper of papers) {

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "paper-card";

    const title =
      document.createElement(
        "h3"
      );

    title.textContent =
      paper.title ||
      "SRM AP Question Paper";

    const details =
      document.createElement(
        "div"
      );

    details.className =
      "paper-details";

    const information = [
      paper.examType,
      paper.year,
      paper.semester
        ? `${paper.semester} Semester`
        : ""
    ].filter(Boolean);

    details.textContent =
      information.length
        ? information.join(" • ")
        : "Question Paper";

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "paper-actions";

    const viewButton =
      document.createElement(
        "a"
      );

    viewButton.href =
      paper.pdfUrl;

    viewButton.target =
      "_blank";

    viewButton.rel =
      "noopener noreferrer";

    viewButton.className =
      "view-button";

    viewButton.textContent =
      "View PDF";

    const downloadButton =
      document.createElement(
        "a"
      );

    downloadButton.href =
      paper.pdfUrl;

    downloadButton.target =
      "_blank";

    downloadButton.rel =
      "noopener noreferrer";

    downloadButton.className =
      "download-button";

    downloadButton.textContent =
      "Download PDF";

    downloadButton.setAttribute(
      "download",
      ""
    );

    actions.appendChild(
      viewButton
    );

    actions.appendChild(
      downloadButton
    );

    card.appendChild(
      title
    );

    card.appendChild(
      details
    );

    card.appendChild(
      actions
    );

    results.appendChild(
      card
    );
  }
}


searchForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    loadPapers();
  }
);


examFilter.addEventListener(
  "change",
  loadPapers
);

yearFilter.addEventListener(
  "change",
  loadPapers
);

semesterFilter.addEventListener(
  "change",
  loadPapers
);


document
  .querySelectorAll(
    "[data-exam]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        examFilter.value =
          button.dataset.exam;

        loadPapers();
      }
    );
  });


/*
 * DEFAULT:
 * Load ALL available papers.
 */
loadPapers();
