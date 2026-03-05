"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Loader2, AlertTriangle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Hoàn thành</Badge>;
    case "pending":
      return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Chờ xử lý</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Đã huỷ</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

type Order = {
  id: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  status: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setOrders(d.orders);
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải đơn hàng...
        </div>
      </div>
    );
  }

  const completed = orders.filter((o) => o.status === "completed");
  const pending = orders.filter((o) => o.status === "pending");
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng đơn hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Doanh thu (hoàn thành)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chờ xử lý</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{pending.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="size-4" />
            Đơn hàng & Hoá đơn
          </CardTitle>
          <CardDescription>Đơn hàng 7 ngày gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Tất cả ({orders.length})</TabsTrigger>
              <TabsTrigger value="completed">Hoàn thành ({completed.length})</TabsTrigger>
              <TabsTrigger value="pending">Chờ xử lý ({pending.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <OrderTable orders={orders} />
            </TabsContent>
            <TabsContent value="completed">
              <OrderTable orders={completed} />
            </TabsContent>
            <TabsContent value="pending">
              <OrderTable orders={pending} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Không có đơn hàng</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã đơn</TableHead>
          <TableHead>Ngày</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead className="text-right">SP</TableHead>
          <TableHead className="text-right">Tổng tiền</TableHead>
          <TableHead className="text-right">Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-mono text-xs">{o.id}</TableCell>
            <TableCell className="text-muted-foreground">{o.date}</TableCell>
            <TableCell className="font-medium">{o.customer}</TableCell>
            <TableCell className="text-right font-mono">{o.items}</TableCell>
            <TableCell className="text-right font-mono">{formatVND(o.total)}</TableCell>
            <TableCell className="text-right">{statusBadge(o.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
