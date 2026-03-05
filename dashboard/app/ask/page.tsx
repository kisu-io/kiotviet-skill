"use client";

import { useState } from "react";
import {
  MessageSquare, Send, Loader2, AlertTriangle, ArrowUpRight,
  TrendingDown, Package, Users, BarChart3, Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function formatVND(n: number) {
  return Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".") + " ₫";
}

const QUESTIONS = [
  {
    label: "Doanh thu hôm qua như thế nào?",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20 hover:border-emerald-400/50",
  },
  {
    label: "Top sản phẩm bán chạy tháng này?",
    icon: TrendingDown,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20 hover:border-blue-400/50",
  },
  {
    label: "Sản phẩm nào có nguy cơ hết hàng?",
    icon: Package,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20 hover:border-amber-400/50",
  },
  {
    label: "Tại sao doanh thu giảm?",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20 hover:border-red-400/50",
  },
  {
    label: "Khách hàng nào đang có nguy cơ?",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20 hover:border-purple-400/50",
  },
];

type Answer = {
  question: string;
  answer: string;
  chart?: { type: string; data: any[] | Record<string, any> } | null;
  actions?: { label: string; href: string }[];
};

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Answer[]>([]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setQuestion(q);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (d.error) {
        setError(d.error);
      } else {
        setResult(d);
        setHistory((prev) => [d, ...prev].slice(0, 5));
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="size-5 text-amber-400" />
          Hỏi Orbit
        </h1>
        <p className="text-sm text-muted-foreground">Đặt câu hỏi về kinh doanh — Orbit trả lời ngay từ dữ liệu KiotViet của bạn</p>
      </div>

      {/* Question chips */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {QUESTIONS.map((q) => (
          <button
            key={q.label}
            onClick={() => ask(q.label)}
            disabled={loading}
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${q.bg} disabled:opacity-50`}
          >
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-current/10`}>
              <q.icon className={`size-4 ${q.color}`} />
            </div>
            <span className="text-sm font-medium leading-tight">{q.label}</span>
          </button>
        ))}
      </div>

      {/* Free-text input */}
      <div className="flex gap-2">
        <Input
          placeholder="Hoặc nhập câu hỏi của bạn..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(question); }}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={() => ask(question)} disabled={loading || !question.trim()} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Hỏi
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-border/50">
          <CardContent className="pt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tìm câu trả lời từ dữ liệu của bạn...
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-400/30">
          <CardContent className="pt-6 flex items-center gap-2 text-red-400">
            <AlertTriangle className="size-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Answer */}
      {result && !loading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              {result.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-line">{result.answer}</p>

            {/* Inline table/data */}
            {result.chart?.type === "table" && Array.isArray(result.chart.data) && result.chart.data.length > 0 && (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(result.chart.data[0])
                        .filter((k) => !["id", "productId", "customerId", "recencyScore", "frequencyScore", "monetaryScore"].includes(k))
                        .slice(0, 5)
                        .map((k) => (
                          <TableHead key={k} className="text-xs">{k}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.chart.data.slice(0, 8).map((row: any, i: number) => (
                      <TableRow key={i}>
                        {Object.entries(row)
                          .filter(([k]) => !["id", "productId", "customerId", "recencyScore", "frequencyScore", "monetaryScore"].includes(k))
                          .slice(0, 5)
                          .map(([k, v]: [string, any]) => (
                            <TableCell key={k} className="text-xs font-mono">
                              {typeof v === "number" && v > 1000 ? formatVND(v) : String(v ?? "—")}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Suggested actions */}
            {result.actions && result.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {result.actions.map((a) => (
                  <Button key={a.href} variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                    <Link href={a.href}>{a.label} <ArrowUpRight className="size-3" /></Link>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Câu hỏi gần đây</p>
          {history.slice(1).map((h, i) => (
            <button
              key={i}
              onClick={() => ask(h.question)}
              className="w-full text-left rounded-lg border border-border/30 p-3 text-sm hover:bg-accent/50 transition-colors"
            >
              <span className="text-muted-foreground mr-2">Q:</span>{h.question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
