"use client";

import { useEffect, useState } from "react";
import {
  Settings, Store, Key, Bell, Database, Save, Loader2, AlertTriangle,
  CheckCircle2, Wifi, Send, Plug, RefreshCw,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
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
  isConfigured: boolean;
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok?: boolean; synced?: number; error?: string } | null>(null);
  const [cacheEntries, setCacheEntries] = useState<any[]>([]);

  // Editable fields
  const [retailer, setRetailer] = useState("");
  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [autoCreatePO, setAutoCreatePO] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [restockCoverDays, setRestockCoverDays] = useState(14);
  const [overdueInvoiceDays, setOverdueInvoiceDays] = useState(7);

  function loadCacheStatus() {
    fetch("/api/sync")
      .then((r) => r.json())
      .then((d) => { if (d.entries) setCacheEntries(d.entries); })
      .catch(() => {});
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch("/api/sync", { method: "POST" });
      const d = await r.json();
      setSyncResult(d);
      loadCacheStatus();
    } catch (e: any) {
      setSyncResult({ error: e.message });
    }
    setSyncing(false);
  }

  function loadSettings() {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setRetailer(d.retailer || "");
        setBranchId(d.branchId || "");
        setClientId(d.clientId || "");
        setClientSecret(d.clientSecret || "");
        setAutoCreatePO(d.workflows?.autoCreatePO ?? false);
        setLowStockThreshold(d.workflows?.lowStockThreshold ?? 10);
        setRestockCoverDays(d.workflows?.restockCoverDays ?? 14);
        setOverdueInvoiceDays(d.workflows?.overdueInvoiceDays ?? 7);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSettings(); loadCacheStatus(); }, []);

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
          clientId,
          clientSecret,
          workflows: { autoCreatePO, lowStockThreshold, restockCoverDays, overdueInvoiceDays },
        }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else { setSaved(true); loadSettings(); }
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleTestConnection() {
    setTestingConn(true);
    setConnResult(null);
    try {
      const r = await fetch("/api/test-connection", { method: "POST" });
      setConnResult(await r.json());
    } catch (e: any) {
      setConnResult({ success: false, error: e.message });
    }
    setTestingConn(false);
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
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="size-5" /> Cài đặt
        </h1>
        <p className="text-sm text-muted-foreground">Quản lý kết nối KiotViet và các cấu hình tự động</p>
      </div>

      {/* Onboarding banner — shown when not configured */}
      {!data.isConfigured && (
        <Card className="border-amber-400/40 bg-amber-400/5">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20">
                <Plug className="size-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Kết nối KiotViet của bạn</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nhập Client ID và Client Secret từ{" "}
                  <span className="font-medium text-foreground">id.kiotviet.vn → Ứng dụng</span>{" "}
                  để bắt đầu.
                </p>
                <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-none">
                  {[
                    "Đăng nhập vào id.kiotviet.vn bằng tài khoản chủ shop",
                    'Vào mục "Quản lý ứng dụng" → Tạo ứng dụng mới',
                    "Sao chép Client ID và Client Secret vào form bên dưới",
                    'Nhấn "Lưu & Test kết nối" để xác nhận',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-400 font-mono text-[10px] mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API credentials */}
      <Card className={!data.isConfigured ? "border-primary/30 ring-1 ring-primary/20" : undefined}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="size-4" />
            API Credentials
            {data.isConfigured && (
              data.tokenValid
                ? <Badge variant="outline" className="ml-auto text-emerald-400 border-emerald-400/30">Đã kết nối</Badge>
                : <Badge variant="outline" className="ml-auto text-amber-400 border-amber-400/30">Token hết hạn</Badge>
            )}
            {!data.isConfigured && (
              <Badge variant="outline" className="ml-auto text-amber-400 border-amber-400/30 animate-pulse">Chưa cấu hình</Badge>
            )}
          </CardTitle>
          <CardDescription>Thông tin xác thực từ KiotViet Developer Portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Retailer (tên shop)</label>
            <Input
              value={retailer}
              onChange={(e) => setRetailer(e.target.value)}
              placeholder="your-retailer-name"
              className="font-mono"
            />
            <span className="text-xs text-muted-foreground">Tên định danh shop trên KiotViet (không dấu, không khoảng trắng)</span>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Client ID</label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={data.isConfigured ? "Nhập để cập nhật..." : "Dán Client ID từ KiotViet"}
              className="font-mono"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Client Secret</label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={data.isConfigured ? "Nhập để cập nhật..." : "Dán Client Secret từ KiotViet"}
              className="font-mono"
              autoComplete="off"
            />
          </div>
          {data.tokenExpiry && (
            <p className="text-xs text-muted-foreground">Token hết hạn: {data.tokenExpiry}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={testingConn}
              onClick={handleTestConnection}
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

      {/* Shop info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="size-4" />
            Thông tin cửa hàng
          </CardTitle>
          <CardDescription>Cấu hình chi nhánh và Shop ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Shop ID</label>
            <Input value={data.shopId} readOnly className="font-mono text-muted-foreground" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Chi nhánh mặc định</label>
            <Input
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="ID chi nhánh (để trống = tất cả)"
              className="font-mono"
            />
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
              <div className="text-xs text-muted-foreground">Tạo PO tự động khi sản phẩm sắp hết (cấp bách)</div>
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

      {/* Data cache + sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="size-4" />
            Dữ liệu & Cache
          </CardTitle>
          <CardDescription>Đồng bộ dữ liệu từ KiotViet vào cache cục bộ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Token cache", value: `shops/.tokens/${data.shopId}.json` },
            { label: "Shop config", value: `shops/${data.shopId}.json` },
            { label: "Data cache", value: `shops/.cache/${data.shopId}/` },
            { label: "Cron jobs", value: "cron/jobs.json" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono text-xs text-muted-foreground">{value}</span>
            </div>
          ))}

          {cacheEntries.length > 0 && (
            <div className="rounded-lg border border-border/40 divide-y divide-border/30">
              {cacheEntries.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">{entry.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{entry.ageMinutes}m ago</span>
                    <Badge
                      variant="outline"
                      className={entry.stale ? "text-amber-400 border-amber-400/30" : "text-emerald-400 border-emerald-400/30"}
                    >
                      {entry.stale ? "stale" : "fresh"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-1.5"
            >
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Đồng bộ dữ liệu
            </Button>
            {syncResult && (
              <span className={`text-xs flex items-center gap-1 ${syncResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                {syncResult.ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                {syncResult.ok ? `Đã đồng bộ ${syncResult.synced} tập dữ liệu` : syncResult.error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {!data.isConfigured ? "Lưu & kết nối" : "Lưu cài đặt"}
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
