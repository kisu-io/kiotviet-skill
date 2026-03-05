"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Play,
  BarChart3,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

/** Format number as Vietnamese currency */
function formatVND(n: number) {
  return Math.round(n)
    .toLocaleString("vi-VN")
    .replace(/,/g, ".")
    .concat(" ₫");
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function TrendIcon({ change }: { change: number }) {
  if (change > 0)
    return <TrendingUp className="size-3.5 text-emerald-400" />;
  if (change < 0)
    return <TrendingDown className="size-3.5 text-red-400" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

type OverviewData = {
  kpiCards: {
    todayRevenue: number;
    todayOrders: number;
    weekRevenue: number;
    weekRevenueChange: number;
    monthRevenue: number;
    monthRevenueChange: number;
    lowStockCount: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    id: string;
    customer: string;
    total: number;
    status: string;
    time: string;
  }[];
  lowStockProducts: {
    id: number;
    code: string;
    name: string;
    category: string;
    onHand: number;
    priority: string;
  }[];
};

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  const { kpiCards, revenueByDay, recentOrders, lowStockProducts } = data;
  const weekChange = kpiCards.weekRevenueChange ?? 0;

  const stats = [
    {
      title: "Doanh thu hôm nay",
      value: formatVND(kpiCards.todayRevenue),
      change: weekChange,
      icon: DollarSign,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      title: "Đơn hàng hôm nay",
      value: String(kpiCards.todayOrders),
      change: 0,
      icon: ShoppingCart,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      title: "Sản phẩm sắp hết",
      value: String(kpiCards.lowStockCount),
      change: kpiCards.lowStockCount > 0 ? -1 : 0,
      icon: Package,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
    {
      title: "Doanh thu tuần",
      value: formatVND(kpiCards.weekRevenue),
      change: weekChange,
      icon: BarChart3,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  return (
    <motion.div
      className="flex flex-col gap-6 p-4 md:p-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="glass-card border-border/50 hover:border-border transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon change={stat.change} />
                      <span
                        className={
                          stat.change > 0
                            ? "text-emerald-400"
                            : stat.change < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                        }
                      >
                        {stat.change !== 0
                          ? `${stat.change > 0 ? "+" : ""}${stat.change}%`
                          : "—"}
                      </span>
                      <span className="text-muted-foreground">vs tuần trước</span>
                    </div>
                  </div>
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${stat.bgColor}`}
                  >
                    <stat.icon className={`size-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue Chart */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold">
                  Doanh thu tuần
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  7 ngày gần nhất
                </p>
              </div>
              {weekChange !== 0 && (
                <Badge
                  variant="secondary"
                  className={`gap-1 ${weekChange >= 0 ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-red-400 border-red-400/20 bg-red-400/10"}`}
                >
                  {weekChange >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {weekChange > 0 ? "+" : ""}{weekChange}%
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByDay}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="oklch(0.65 0.2 145)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.65 0.2 145)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.25 0.005 260)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "oklch(0.6 0 0)" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
                      tickFormatter={(v) =>
                        `${(v / 1_000_000).toFixed(0)}M`
                      }
                      width={40}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.17 0.005 260)",
                        border: "1px solid oklch(0.25 0.008 260)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "oklch(0.97 0 0)",
                      }}
                      formatter={(value: number) => [
                        formatVND(value),
                        "",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="oklch(0.65 0.2 145)"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Doanh thu"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Hoạt động gần đây
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  Xem tất cả
                  <ArrowUpRight className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentOrders.length === 0 && lowStockProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Chưa có hoạt động hôm nay
                </p>
              ) : (
                <>
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400">
                        <ShoppingCart className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {order.id} — {order.customer}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.time}
                        </p>
                      </div>
                      {order.total > 0 && (
                        <span className="text-xs font-semibold text-emerald-400">
                          +{formatVND(order.total)}
                        </span>
                      )}
                    </div>
                  ))}
                  {lowStockProducts.length > 0 && recentOrders.length > 0 && (
                    <div className="border-t border-border/30 my-1" />
                  )}
                  {lowStockProducts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                        <AlertTriangle className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Còn {p.onHand} — {p.priority === "critical" ? "Cấp bách" : "Cảnh báo"}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Thao tác nhanh:
              </span>
              <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
                <Play className="size-3" />
                Chạy Báo cáo sáng
              </Button>
              <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
                <Package className="size-3" />
                Kiểm tra tồn kho
              </Button>
              <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
                <BarChart3 className="size-3" />
                Phân tích doanh thu
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
