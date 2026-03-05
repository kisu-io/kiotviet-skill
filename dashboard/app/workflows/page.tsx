"use client";

import { useEffect, useState } from "react";
import {
  Workflow,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Radio,
  Settings2,
  AlertCircle,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type WorkflowJob = {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  script: string;
  args?: string;
  description: string;
};

const WORKFLOW_LABELS: Record<string, { name: string; description: string }> = {
  "daily-briefing": { name: "Báo cáo sáng", description: "Tóm tắt doanh thu hôm qua, xu hướng tuần, cảnh báo tồn kho thấp" },
  "smart-restock": { name: "Nhập hàng thông minh", description: "Dự báo nhu cầu 30 ngày, đề xuất nhập hàng cho sản phẩm sắp hết" },
  "invoice-reminder": { name: "Nhắc nợ hoá đơn", description: "Nhắc nhở hoá đơn quá hạn: 7 ngày nhẹ, 14 ngày mạnh, 30+ ngày cảnh báo" },
  "weekly-report": { name: "Báo cáo tuần", description: "Tổng hợp kinh doanh tuần: doanh thu, top sản phẩm, tồn kho" },
};

const CHANNEL_LABELS: Record<string, string> = {
  discord: "Discord",
  telegram: "Telegram",
  all: "Tất cả kênh",
};

function parseCron(cron: string) {
  const parts = cron.split(" ");
  return {
    minute: parseInt(parts[0]) || 0,
    hour: parseInt(parts[1]) || 0,
    dayOfWeek: parts[4] || "*",
  };
}

function formatCronSchedule(cron: string) {
  const { hour, minute, dayOfWeek } = parseCron(cron);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeStr = `${pad(hour)}:${pad(minute)}`;
  if (dayOfWeek === "*") return `${timeStr} — hàng ngày`;
  if (dayOfWeek === "1") return `${timeStr} — Thứ Hai`;
  if (dayOfWeek === "1-5") return `${timeStr} — các ngày trong tuần`;
  return `${timeStr} — ngày ${dayOfWeek}`;
}

export default function WorkflowsPage() {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shopWorkflows, setShopWorkflows] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/workflows/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          // Only show workflow jobs (not legacy script-only jobs)
          const workflowJobs = (d.jobs || []).filter((j: WorkflowJob) =>
            j.script.startsWith("src/workflows/")
          );
          setJobs(workflowJobs);
          setShopWorkflows(d.workflows || {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/workflows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflows: shopWorkflows }),
      });
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  function updateWorkflowSetting(key: string, value: any) {
    setShopWorkflows((prev) => ({ ...prev, [key]: value }));
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
          Đang tải quy trình...
        </div>
      </div>
    );
  }

  const activeCount = jobs.filter((w) => w.enabled).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng quy trình</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang hoạt động</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đã tạm dừng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{jobs.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {jobs.map((w) => {
          const isOpen = expanded === w.id;
          const labels = WORKFLOW_LABELS[w.id] || { name: w.name, description: w.description };
          return (
            <Card key={w.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-lg ${w.enabled ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      <Workflow className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{labels.name}</CardTitle>
                      <CardDescription>{labels.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={w.enabled ? "outline" : "secondary"} className={w.enabled ? "text-emerald-400 border-emerald-400/30" : ""}>
                    {w.enabled ? "Đang bật" : "Tạm dừng"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatCronSchedule(w.schedule)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {w.enabled ? (
                        <Play className="size-3.5 text-emerald-400" />
                      ) : (
                        <Pause className="size-3.5" />
                      )}
                      {w.enabled ? "Đang chạy" : "Tạm dừng"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(isOpen ? null : w.id)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <Settings2 className="size-3.5" />
                    Tuỳ chỉnh
                    {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cài đặt quy trình
                    </div>

                    {w.id === "daily-briefing" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">Ngưỡng tồn kho thấp</div><div className="text-xs text-muted-foreground">Cảnh báo khi tồn kho dưới số này</div></div>
                          <Input type="number" value={shopWorkflows.lowStockThreshold ?? 10} onChange={(e) => updateWorkflowSetting("lowStockThreshold", parseInt(e.target.value) || 10)} className="w-20 font-mono text-center" />
                        </div>
                      </div>
                    )}

                    {w.id === "smart-restock" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">Số ngày dự trữ</div><div className="text-xs text-muted-foreground">Đề xuất nhập đủ hàng cho N ngày</div></div>
                          <Input type="number" value={shopWorkflows.restockCoverDays ?? 14} onChange={(e) => updateWorkflowSetting("restockCoverDays", parseInt(e.target.value) || 14)} className="w-20 font-mono text-center" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">Tự động tạo phiếu nhập</div><div className="text-xs text-muted-foreground">Tạo PO tự động cho SP cấp bách</div></div>
                          <Switch checked={shopWorkflows.autoCreatePO ?? false} onCheckedChange={(val) => updateWorkflowSetting("autoCreatePO", val)} />
                        </div>
                        {shopWorkflows.autoCreatePO && (
                          <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
                            <AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-400" />
                            <div className="text-xs text-amber-400">
                              <span className="font-medium">Lưu ý:</span> Hệ thống sẽ tạo PO trực tiếp trên KiotViet cho sản phẩm cấp bách.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {w.id === "invoice-reminder" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">Ngưỡng ngày quá hạn</div><div className="text-xs text-muted-foreground">Nhắc nợ khi quá hạn N ngày</div></div>
                          <Input type="number" value={shopWorkflows.overdueInvoiceDays ?? 7} onChange={(e) => updateWorkflowSetting("overdueInvoiceDays", parseInt(e.target.value) || 7)} className="w-20 font-mono text-center" />
                        </div>
                      </div>
                    )}

                    {w.id === "weekly-report" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">Số top sản phẩm</div><div className="text-xs text-muted-foreground">Hiển thị N sản phẩm bán chạy nhất</div></div>
                          <Input type="number" value={shopWorkflows.topProductsCount ?? 5} onChange={(e) => updateWorkflowSetting("topProductsCount", parseInt(e.target.value) || 5)} className="w-20 font-mono text-center" />
                        </div>
                      </div>
                    )}

                    <Button size="sm" onClick={saveSettings} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Lưu cài đặt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
