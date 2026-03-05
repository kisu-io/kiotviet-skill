"use client";

import { useEffect, useState } from "react";
import {
  Users, Send, Loader2, AlertTriangle, CheckCircle2, Crown,
  AlertCircle, UserX, MessageSquare, Eye,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatVND(n: number) {
  return Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".") + " ₫";
}

type AudienceData = {
  audience: {
    atRisk: number;
    lost: number;
    total: number;
    samples: { name: string; segment: string; recency: number; monetary: number }[];
  };
};

type CampaignResult = {
  shopId?: string;
  workflow?: string;
  dryRun?: boolean;
  summary?: { atRisk: number; lost: number; totalContacted: number };
  contacted?: { customerName: string; segment: string; status: string; message?: string; reason?: string }[];
  error?: string;
};

const AT_RISK_TEMPLATE = `Xin chào [Tên khách hàng]! 👋

Chúng tôi nhận thấy bạn chưa ghé thăm cửa hàng trong một thời gian. Chúng tôi rất nhớ bạn! 🛍️

Hãy ghé lại để khám phá các sản phẩm mới và ưu đãi hấp dẫn nhé. Cảm ơn bạn đã tin tưởng và ủng hộ chúng tôi!`;

const LOST_TEMPLATE = `Xin chào [Tên khách hàng]! 😊

Chúng tôi rất vui khi được phục vụ bạn trước đây. Chúng tôi muốn mời bạn quay lại với ưu đãi đặc biệt! 🎁

Hãy liên hệ với chúng tôi để nhận ưu đãi dành riêng cho bạn.`;

export default function CampaignsPage() {
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns/run")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setAudience(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAudience(false));
  }, []);

  async function runCampaign(isDryRun: boolean) {
    setRunning(true);
    setResult(null);
    setDryRun(isDryRun);
    try {
      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: isDryRun }),
      });
      const d = await res.json();
      setResult(d);
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Win-back Campaign</h1>
        <p className="text-sm text-muted-foreground">Tự động gửi tin nhắn tới khách hàng có nguy cơ và đã mất qua Zalo OA</p>
      </div>

      {/* Audience summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {loadingAudience ? (
          [...Array(3)].map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-10 w-full" /></CardContent></Card>)
        ) : audience ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="size-3.5" /> Có nguy cơ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audience.audience.atRisk}</div>
                <p className="text-xs text-muted-foreground mt-1">khách hàng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-red-400">
                  <UserX className="size-3.5" /> Đã mất
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audience.audience.lost}</div>
                <p className="text-xs text-muted-foreground mt-1">khách hàng</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Users className="size-3.5" /> Tổng đối tượng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{audience.audience.total}</div>
                <p className="text-xs text-muted-foreground mt-1">khách hàng sẽ nhận tin</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message templates */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="size-4" /> Mẫu tin nhắn
            </CardTitle>
            <CardDescription>Tin nhắn sẽ được cá nhân hoá theo từng khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="atrisk">
              <TabsList className="w-full">
                <TabsTrigger value="atrisk" className="flex-1">Có nguy cơ</TabsTrigger>
                <TabsTrigger value="lost" className="flex-1">Đã mất</TabsTrigger>
              </TabsList>
              <TabsContent value="atrisk">
                <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{AT_RISK_TEMPLATE}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">[Tên khách hàng]</span> sẽ được thay thế tự động.
                </p>
              </TabsContent>
              <TabsContent value="lost">
                <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{LOST_TEMPLATE}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">[Tên khách hàng]</span> sẽ được thay thế tự động.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Audience preview + run */}
        <div className="flex flex-col gap-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="size-4" /> Xem trước đối tượng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingAudience ? (
                <Skeleton className="h-24 w-full" />
              ) : audience?.audience.samples.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có đối tượng phù hợp</p>
              ) : audience?.audience.samples.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Lần cuối: {c.recency} ngày · Chi {formatVND(c.monetary)}</p>
                  </div>
                  <Badge variant="outline" className={c.segment === "atRisk" ? "text-amber-400 border-amber-400/30" : "text-red-400 border-red-400/30"}>
                    {c.segment === "atRisk" ? "Nguy cơ" : "Đã mất"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Chạy chiến dịch</CardTitle>
              <CardDescription>
                Chạy thử (dry run) để xem trước, hoặc chạy thật để gửi qua Zalo OA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
                <AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-400">
                  Yêu cầu Zalo OA Access Token trong cấu hình shop. Chạy thật sẽ gửi tin nhắn thực sự.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => runCampaign(true)}
                  disabled={running || loadingAudience}
                >
                  {running && dryRun ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                  Chạy thử (Dry Run)
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => runCampaign(false)}
                  disabled={running || loadingAudience || !audience?.audience.total}
                >
                  {running && !dryRun ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Gửi qua Zalo OA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      {result && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              {result.error ? (
                <AlertTriangle className="size-4 text-red-400" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-400" />
              )}
              Kết quả chiến dịch {result.dryRun ? "(Dry Run)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <p className="text-sm text-red-400">{result.error}</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{result.summary?.atRisk ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Có nguy cơ</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{result.summary?.lost ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Đã mất</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{result.summary?.totalContacted ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{result.dryRun ? "Xử lý (thử)" : "Đã gửi"}</p>
                  </div>
                </div>
                {result.contacted && result.contacted.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.contacted.slice(0, 20).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                        <span className="font-medium">{c.customerName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-muted-foreground">{c.segment}</Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${c.status === "sent" || c.status === "dryRun" ? "text-emerald-400 border-emerald-400/30" : c.status === "skipped" ? "text-muted-foreground" : "text-red-400 border-red-400/30"}`}
                          >
                            {c.status === "dryRun" ? "✓ thử" : c.status === "sent" ? "✓ gửi" : c.status === "skipped" ? "bỏ qua" : "lỗi"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
