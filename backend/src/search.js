import * as cheerio from "cheerio";

const ROOT = "https://intranet.srmap.edu.in/";

const MAX_PAGES = Number(process.env.MAX_PAGES || 40);

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scorePaper(paper, query) {
  const queryTokens = tokenize(query);

  const searchableText = tokenize(
    [
      paper.title,
      paper.subject,
      paper.courseCode,
      paper.examType,
      paper.folder,
      paper.year,
      paper.month,
      paper.pdfUrl
    ].join(" ")
  );

  let score = 0;

  for (const token of queryTokens) {
    if (searchableText.includes(token)) {
      score += 3;
    } else if (searchableText.some(value => value.includes(token))) {
      score += 1;
    }
  }

  return score;
}

function isQuestionPaper(url, text = "") {
  return /\.pdf(\?|$)/i.test(url) &&
    /(question|paper|exam|mid|term|end|test)/i.test(
      `${url} ${text}`
    );
}

function extractPaperInfo(title, url, folder = "") {
  const combined = `${title} ${url}`;

  const courseMatch = combined.match(
    /\b([A-Z]{2,5}\s?[A-Z]?\s?\d{2,4})\b/i
  );

  let examType = "";

  if (/mid\s*term/i.test(combined)) {
    examType = "Mid Term";
  } else if (/end\s*term/i.test(combined)) {
    examType = "End Term";
  }

  const yearMatch = combined.match(/\b20\d{2}\b/);

  return {
    title: title || "SRM AP Question Paper",
    pdfUrl: url,
    sourceUrl: url,
    courseCode: courseMatch?.[1] || "",
    subject: title
      .replace(/\.(pdf)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim(),
    examType,
    folder,
    year: yearMatch?.[0] || "",
    month: "",
  };
}

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "SRM-Question-Paper-Finder/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return {
    url: response.url,
    contentType: response.headers.get("content-type") || "",
    body: await response.text()
  };
}

async function discoverPapers() {
  const visited = new Set();
  const queue = [ROOT];
  const papers = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = queue.shift();

    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    let page;

    try {
      page = await fetchPage(currentUrl);
    } catch {
      continue;
    }

    if (!page.contentType.includes("text/html")) {
      continue;
    }

    const $ = cheerio.load(page.body);

    $("a[href]").each((_index, element) => {
      const href = $(element).attr("href");

      if (!href) return;

      let absoluteUrl;

      try {
        absoluteUrl = new URL(href, page.url).href;
      } catch {
        return;
      }

      if (!absoluteUrl.startsWith(ROOT)) return;

      const linkText = $(element).text().replace(/\s+/g, " ").trim();

      if (isQuestionPaper(absoluteUrl, linkText)) {
        const paper = extractPaperInfo(
          linkText,
          absoluteUrl,
          page.url
        );

        papers.push(paper);
        return;
      }

      if (!visited.has(absoluteUrl)) {
        queue.push(absoluteUrl);
      }
    });
  }

  return [
    ...new Map(
      papers.map(paper => [paper.pdfUrl, paper])
    ).values()
  ];
}

export async function searchQuestionPapers(query) {
  const papers = await discoverPapers();

  return papers
    .map(paper => ({
      ...paper,
      _score: scorePaper(paper, query)
    }))
    .filter(paper => paper._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 30)
    .map(({ _score, ...paper }) => paper);
}

export async function refreshIndex() {
  const papers = await discoverPapers();

  return {
    indexed: papers.length,
    papers
  };
}
