import * as cheerio from "cheerio";

const ROOT = "https://intranet.srmap.edu.in/";
const MAX_PAGES = Number(process.env.MAX_PAGES || 150);

const QUESTION_PAPER_PATH_WORDS = [
  "question",
  "paper",
  "question-paper",
  "question_paper",
  "exam"
];

const EXAM_TYPES = [
  "mid term",
  "midterm",
  "mid-term",
  "end term",
  "endterm",
  "end-term"
];

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return cleanText(value).toLowerCase();
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function sameHost(url) {
  try {
    return new URL(url).hostname === new URL(ROOT).hostname;
  } catch {
    return false;
  }
}

function isPdf(url) {
  return /\.pdf(?:[?#].*)?$/i.test(url);
}

function detectExamType(text) {
  const value = normalize(text);

  if (
    value.includes("mid term") ||
    value.includes("midterm") ||
    value.includes("mid-term")
  ) {
    return "Mid Term";
  }

  if (
    value.includes("end term") ||
    value.includes("endterm") ||
    value.includes("end-term")
  ) {
    return "End Term";
  }

  return "";
}

function detectYear(text) {
  const match = String(text).match(/\b20\d{2}\b/);
  return match ? match[0] : "";
}

function detectSemester(text) {
  const value = normalize(text);

  if (
    value.includes("odd semester") ||
    value.includes("odd sem") ||
    value.includes("1st semester") ||
    value.includes("3rd semester") ||
    value.includes("5th semester") ||
    value.includes("7th semester")
  ) {
    return "Odd";
  }

  if (
    value.includes("even semester") ||
    value.includes("even sem") ||
    value.includes("2nd semester") ||
    value.includes("4th semester") ||
    value.includes("6th semester") ||
    value.includes("8th semester")
  ) {
    return "Even";
  }

  return "";
}

function looksLikeQuestionPaper(url, text) {
  const combined = normalize(`${url} ${text}`);

  if (!isPdf(url)) {
    return false;
  }

  return (
    QUESTION_PAPER_PATH_WORDS.some(word =>
      combined.includes(word)
    ) ||
    EXAM_TYPES.some(type =>
      combined.includes(type)
    )
  );
}

function makePaper(title, pdfUrl, context = "") {
  const combined = `${title} ${pdfUrl} ${context}`;

  return {
    title:
      cleanText(title) ||
      decodeURIComponent(pdfUrl.split("/").pop() || "Question Paper"),

    pdfUrl,
    sourceUrl: pdfUrl,

    examType: detectExamType(combined),
    year: detectYear(combined),
    semester: detectSemester(combined),

    subject: "",
    courseCode: "",

    folder: cleanText(context)
  };
}

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SRM-Question-Paper-Finder/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || "";

  return {
    url: response.url,
    contentType,
    body: await response.text()
  };
}

async function discoverPapers() {
  const visited = new Set();
  const queued = new Set([ROOT]);
  const queue = [ROOT];

  const papers = new Map();

  while (
    queue.length > 0 &&
    visited.size < MAX_PAGES
  ) {
    const currentUrl = queue.shift();

    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);

    let page;

    try {
      page = await fetchPage(currentUrl);
    } catch (error) {
      console.error(
        `Could not crawl ${currentUrl}:`,
        error.message
      );
      continue;
    }

    if (!page.contentType.includes("text/html")) {
      continue;
    }

    const $ = cheerio.load(page.body);

    $("a[href]").each((_index, element) => {
      const href = $(element).attr("href");

      if (!href) {
        return;
      }

      const linkText = cleanText(
        $(element).text()
      );

      const url = absoluteUrl(
        href,
        page.url
      );

      if (!url || !sameHost(url)) {
        return;
      }

      /*
       * PDF discovery
       */
      if (
        isPdf(url) &&
        looksLikeQuestionPaper(url, linkText)
      ) {
        const paper = makePaper(
          linkText,
          url,
          page.url
        );

        papers.set(paper.pdfUrl, paper);

        return;
      }

      /*
       * Continue through the SRM Document Manager
       * hierarchy.
       */
      if (!visited.has(url) && !queued.has(url)) {
        queued.add(url);
        queue.push(url);
      }
    });
  }

  return Array.from(papers.values());
}

function matchesFilter(paper, filters) {
  const {
    examType,
    year,
    semester
  } = filters;

  if (
    examType &&
    examType !== "all" &&
    paper.examType !== examType
  ) {
    return false;
  }

  if (
    year &&
    year !== "all" &&
    paper.year !== year
  ) {
    return false;
  }

  if (
    semester &&
    semester !== "all" &&
    paper.semester !== semester
  ) {
    return false;
  }

  return true;
}

function searchTextMatch(paper, query) {
  const q = normalize(query);

  if (!q) {
    return true;
  }

  const text = normalize(
    [
      paper.title,
      paper.examType,
      paper.year,
      paper.semester,
      paper.folder,
      paper.pdfUrl
    ].join(" ")
  );

  const words = q.split(" ").filter(Boolean);

  return words.every(word =>
    text.includes(word)
  );
}

export async function searchQuestionPapers(
  query = "",
  filters = {}
) {
  const papers = await discoverPapers();

  return papers
    .filter(paper =>
      matchesFilter(paper, filters)
    )
    .filter(paper =>
      searchTextMatch(paper, query)
    )
    .sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);

      return yearB - yearA;
    });
}

export async function refreshIndex() {
  const papers = await discoverPapers();

  return {
    indexed: papers.length,
    papers
  };
}
