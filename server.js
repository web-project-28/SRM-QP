import express from "express";
import cors from "cors";
import { searchQuestionPapers, refreshIndex } from "./search.js";

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "SRM AP Question Paper Finder" });
});

app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const results = await searchQuestionPapers(q);
    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Manual refresh endpoint for the prototype.
// Keep this disabled in production or protect it with authentication.
app.post("/api/admin/refresh", async (_req, res) => {
  try {
    const result = await refreshIndex();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Refresh failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});