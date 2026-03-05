"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Play,
  Loader2,
  Save,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatVND(n: number) {
  return Math.round(n)
    .toLocaleString("vi-VN")
    .replace(/,/g, ".")
    .concat(" VND");
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type AnomalyResult = {
  anomaly: boolean;
  severity: string;
  currentHour: string;
  currentRevenue: number;
  currentOrderCount?: number;
  baselineMean: number;
  baselineStdDev: number;
  deviationPct: number;
  zScore: number;
  baselinePoints: number[];
  message: string;
  config?: AlertConfig;
};

type AlertConfig = {
  enabled?: boolean;
  warningDeviationPct?: number;
  criticalDeviationPct?: number;
  baselineWeeks?: number;
  quietHoursStart?: number;
  quietHoursEnd?: number;
};

export default function AlertsPage() {
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [config, setConfig] = useState<AlertConfig>({
    enabled: true,
    warningDeviationPct: 30,
    criticalDeviationPct: 50,
    baselineWeeks: 4,
    quietHoursStart: 22,
    quietHoursEnd: 7,
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/alerts/revenue-anomaly").then((r) => r.json()),
      fetch("/api/alerts/config").then((r) => r.json()),
    ])
      .then(([anomalyData, configData]) => {
        if (anomalyData.error) setError(anomalyData.error);
        else setResult(anomalyData);
        if (configData.alerts?.revenueAnomaly) {
          setConfig(configData.alerts.revenueAnomaly);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/alerts/revenue-anomaly", { method: "POST" });
      const data = await res.json();
      if (data.detection) setResult(data.detection);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts: { revenueAnomaly: config } }),
      });
      const data = await res.json();
      if (data.success) setSaveMsg("Da luu cau hinh!");
      else setSaveMsg(data.error || "Loi khi luu");
    } catch (e: any) {
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
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

  const severityColor = result?.severity === "critical"
    ? "text-red-400"
    : result?.severity === "warning"
      ? "text-amber-400"
      : "text-emerald-400";

  const severityBg = result?.severity === "critical"
    ? "bg-red-400/10 border-red-400/20"
    : result?.severity === "warning"
      ? "bg-amber-400/10 border-amber-400/20"
      : "bg-emerald-400/10 border-emerald-400/20";

  const severityLabel = result?.severity === "critical"
    ? "Nghiem trong"
    : result?.severity === "warning"
      ? "Canh bao"
      : "Binh thuong";

  return (
    <motion.div
      className="flex flex-col gap-6 p-4 md:p-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Canh bao doanh thu</h1>
          <p className="text-sm text-muted-foreground">
            Phat hien bat thuong doanh thu theo gio — so sanh voi baseline 4 tuan
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={handleRunNow}
          disabled={running}
        >
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          Chay ngay
        </Button>
      </motion.div>

      {/* Current Status Cards */}
      {result && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={item}>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Trang thai</p>
                    <Badge className={`${severityBg} ${severityColor} border`}>
                      {result.anomaly ? <AlertTriangle className="size-3 mr-1" /> : <Activity className="size-3 mr-1" />}
                      {severityLabel}
                    </Badge>
                  </div>
                  <div className={`flex size-10 items-center justify-center rounded-xl ${severityBg}`}>
                    <Bell className={`size-5 ${severityColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Doanh thu gio nay</p>
                  <p className="text-2xl font-bold tracking-tight">{formatVND(result.currentRevenue)}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {result.deviationPct > 0 ? (
                      <TrendingUp className="size-3.5 text-emerald-400" />
                    ) : result.deviationPct < 0 ? (
                      <TrendingDown className="size-3.5 text-red-400" />
                    ) : null}
                    <span className={result.deviationPct > 0 ? "text-emerald-400" : result.deviationPct < 0 ? "text-red-400" : "text-muted-foreground"}>
                      {result.deviationPct > 0 ? "+" : ""}{result.deviationPct}%
                    </span>
                    <span className="text-muted-foreground">vs baseline</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Trung binh baseline</p>
                  <p className="text-2xl font-bold tracking-tight">{formatVND(result.baselineMean)}</p>
                  <p className="text-xs text-muted-foreground">
                    StdDev: {formatVND(result.baselineStdDev)} | z: {result.zScore}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Khung gio</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {result.currentHour?.split("T")[1] || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.currentOrderCount ?? 0} don hang
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Baseline Points */}
      {result && result.baselinePoints.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Diem baseline (cung gio, cung thu, {result.baselinePoints.length} tuan truoc)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {result.baselinePoints.map((pt, i) => (
                  <div key={i} className="rounded-lg bg-accent/50 px-3 py-2 text-center min-w-[100px]">
                    <p className="text-xs text-muted-foreground">Tuan -{i + 1}</p>
                    <p className="text-sm font-semibold">{formatVND(pt)}</p>
                  </div>
                ))}
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-center min-w-[100px]">
                  <p className="text-xs text-primary">Hien tai</p>
                  <p className="text-sm font-semibold text-primary">{formatVND(result.currentRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Alert Configuration */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                <CardTitle className="text-sm font-semibold">Cau hinh canh bao</CardTitle>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 h-8 text-xs"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Luu
              </Button>
            </div>
            {saveMsg && (
              <p className="text-xs text-emerald-400 mt-1">{saveMsg}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bat/Tat</label>
                <button
                  className={`w-full rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                    config.enabled
                      ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                      : "bg-accent border-border text-muted-foreground"
                  }`}
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                >
                  {config.enabled ? "Dang bat" : "Da tat"}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nguong canh bao (%)</label>
                <input
                  type="number"
                  className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm"
                  value={config.warningDeviationPct ?? 30}
                  onChange={(e) => setConfig({ ...config, warningDeviationPct: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nguong nghiem trong (%)</label>
                <input
                  type="number"
                  className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm"
                  value={config.criticalDeviationPct ?? 50}
                  onChange={(e) => setConfig({ ...config, criticalDeviationPct: parseInt(e.target.value) || 50 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">So tuan baseline</label>
                <input
                  type="number"
                  className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm"
                  value={config.baselineWeeks ?? 4}
                  onChange={(e) => setConfig({ ...config, baselineWeeks: parseInt(e.target.value) || 4 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" /> Gio im lang (bat dau)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm"
                  value={config.quietHoursStart ?? 22}
                  onChange={(e) => setConfig({ ...config, quietHoursStart: parseInt(e.target.value) || 22 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" /> Gio im lang (ket thuc)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm"
                  value={config.quietHoursEnd ?? 7}
                  onChange={(e) => setConfig({ ...config, quietHoursEnd: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
