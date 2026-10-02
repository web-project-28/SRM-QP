import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = "https://intranet.srmap.edu.in/";
const DATA_DIR = path.resolve("data");
const INDEX_FILE = path.join(DATA_DIR, "papers.json");

// IMPORTANT:
// This prototype only indexes documents/pages that are publicly accessible
// from the SRM AP intranet. It does not bypass login, CAPTCHA, permissions,
// robots restrictions, or access controls.

async function loadIndex() {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, "utf8"));
  } catch {
    return [];
  }
}

function tokenize(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scorePaper(paper, query) {
  const q = tokenize(query);
  const haystack = tokenize([
    paper.title, paper.subject, paper.branch, paper.semester,
    paper.year, paper.examType, paper.text
  ].join(" "));

  let score = 0;
  for (const token of q) {
    if (haystack.includes(token)) score += 2;
    else if (haystack.some(x => x.includes(token))) score += 1;
  }

  // Question-paper intent gets a small boost.
  if (/(question|paper|qp|mid|midterm|end.?sem|exam)/i.test(query)) score += 1;
  return score;
}

export async function searchQuestionPapers(query) {
  const index = await loadIndex();
  return index
    .map(p => ({ ...p, _score: scorePaper(p, query) }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 20)
    .map(({ _score, text, ...p }) => p);
}

/*
 * Simple public-document crawler.
 * Start from the SRM intranet root and follow same-host HTML links.
 * For a production deployment, replace this with a controlled sitemap/
 * document-index job and respect SRM's published access rules.
 */
export async function refreshIndex() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const visited = new Set();
  const queue = [ROOT];
  const papers = [];
  const MAX_PAGES = Number(process.env.MAX_PAGES || 40);

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let response;
    try {
      response = await fetch(url, { redirect: "follow" });
      if (!response.ok) continue;
    } catch {
      continue;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/pdf")) {
      papers.push({
        title: decodeURIComponent(url.split("/").pop() || "SRM AP PDF"),
        pdfUrl: url,
        sourceUrl: url,
        subject: "",
        branch: "",
        semester: "",
        year: "",
        examType: "",
        text: url
      });
      continue;
    }

    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("a[href]").each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      let absolute;
      try { absolute = new URL(href, url).href; } catch { return; }
      if (!absolute.startsWith(ROOT)) return;

      const lower = absolute.toLowerCase();
      const label = $(el).text().trim();

      if (lower.endsWith(".pdf")) {
        if (/(question|paper|mid|exam|test)/i.test(`${absolute} ${label}`)) {
          papers.push({
            title: label || decodeURIComponent(absolute.split("/").pop() || "Question Paper"),
            pdfUrl: absolute,
            sourceUrl: url,
            subject: "",
            branch: "",
            semester: "",
            year: "",
            examType: "",
            text: `${label} ${absolute}`
          });
        }
      } else if (!visited.has(absolute)) {
        queue.push(absolute);
      }
    });
  }

  // De-duplicate by PDF URL.
  const unique = [...new Map(papers.map(p => [p.pdfUrl, p])).values()];
  await fs.writeFile(INDEX_FILE, JSON.stringify(unique, null, 2));

  return {
    indexed: unique.length,
    pagesVisited: visited.size,
    note: "Only publicly accessible, same-host documents discovered by the crawler are indexed."
  };
}