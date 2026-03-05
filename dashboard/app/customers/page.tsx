"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, AlertTriangle, Crown, Heart, AlertCircle, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

type Segment = {
  customerId: number;
  customerName: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmAvg: number;
  segment: string;
};

type SegmentsData = {
  segments: {
    champions: Segment[];
    loyal: Segment[];
    atRisk: Segment[];
    lost: Segment[];
  };
  summary: {
    totalCustomers: number;
    champions: number;
    loyal: number;
    atRisk: number;
    lost: number;
  };
};

const SEGMENT_CONFIG = {
  champions: { label: "Champions", icon: Crown, color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/30" },
  loyal: { label: "Trung thành", icon: Heart, color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-400/30" },
  atRisk: { label: "Có nguy cơ", icon: AlertCircle, color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/30" },
  lost: { label: "Đã mất", icon: UserX, color: "text-red-400", bgColor: "bg-red-400/10", borderColor: "border-red-400/30" },
} as const;

export default function CustomersPage() {
  const [data, setData] = useState<SegmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customers/segments")
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang phân tích khách hàng...
        </div>
      </div>
    );
  }

  const { segments, summary } = data;
  const total = summary.totalCustomers || 1;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Segment summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(SEGMENT_CONFIG) as [keyof typeof SEGMENT_CONFIG, typeof SEGMENT_CONFIG[keyof typeof SEGMENT_CONFIG]][]).map(([key, cfg]) => {
          const count = summary[key] || 0;
          const pct = Math.round((count / total) * 100);
          const Icon = cfg.icon;
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardDescription className={`flex items-center gap-2 ${cfg.color}`}>
                  <Icon className="size-3.5" />
                  {cfg.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <Progress value={pct} className="mt-2 h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{pct}% tổng khách hàng</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Segment tables */}
      {(Object.entries(SEGMENT_CONFIG) as [keyof typeof SEGMENT_CONFIG, typeof SEGMENT_CONFIG[keyof typeof SEGMENT_CONFIG]][]).map(([key, cfg]) => {
        const list = segments[key] || [];
        if (list.length === 0) return null;
        const Icon = cfg.icon;
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className={`text-sm flex items-center gap-2 ${cfg.color}`}>
                <Icon className="size-4" />
                {cfg.label} ({list.length})
              </CardTitle>
              <CardDescription>RFM phân tích 90 ngày gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Khách hàng</TableHead>
                    <TableHead className="text-right">Lần cuối (ngày)</TableHead>
                    <TableHead className="text-right">Số đơn</TableHead>
                    <TableHead className="text-right">Tổng chi</TableHead>
                    <TableHead className="text-right pr-6">RFM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.slice(0, 10).map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="pl-6 font-medium">{c.customerName}</TableCell>
                      <TableCell className="text-right font-mono">{c.recency}</TableCell>
                      <TableCell className="text-right font-mono">{c.frequency}</TableCell>
                      <TableCell className="text-right font-mono">{formatVND(c.monetary)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className={`${cfg.color} ${cfg.borderColor}`}>
                          {c.rfmAvg}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {list.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ... và {list.length - 10} khách hàng khác
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
