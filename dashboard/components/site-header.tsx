"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { Wifi, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
    "/": "Tổng quan",
    "/inventory": "Kho hàng",
    "/orders": "Đơn hàng & Hoá đơn",
    "/workflows": "Quy trình tự động",
    "/channels": "Kênh gửi tin",
    "/customers": "Khách hàng",
    "/settings": "Cài đặt",
};

export function SiteHeader() {
    const pathname = usePathname();
    const title = pageTitles[pathname] || "Dashboard";
    const { theme, setTheme } = useTheme();

    return (
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b px-4 transition-colors duration-300">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <h1 className="text-sm font-semibold">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
                <Badge
                    variant="outline"
                    className="gap-1.5 text-xs font-normal text-emerald-500 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-transparent"
                >
                    <Wifi className="size-3" />
                    <span>Đã kết nối</span>
                </Badge>
            </div>
        </header>
    );
}
