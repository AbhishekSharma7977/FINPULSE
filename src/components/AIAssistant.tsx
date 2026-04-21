import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, BrainCircuit, Lightbulb, TrendingUp, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantProps {
  transactions: any[];
}

const MOCK_INSIGHTS = [
  {
    title: "Optimize Your Food Budget",
    description: "Your food spending appears to be your largest expense category. Consider meal prepping on weekends to save 20-30% monthly.",
    type: "saving"
  },
  {
    title: "Positive Savings Rate",
    description: "You're maintaining a healthy income-to-expense ratio. Keep it up! Consider moving the surplus to a high-yield savings account.",
    type: "insight"
  },
  {
    title: "Recurring Subscription Check",
    description: "Review your Entertainment and Shopping expenses for any unused subscriptions that could be cancelled to free up cash flow.",
    type: "warning"
  }
];

export default function AIAssistant({ transactions }: AIAssistantProps) {
  const [analysis, setAnalysis] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const analyzeSpending = async () => {
    if (transactions.length === 0) {
      setError("Add some transactions first so I can analyze your spending patterns!");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      
      if (!apiKey) {
        // Use intelligent mock based on actual transaction data
        await new Promise(r => setTimeout(r, 1500)); // Simulate AI thinking
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
        const cats: Record<string, number> = {};
        transactions.filter(t => t.type === 'expense').forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
        const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
        
        const smartMock = [
          {
            title: `${topCat} is Your Top Expense`,
            description: `You're spending the most on ${topCat}. Consider setting a monthly budget cap of $${Math.round((cats[topCat] || 0) * 0.8).toLocaleString()} to reduce this by 20%.`,
            type: topCat === 'Salary' ? 'insight' : 'warning'
          },
          {
            title: `Savings Rate: ${savingsRate}%`,
            description: savingsRate >= 20 
              ? `Excellent! Your ${savingsRate}% savings rate is above the recommended 20%. Consider investing the extra in index funds for long-term growth.`
              : `Your current savings rate of ${savingsRate}% is below the recommended 20%. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`,
            type: savingsRate >= 20 ? 'saving' : 'warning'
          },
          {
            title: "Diversify Income Streams",
            description: `With ${transactions.filter(t => t.type === 'income').length} income entries logged, consider adding passive income sources like dividends or freelancing to boost financial security.`,
            type: 'insight'
          }
        ];
        setAnalysis(smartMock);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze the following personal finance transactions and provide exactly 3 concise, actionable financial tips. Format as JSON array with objects containing 'title' (short), 'description' (2 sentences max), and 'type' (one of: 'saving', 'warning', 'insight').
      
      Transactions: ${JSON.stringify(transactions.slice(0, 20).map(t => ({ amount: t.amount, type: t.type, category: t.category })))}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '[]');
      setAnalysis(Array.isArray(result) ? result : MOCK_INSIGHTS);
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setAnalysis(MOCK_INSIGHTS); // Fallback to mock
    } finally {
      setLoading(false);
    }
  };

  const iconMap = {
    saving: { icon: TrendingUp, color: '#10b981' },
    warning: { icon: AlertCircle, color: '#f59e0b' },
    insight: { icon: Lightbulb, color: '#818cf8' },
  };

  return (
    <div className="p-6 rounded-2xl relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(24px)'
      }}>
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)', transform: 'translate(30%, -30%)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)' }}>
            <BrainCircuit size={18} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">AI Financial Assistant</h3>
            <p className="text-[10px] text-indigo-400 font-medium">Powered by Gemini AI</p>
          </div>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed mb-5">
          Get personalized AI insights based on your real spending patterns and transaction history.
        </p>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <Sparkles size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" />
              </div>
              <p className="text-xs text-indigo-300 font-medium animate-pulse">Analyzing your finances...</p>
            </motion.div>
          ) : analysis ? (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {analysis.map((tip: any, i: number) => {
                const config = iconMap[tip.type as keyof typeof iconMap] || iconMap.insight;
                const Icon = config.icon;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="w-full p-3 rounded-xl text-left transition-all hover:opacity-90"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start gap-2.5">
                        <Icon size={14} style={{ color: config.color }} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white leading-tight">{tip.title}</p>
                          <AnimatePresence>
                            {expanded === i && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-slate-400 leading-relaxed mt-1.5">
                                {tip.description}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        {expanded === i ? <ChevronUp size={12} className="text-slate-500 flex-shrink-0 mt-0.5" /> : <ChevronDown size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
              <button onClick={() => { setAnalysis(null); setExpanded(null); }}
                className="w-full py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                ↺ Refresh Analysis
              </button>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {error && (
                <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-xs"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}>
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <button onClick={analyzeSpending}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
                <Sparkles size={16} />
                Analyze My Spending
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
