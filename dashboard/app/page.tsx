"use client";

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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// --- Mock data for demo ---
const stats = [
  {
    title: "Doanh thu hôm nay",
    value: formatVND(12_450_000),
    change: +8.2,
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  {
    title: "Đơn hàng",
    value: "34",
    change: +12.5,
    icon: ShoppingCart,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    title: "Sản phẩm sắp hết",
    value: "7",
    change: -2,
    icon: Package,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    title: "Cảnh báo",
    value: "3",
    change: 0,
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
];

const weeklyRevenue = [
  { day: "T2", revenue: 8_200_000, previous: 7_800_000 },
  { day: "T3", revenue: 9_100_000, previous: 8_500_000 },
  { day: "T4", revenue: 7_600_000, previous: 9_200_000 },
  { day: "T5", revenue: 11_300_000, previous: 8_900_000 },
  { day: "T6", revenue: 12_450_000, previous: 10_100_000 },
  { day: "T7", revenue: 14_800_000, previous: 12_300_000 },
  { day: "CN", revenue: 10_200_000, previous: 11_000_000 },
];

const recentActivity = [
  {
    id: 1,
    type: "order",
    text: "Đơn hàng #4521 — 3 sản phẩm",
    amount: "450.000 ₫",
    time: "5 phút trước",
  },
  {
    id: 2,
    type: "alert",
    text: "Áo thun Basic White — còn 3 cái",
    amount: null,
    time: "12 phút trước",
  },
  {
    id: 3,
    type: "order",
    text: "Đơn hàng #4520 — 1 sản phẩm",
    amount: "890.000 ₫",
    time: "28 phút trước",
  },
  {
    id: 4,
    type: "workflow",
    text: "Smart Restock đã tạo đề xuất PO",
    amount: null,
    time: "1 giờ trước",
  },
  {
    id: 5,
    type: "order",
    text: "Đơn hàng #4519 — 5 sản phẩm",
    amount: "2.150.000 ₫",
    time: "2 giờ trước",
  },
];

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

export default function OverviewPage() {
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
                        {stat.change > 0 ? "+" : ""}
                        {stat.change}%
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
                  So sánh tuần này với tuần trước
                </p>
              </div>
              <Badge
                variant="secondary"
                className="gap-1 text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
              >
                <TrendingUp className="size-3" />
                +12.3%
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyRevenue}>
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
                      <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="oklch(0.5 0 0)"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.5 0 0)"
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
                      dataKey="day"
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
                      dataKey="previous"
                      stroke="oklch(0.45 0 0)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="url(#colorPrevious)"
                      name="Tuần trước"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="oklch(0.65 0.2 145)"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Tuần này"
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
              {recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${a.type === "order"
                        ? "bg-blue-400/10 text-blue-400"
                        : a.type === "alert"
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-emerald-400/10 text-emerald-400"
                      }`}
                  >
                    {a.type === "order" ? (
                      <ShoppingCart className="size-3.5" />
                    ) : a.type === "alert" ? (
                      <AlertTriangle className="size-3.5" />
                    ) : (
                      <BarChart3 className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{a.text}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.time}
                    </p>
                  </div>
                  {a.amount && (
                    <span className="text-xs font-semibold text-emerald-400">
                      +{a.amount}
                    </span>
                  )}
                </div>
              ))}
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
