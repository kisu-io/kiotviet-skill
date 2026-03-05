"use client";

import { useEffect, useState } from "react";
import {
  Package, Search, Loader2, AlertTriangle, Download, RefreshCw,
  TrendingDown, Clock, CheckCircle2,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

function stockBadge(onHand: number) {
  if (onHand <= 0) return <Badge variant="destructive">Hết hàng</Badge>;
  if (onHand <= 5) return <Badge variant="destructive">Thấp</Badge>;
  if (onHand <= 10) return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Cẩn thận</Badge>;
  return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Đủ</Badge>;
}

type Product = {
  id: number; code: string; name: string; category: string;
  unit: string; onHand: number; cost: number; price: number;
};

type RestockItem = {
  productId: number; productCode: string; productName: string; categoryName: string;
  onHand: number; avgDailySales: number; daysUntilStockout: number;
  suggestedOrderQty: number; priority: string; last30DaysRevenue: number;
};

type DeadStockItem = {
  productId: number; productCode: string; productName: string; categoryName: string;
  onHand: number; daysSinceLastSale: number;
};

type RestockData = {
  recommendations: RestockItem[];
  deadStock: DeadStockItem[];
  summary: { critical: number; warning: number; deadStock: number };
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [restockData, setRestockData] = useState<RestockData | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingRestock, setLoadingRestock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Replenishment: per-row qty overrides + excluded set
  const [qtyOverrides, setQtyOverrides] = useState<Record<number, number>>({});
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [approved, setApproved] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setProducts(d.products); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingStock(false));
  }, []);

  function loadRestock() {
    setLoadingRestock(true);
    fetch("/api/inventory/replenishment")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setRestockData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingRestock(false));
  }

  function getQty(item: RestockItem) {
    return qtyOverrides[item.productId] ?? item.suggestedOrderQty;
  }

  function exportCSV() {
    if (!restockData) return;
    const rows = restockData.recommendations
      .filter((r) => !excluded.has(r.productId))
      .map((r) => [r.productCode, r.productName, r.onHand, r.avgDailySales.toFixed(2), getQty(r), r.priority].join(","));
    const csv = ["Mã SP,Tên sản phẩm,Tồn kho,Bán TB/ngày,SL đề xuất nhập,Mức độ", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `de-xuat-nhap-hang-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function approveAll() {
    if (!restockData) return;
    const ids = restockData.recommendations.filter((r) => !excluded.has(r.productId)).map((r) => r.productId);
    setApproved(new Set([...approved, ...ids]));
  }

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

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );
  const totalValue = filtered.reduce((s, p) => s + p.onHand * p.cost, 0);
  const totalItems = filtered.reduce((s, p) => s + p.onHand, 0);
  const lowCount = filtered.filter((p) => p.onHand <= 10).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Tổng sản phẩm</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalItems} đơn vị trong kho</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Giá trị tồn kho</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">theo giá vốn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cần nhập thêm</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{lowCount}</div>
            <p className="text-xs text-muted-foreground mt-1">sản phẩm tồn kho thấp</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Tồn kho</TabsTrigger>
          <TabsTrigger value="restock" onClick={() => { if (!restockData && !loadingRestock) loadRestock(); }}>
            Đề xuất nhập hàng
            {restockData && restockData.summary.critical > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0">{restockData.summary.critical}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dead" onClick={() => { if (!restockData && !loadingRestock) loadRestock(); }}>
            Hàng tồn lâu
          </TabsTrigger>
        </TabsList>

        {/* Stock list */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Package className="size-4" /> Danh sách sản phẩm</CardTitle>
                  <CardDescription>Tồn kho hiện tại của tất cả sản phẩm</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input placeholder="Tìm sản phẩm..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {loadingStock ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang tải kho hàng...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Mã SP</TableHead>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>ĐVT</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Giá vốn</TableHead>
                      <TableHead className="text-right">Giá bán</TableHead>
                      <TableHead className="text-right pr-6">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không tìm thấy sản phẩm</TableCell></TableRow>
                    ) : filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6 font-mono text-xs">{p.code}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                        <TableCell className="text-right font-mono">{p.onHand}</TableCell>
                        <TableCell className="text-right font-mono">{formatVND(p.cost)}</TableCell>
                        <TableCell className="text-right font-mono">{formatVND(p.price)}</TableCell>
                        <TableCell className="text-right pr-6">{stockBadge(p.onHand)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replenishment suggestions */}
        <TabsContent value="restock">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="size-4 text-amber-400" />
                    Đề xuất nhập hàng
                  </CardTitle>
                  <CardDescription>Dựa trên vận tốc bán hàng 30 ngày gần nhất</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadRestock} disabled={loadingRestock} className="gap-1.5">
                    <RefreshCw className={`size-3.5 ${loadingRestock ? "animate-spin" : ""}`} />
                    Làm mới
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCSV} disabled={!restockData} className="gap-1.5">
                    <Download className="size-3.5" />
                    Xuất CSV
                  </Button>
                  <Button size="sm" onClick={approveAll} disabled={!restockData} className="gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    Duyệt tất cả
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {loadingRestock ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang phân tích nhu cầu...
                </div>
              ) : !restockData ? (
                <p className="text-center text-muted-foreground py-8">Nhấn tab để tải đề xuất</p>
              ) : restockData.recommendations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">✅ Không có sản phẩm nào cần nhập thêm</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Sản phẩm</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Bán TB/ngày</TableHead>
                      <TableHead className="text-right">Hết sau (ngày)</TableHead>
                      <TableHead className="text-right">SL đề xuất</TableHead>
                      <TableHead className="text-right pr-6">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restockData.recommendations.map((r) => {
                      const isExcluded = excluded.has(r.productId);
                      const isApproved = approved.has(r.productId);
                      return (
                        <TableRow key={r.productId} className={isExcluded ? "opacity-40" : ""}>
                          <TableCell className="pl-6">
                            <div className="font-medium text-sm">{r.productName}</div>
                            <div className="text-xs text-muted-foreground">{r.productCode} · {r.categoryName}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{r.onHand}</TableCell>
                          <TableCell className="text-right font-mono">{r.avgDailySales.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={r.daysUntilStockout <= 3 ? "text-red-400 font-semibold" : r.daysUntilStockout <= 7 ? "text-amber-400" : ""}>
                              {r.daysUntilStockout === Infinity ? "∞" : r.daysUntilStockout.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="w-20 font-mono text-center h-7 text-xs ml-auto"
                              value={getQty(r)}
                              onChange={(e) => setQtyOverrides((prev) => ({ ...prev, [r.productId]: parseInt(e.target.value) || 0 }))}
                              disabled={isExcluded || isApproved}
                            />
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {isApproved ? (
                              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 gap-1 cursor-default">
                                <CheckCircle2 className="size-3" /> Đã duyệt
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={r.priority === "critical" ? "text-red-400 border-red-400/30" : "text-amber-400 border-amber-400/30"}
                                >
                                  {r.priority === "critical" ? "Cấp bách" : "Cần nhập"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-muted-foreground px-2"
                                  onClick={() => setExcluded((prev) => {
                                    const s = new Set(prev);
                                    if (s.has(r.productId)) s.delete(r.productId); else s.add(r.productId);
                                    return s;
                                  })}
                                >
                                  {isExcluded ? "Khôi phục" : "Bỏ qua"}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead stock */}
        <TabsContent value="dead">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Hàng tồn lâu (Dead Stock)
              </CardTitle>
              <CardDescription>Sản phẩm còn hàng nhưng không bán được trong 60 ngày</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {loadingRestock ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang phân tích...
                </div>
              ) : !restockData ? (
                <p className="text-center text-muted-foreground py-8">Nhấn tab "Đề xuất nhập hàng" để tải dữ liệu</p>
              ) : restockData.deadStock.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">✅ Không có hàng tồn lâu</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Sản phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right pr-6">Không bán (ngày)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restockData.deadStock.map((d) => (
                      <TableRow key={d.productId}>
                        <TableCell className="pl-6">
                          <div className="font-medium text-sm">{d.productName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{d.productCode}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{d.categoryName}</TableCell>
                        <TableCell className="text-right font-mono">{d.onHand}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className="text-muted-foreground">{d.daysSinceLastSale}+ ngày</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
