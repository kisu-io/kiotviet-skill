"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  BarChart3, Loader2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
} from "recharts";

function formatVND(n: number) {
  return Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".") + " ₫";
}

type RevenueData = {
  range: number;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    revenueChange: number;
    prevRevenue: number;
  };
  chartData: { date: string; revenue: number; orders: number; avgOrderValue: number }[];
  byBranch: { branch: string; revenue: number; orders: number; avgOrderValue: number; margin: number }[];
  topProducts: { id: number; name: string; category: string; revenue: number; unitsSold: number; margin: number }[];
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function RevenuePage() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((r: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/revenue?range=${r}`)
      .then((res) => res.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-400 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
        </div>
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu doanh thu...
        </div>
      </div>
    );
  }

  const { summary, chartData, byBranch, topProducts } = data;

  return (
    <motion.div className="flex flex-1 flex-col gap-6 p-4 md:p-6" variants={container} initial="hidden" animate="show">
      {/* Header + range filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Doanh thu</h1>
          <p className="text-sm text-muted-foreground">Phân tích doanh thu theo thời gian và sản phẩm</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v)}>
          <TabsList>
            <TabsTrigger value="7">7 ngày</TabsTrigger>
            <TabsTrigger value="30">30 ngày</TabsTrigger>
            <TabsTrigger value="90">90 ngày</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI cards */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Tổng doanh thu",
            value: formatVND(summary.totalRevenue),
            change: summary.revenueChange,
            icon: DollarSign,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
          {
            title: "Tổng đơn hàng",
            value: String(summary.totalOrders),
            change: null,
            icon: ShoppingCart,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
          },
          {
            title: "AOV trung bình",
            value: formatVND(summary.avgOrderValue),
            change: null,
            icon: BarChart3,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
          },
          {
            title: "Kỳ trước",
            value: formatVND(summary.prevRevenue),
            change: null,
            icon: TrendingUp,
            color: "text-muted-foreground",
            bg: "bg-muted/30",
          },
        ].map((card) => (
          <Card key={card.title} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  {card.change !== null && (
                    <div className="flex items-center gap-1 text-xs">
                      {card.change > 0 ? (
                        <TrendingUp className="size-3 text-emerald-400" />
                      ) : card.change < 0 ? (
                        <TrendingDown className="size-3 text-red-400" />
                      ) : null}
                      <span className={card.change >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {card.change > 0 ? "+" : ""}{card.change}%
                      </span>
                      <span className="text-muted-foreground">vs kỳ trước</span>
                    </div>
                  )}
                </div>
                <div className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={`size-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Revenue chart */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Biểu đồ doanh thu</CardTitle>
            <CardDescription>{range} ngày gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 260)" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.17 0.005 260)", border: "1px solid oklch(0.25 0.008 260)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.97 0 0)" }}
                    formatter={(value: number) => [formatVND(value), ""]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.65 0.2 145)" strokeWidth={2} fill="url(#revGrad)" name="Doanh thu" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top products + By branch */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Top sản phẩm</CardTitle>
              <CardDescription>Theo doanh thu trong {range} ngày</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">SL bán</TableHead>
                    <TableHead className="text-right pr-6">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
                  ) : topProducts.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.category}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatVND(p.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{p.unitsSold}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className={p.margin >= 20 ? "text-emerald-400 border-emerald-400/30" : "text-muted-foreground"}>
                          {p.margin}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* By branch */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Theo chi nhánh</CardTitle>
              <CardDescription>Doanh thu, đơn hàng, AOV trong {range} ngày</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Chi nhánh</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Đơn</TableHead>
                    <TableHead className="text-right">AOV</TableHead>
                    <TableHead className="text-right pr-6">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byBranch.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
                  ) : byBranch.map((b) => (
                    <TableRow key={b.branch}>
                      <TableCell className="pl-6 font-medium text-sm">{b.branch}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatVND(b.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{b.orders}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatVND(b.avgOrderValue)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className={b.margin >= 20 ? "text-emerald-400 border-emerald-400/30" : "text-muted-foreground"}>
                          {b.margin}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
