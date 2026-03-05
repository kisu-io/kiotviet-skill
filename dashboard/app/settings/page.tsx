"use client";

import { useEffect, useState } from "react";
import { Settings, Store, Key, Bell, Database, Save, Loader2, AlertTriangle, CheckCircle2, Wifi, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type SettingsData = {
  shopId: string;
  retailer: string;
  branchId: string | null;
  clientId: string;
  clientSecret: string;
  tokenValid: boolean;
  tokenExpiry: string;
  channels: any;
  workflows: any;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [channelResult, setChannelResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Editable fields
  const [retailer, setRetailer] = useState("");
  const [branchId, setBranchId] = useState("");
  const [autoCreatePO, setAutoCreatePO] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [restockCoverDays, setRestockCoverDays] = useState(14);
  const [overdueInvoiceDays, setOverdueInvoiceDays] = useState(7);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setRetailer(d.retailer || "");
        setBranchId(d.branchId || "");
        setAutoCreatePO(d.workflows?.autoCreatePO ?? false);
        setLowStockThreshold(d.workflows?.lowStockThreshold ?? 10);
        setRestockCoverDays(d.workflows?.restockCoverDays ?? 14);
        setOverdueInvoiceDays(d.workflows?.overdueInvoiceDays ?? 7);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailer,
          branchId: branchId || null,
          workflows: {
            autoCreatePO,
            lowStockThreshold,
            restockCoverDays,
            overdueInvoiceDays,
          },
        }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else setSaved(true);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
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

  if (loading || !data) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 max-w-3xl">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 max-w-3xl">
      {/* Shop info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="size-4" />
            Thông tin cửa hàng
          </CardTitle>
          <CardDescription>Cấu hình cửa hàng KiotViet của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Shop ID</label>
            <Input value={data.shopId} readOnly className="font-mono" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Retailer</label>
            <Input value={retailer} onChange={(e) => setRetailer(e.target.value)} className="font-mono" placeholder="your-retailer-name" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Chi nhánh mặc định</label>
            <Input value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="ID chi nhánh (để trống = tất cả)" className="font-mono" />
          </div>
        </CardContent>
      </Card>

      {/* API credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="size-4" />
            API Credentials
          </CardTitle>
          <CardDescription>Thông tin xác thực KiotViet API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Client ID</label>
            <Input type="password" value={data.clientId} readOnly className="font-mono" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Client Secret</label>
            <Input type="password" value={data.clientSecret} readOnly className="font-mono" />
          </div>
          <div className="flex items-center gap-3">
            {data.tokenValid ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Token hợp lệ</Badge>
            ) : (
              <Badge variant="outline" className="text-red-400 border-red-400/30">Token hết hạn</Badge>
            )}
            {data.tokenExpiry && (
              <span className="text-xs text-muted-foreground">Hết hạn: {data.tokenExpiry}</span>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={testingConn}
              onClick={async () => {
                setTestingConn(true);
                setConnResult(null);
                try {
                  const r = await fetch("/api/test-connection", { method: "POST" });
                  setConnResult(await r.json());
                } catch (e: any) {
                  setConnResult({ success: false, error: e.message });
                }
                setTestingConn(false);
              }}
              className="gap-1.5"
            >
              {testingConn ? <Loader2 className="size-3.5 animate-spin" /> : <Wifi className="size-3.5" />}
              Test kết nối
            </Button>
            {connResult && (
              <span className={`text-xs flex items-center gap-1 ${connResult.success ? "text-emerald-400" : "text-red-400"}`}>
                {connResult.success ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                {connResult.success ? connResult.message : connResult.error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="size-4" />
            Cài đặt quy trình
          </CardTitle>
          <CardDescription>Tuỳ chỉnh hành vi của các quy trình tự động</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Tự động tạo phiếu nhập hàng</div>
              <div className="text-xs text-muted-foreground">Tạo PO tự động khi sản phẩm sắp hết hàng (cấp bách)</div>
            </div>
            <Switch checked={autoCreatePO} onCheckedChange={setAutoCreatePO} />
          </div>
          <Separator />
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ngưỡng tồn kho thấp</label>
            <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)} className="font-mono w-32" />
            <span className="text-xs text-muted-foreground">Cảnh báo khi tồn kho dưới số này</span>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Số ngày dự trữ</label>
            <Input type="number" value={restockCoverDays} onChange={(e) => setRestockCoverDays(parseInt(e.target.value) || 14)} className="font-mono w-32" />
            <span className="text-xs text-muted-foreground">Số lượng nhập đề xuất đủ cho N ngày bán hàng</span>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ngưỡng nhắc nợ (ngày)</label>
            <Input type="number" value={overdueInvoiceDays} onChange={(e) => setOverdueInvoiceDays(parseInt(e.target.value) || 7)} className="font-mono w-32" />
            <span className="text-xs text-muted-foreground">Nhắc nợ hoá đơn khi quá hạn N ngày</span>
          </div>
        </CardContent>
      </Card>

      {/* Channel testing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="size-4" />
            Test kênh gửi
          </CardTitle>
          <CardDescription>Gửi tin nhắn test qua kênh đã cấu hình</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {["discord", "telegram"].map((ch) => (
              <Button
                key={ch}
                variant="outline"
                size="sm"
                disabled={testingChannel === ch}
                onClick={async () => {
                  setTestingChannel(ch);
                  setChannelResult(null);
                  try {
                    const r = await fetch("/api/test-channel", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ channel: ch }),
                    });
                    setChannelResult(await r.json());
                  } catch (e: any) {
                    setChannelResult({ success: false, error: e.message });
                  }
                  setTestingChannel(null);
                }}
                className="gap-1.5"
              >
                {testingChannel === ch ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Test {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </Button>
            ))}
          </div>
          {channelResult && (
            <p className={`text-xs flex items-center gap-1 ${channelResult.success ? "text-emerald-400" : "text-red-400"}`}>
              {channelResult.success ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              {channelResult.success ? channelResult.message : channelResult.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data paths */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="size-4" />
            Dữ liệu
          </CardTitle>
          <CardDescription>Thông tin về token cache và dữ liệu cục bộ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Token cache</span>
            <span className="font-mono text-xs">shops/.tokens/{data.shopId}.json</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shop config</span>
            <span className="font-mono text-xs">shops/{data.shopId}.json</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cron jobs</span>
            <span className="font-mono text-xs">cron/jobs.json</span>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Lưu cài đặt
        </Button>
        {saved && (
          <span className="text-sm text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            Đã lưu thành công
          </span>
        )}
      </div>
    </div>
  );
}
