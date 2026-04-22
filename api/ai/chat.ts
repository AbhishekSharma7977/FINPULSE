// Vercel Serverless Function — same RAG logic as server.ts
// Vercel automatically serves any file under /api as a serverless endpoint.
// POST /api/ai/chat

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const openRouterClient = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.VITE_OPENROUTER_API_KEY || process.env.OPEN_ROUTER_KEY || ''}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://finpulse-zbdj.vercel.app',
    'X-Title': 'FinPulse AI Dashboard',
  },
});

async function callAI(messages: { role: string; content: string }[]) {
  const response = await openRouterClient.post('/chat/completions', {
    model: 'openai/gpt-oss-20b:free',
    messages,
  });
  return response.data.choices[0].message.content as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, transactions = [], walletBalance = 0, userName = 'User', history = [] } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Build live financial context (RAG)
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalExpense = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const balance = totalIncome - totalExpense;

    const categoryMap: Record<string, number> = {};
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.amount || 0);
      });
    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: $${(amt as number).toFixed(2)}`)
      .join(', ');

    const recentTxContext = transactions
      .slice(0, 15)
      .map(
        (t: any) =>
          `[${t.type?.toUpperCase()}] ${t.category} — $${(t.amount || 0).toFixed(2)} (${t.description || 'no description'})`
      )
      .join('\n');

    const systemPrompt = `You are FinPulse AI, a professional Financial Advisor and Wealth Consultant embedded in the FinPulse AI Dashboard.

You have access to the following LIVE financial data for ${userName}:

📊 FINANCIAL SUMMARY:
• Wallet Balance: $${walletBalance.toFixed(2)}
• Total Income: $${totalIncome.toFixed(2)}
• Total Expenses: $${totalExpense.toFixed(2)}
• Net Balance (Income − Expenses): $${balance.toFixed(2)}
• Savings Rate: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
• Top Spending Categories: ${topCategories || 'No expense data available'}

📋 RECENT TRANSACTIONS (last 15):
${recentTxContext || 'No transactions found.'}

GUIDELINES:
1. Always use the live data above when answering financial questions.
2. Give specific, data-driven advice based on actual numbers.
3. Be friendly, concise, and use bullet points where helpful.
4. Never make up numbers — only reference the data provided.`;

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: prompt },
    ];

    const aiResponse = await callAI(messages);
    return res.status(200).json({ reply: aiResponse });
  } catch (err: any) {
    console.error('AI Chat Error:', err?.response?.data || err.message);
    return res.status(500).json({
      error: 'AI service error',
      detail: err?.response?.data?.error?.message || err.message,
    });
  }
}
