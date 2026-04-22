import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// ─── OpenRouter config (Mistral-7B — same pattern as SafeRoute) ───────────────
const openRouterClient = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.VITE_OPENROUTER_API_KEY || process.env.OPEN_ROUTER_KEY || ""}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://finpulse.ai",
    "X-Title": "FinPulse AI Dashboard",
  },
});

async function callMistral(messages: { role: string; content: string }[]) {
  const response = await openRouterClient.post("/chat/completions", {
    model: "openai/gpt-oss-20b:free",
    messages,
  });
  return response.data.choices[0].message.content as string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ─── POST /api/ai/chat ─────────────────────────────────────────────────────
  // Body: { prompt: string, transactions?: any[], walletBalance?: number, userName?: string }
  // RAG pattern: live financial context is injected into system prompt just like
  // the SafeRoute project injected student records.
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, transactions = [], walletBalance = 0, userName = "User", history = [] } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
      }

      // Build live financial context (same idea as studentContext in SafeRoute)
      const totalIncome = transactions
        .filter((t: any) => t.type === "income")
        .reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalExpense = transactions
        .filter((t: any) => t.type === "expense")
        .reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const balance = totalIncome - totalExpense;

      const categoryMap: Record<string, number> = {};
      transactions
        .filter((t: any) => t.type === "expense")
        .forEach((t: any) => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.amount || 0);
        });
      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
        .join(", ");

      const recentTxContext = transactions
        .slice(0, 15)
        .map(
          (t: any) =>
            `[${t.type?.toUpperCase()}] ${t.category} — $${(t.amount || 0).toFixed(2)} (${t.description || "no description"})`
        )
        .join("\n");

      // System prompt — mirrors SafeRoute's role-based prompt
      const systemPrompt = `You are FinPulse AI, a professional Financial Advisor and Wealth Consultant embedded in the FinPulse AI Dashboard.

You have access to the following LIVE financial data for ${userName}:

📊 FINANCIAL SUMMARY:
• Wallet Balance: $${walletBalance.toFixed(2)}
• Total Income: $${totalIncome.toFixed(2)}
• Total Expenses: $${totalExpense.toFixed(2)}
• Net Balance (Income − Expenses): $${balance.toFixed(2)}
• Savings Rate: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
• Top Spending Categories: ${topCategories || "No expense data available"}

📋 RECENT TRANSACTIONS (last 15):
${recentTxContext || "No transactions found."}

GUIDELINES:
1. If the user asks about their finances, always use the live data above.
2. Provide specific, data-driven advice based on their actual numbers.
3. If asked about a category or transaction, reference the real data.
4. Give actionable, professional financial advice in a friendly tone.
5. Keep responses concise and use bullet points where helpful.
6. If data is insufficient, politely mention what information would help.
7. Never make up numbers — only reference the data provided above.`;

      // Build message array (with optional conversation history for context)
      const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
        // Previous turns (limited to last 6 for context window)
        ...history.slice(-6),
        { role: "user", content: prompt },
      ];

      const aiResponse = await callMistral(messages);
      return res.json({ reply: aiResponse });
    } catch (err: any) {
      console.error("AI Chat Error:", err?.response?.data || err.message);
      return res.status(500).json({
        error: "AI service error",
        detail: err?.response?.data?.error?.message || err.message,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
