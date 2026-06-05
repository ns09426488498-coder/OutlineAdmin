"use client";

import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Select,
    SelectItem,
    Skeleton
} from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";

import {
    getTrafficDashboardData,
    ServerTrafficRankItem,
    TrafficDashboardData,
    TrafficDataSource,
    TrafficRange
} from "@/src/core/actions/traffic";
import { StatsIcon } from "@/src/components/icons";
import { formatBytes } from "@/src/core/utils";
import { TranslationKey, useLanguage } from "@/src/components/language-provider";

type TrafficPreset = "today" | "yesterday" | "3days" | "7days" | "custom";

const presets: TrafficPreset[] = ["today", "yesterday", "3days", "7days", "custom"];

const startOfDay = (date: Date): Date => {
    const value = new Date(date);

    value.setHours(0, 0, 0, 0);

    return value;
};

const endOfDay = (date: Date): Date => {
    const value = new Date(date);

    value.setHours(23, 59, 59, 999);

    return value;
};

const formatDateInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: TrafficPreset, customStart: string, customEnd: string): TrafficRange => {
    const now = new Date();

    if (preset === "yesterday") {
        const yesterday = new Date(now);

        yesterday.setDate(yesterday.getDate() - 1);

        return {
            startDate: startOfDay(yesterday),
            endDate: endOfDay(yesterday)
        };
    }

    if (preset === "3days" || preset === "7days") {
        const days = preset === "3days" ? 3 : 7;
        const start = new Date(now);

        start.setDate(start.getDate() - days + 1);

        return {
            startDate: startOfDay(start),
            endDate: now
        };
    }

    if (preset === "custom" && customStart && customEnd) {
        return {
            startDate: startOfDay(new Date(`${customStart}T00:00:00`)),
            endDate: endOfDay(new Date(`${customEnd}T00:00:00`))
        };
    }

    return {
        startDate: startOfDay(now),
        endDate: now
    };
};

const getPresetLabel = (preset: TrafficPreset, t: (key: TranslationKey) => string): string => {
    const labels = {
        today: t("today"),
        yesterday: t("yesterday"),
        "3days": t("threeDays"),
        "7days": t("sevenDays"),
        custom: t("custom")
    };

    return labels[preset];
};

function TrendChart({ data }: { data: TrafficDashboardData["trend"] }) {
    const max = Math.max(...data.map((item) => item.usage), 1);
    const points = data.map((item, index) => {
        const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
        const y = 100 - (item.usage / max) * 82 - 8;

        return `${x},${y}`;
    });

    return (
        <div className="grid gap-3">
            <svg className="h-[150px] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                    fill="none"
                    points={points.join(" ")}
                    stroke="hsl(var(--heroui-primary))"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                />
                {points.map((point, index) => {
                    const [cx, cy] = point.split(",");

                    return <circle key={index} cx={cx} cy={cy} fill="hsl(var(--heroui-primary))" r="1.8" />;
                })}
            </svg>
            <div className="grid grid-cols-7 gap-2 text-[11px] text-foreground-400">
                {data.map((item, index) => (
                    <span key={`${item.label}-${index}`} className="truncate text-center">
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function RankingRow({
    item,
    maxUsage,
    dataSource
}: {
    item: ServerTrafficRankItem;
    maxUsage: number;
    dataSource: TrafficDataSource;
}) {
    const width = maxUsage > 0 ? Math.max(3, (item.usage / maxUsage) * 100) : 0;
    const isIncreased = item.changePercent !== null && item.changePercent > 0;
    const isReduced = item.changePercent !== null && item.changePercent < 0;

    return (
        <div className="grid gap-2 rounded-md bg-default-100/60 p-3 dark:bg-content2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    <div className="truncate text-xs text-foreground-400">{item.hostnameOrIp}</div>
                    {dataSource === "vnstat" && (
                        <div className="truncate text-[11px] text-foreground-400">
                            入站 {formatBytes(item.inboundUsage)}
                            {item.interfaceName ? ` · 网卡 ${item.interfaceName}` : ""}
                        </div>
                    )}
                    {dataSource === "dynamic-key" && (
                        <div className="truncate text-[11px] text-foreground-400">
                            累计 {formatBytes(item.currentUsage)}
                            {item.dataLimit !== null ? ` / ${formatBytes(item.dataLimit)}` : ""}
                            {item.tags.length > 0 ? ` · 标签 ${item.tags.join(", ")}` : ""}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {item.changePercent !== null && (
                        <Chip
                            color={isIncreased ? "danger" : isReduced ? "success" : "default"}
                            radius="sm"
                            size="sm"
                            variant="flat"
                        >
                            {item.changePercent > 0 ? "+" : ""}
                            {item.changePercent}%
                        </Chip>
                    )}
                    <span className="w-[86px] text-right text-xs text-foreground-500">{formatBytes(item.usage)}</span>
                </div>
            </div>

            {dataSource === "vnstat" && item.collectionError && (
                <div className="truncate text-[11px] text-danger-500" title={item.collectionError}>
                    采集失败：{item.collectionError}
                </div>
            )}

            <div className="h-2 overflow-hidden rounded-full bg-default-200 dark:bg-default-100">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}

export default function TrafficDashboard() {
    const { t } = useLanguage();
    const [preset, setPreset] = useState<TrafficPreset>("today");
    const [customStart, setCustomStart] = useState<string>(formatDateInput(new Date()));
    const [customEnd, setCustomEnd] = useState<string>(formatDateInput(new Date()));
    const [dataSource, setDataSource] = useState<TrafficDataSource>("vnstat");
    const [tagId, setTagId] = useState<string>("");
    const [data, setData] = useState<TrafficDashboardData>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasMounted, setHasMounted] = useState<boolean>(false);

    const range = useMemo(() => getPresetRange(preset, customStart, customEnd), [customEnd, customStart, preset]);
    const maxUsage = Math.max(...(data?.ranking.map((item) => item.usage) ?? [0]), 0);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        const load = async () => {
            setIsLoading(true);
            setData(await getTrafficDashboardData(range, dataSource, dataSource === "dynamic-key" ? tagId : undefined));
            setIsLoading(false);
        };

        load();
    }, [dataSource, hasMounted, range, tagId]);

    if (!hasMounted) {
        return (
            <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <StatsIcon size={22} />
                        <h1 className="text-xl">{t("trafficStats")}</h1>
                    </div>
                    <Skeleton className="h-8 w-[360px] rounded-md" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[92px] rounded-md" />
                    <Skeleton className="h-[92px] rounded-md" />
                    <Skeleton className="h-[92px] rounded-md" />
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                    <Skeleton className="h-[520px] rounded-md" />
                    <Skeleton className="h-[260px] rounded-md" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <StatsIcon size={22} />
                    <h1 className="text-xl">{t("trafficStats")}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <ButtonGroup size="sm" variant="flat">
                        <Button
                            color={dataSource === "vnstat" ? "primary" : "default"}
                            onPress={() => setDataSource("vnstat")}
                        >
                            VPS 实际流量
                        </Button>
                        <Button
                            color={dataSource === "outline" ? "primary" : "default"}
                            onPress={() => setDataSource("outline")}
                        >
                            Outline 代理流量
                        </Button>
                        <Button
                            color={dataSource === "dynamic-key" ? "primary" : "default"}
                            onPress={() => setDataSource("dynamic-key")}
                        >
                            流量使用排行
                        </Button>
                    </ButtonGroup>

                    {dataSource === "dynamic-key" && (
                        <Select
                            aria-label="按标签筛选"
                            className="w-[150px]"
                            selectedKeys={[tagId || "all"]}
                            size="sm"
                            onSelectionChange={(keys) => {
                                const selected = String(Array.from(keys)[0] ?? "all");

                                setTagId(selected === "all" ? "" : selected);
                            }}
                        >
                            {[{ id: "all", name: "全部标签" }, ...(data?.availableTags ?? [])].map((tag) => (
                                <SelectItem key={tag.id}>{tag.name}</SelectItem>
                            ))}
                        </Select>
                    )}

                    <ButtonGroup size="sm" variant="flat">
                        {presets.map((item) => (
                            <Button
                                key={item}
                                color={preset === item ? "primary" : "default"}
                                onPress={() => setPreset(item)}
                            >
                                {getPresetLabel(item, t)}
                            </Button>
                        ))}
                    </ButtonGroup>

                    {preset === "custom" && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                className="w-[148px]"
                                size="sm"
                                type="date"
                                value={customStart}
                                onValueChange={setCustomStart}
                            />
                            <Input
                                className="w-[148px]"
                                size="sm"
                                type="date"
                                value={customEnd}
                                onValueChange={setCustomEnd}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardBody className="grid gap-1">
                        <span className="text-sm text-foreground-500">
                            {dataSource === "vnstat"
                                ? "VPS 出站流量"
                                : dataSource === "dynamic-key"
                                  ? "客户使用流量"
                                  : t("totalTraffic")}
                        </span>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28 rounded-md" />
                        ) : (
                            <span className="text-2xl font-semibold">{formatBytes(data?.outboundUsage ?? 0)}</span>
                        )}
                    </CardBody>
                </Card>

                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardBody className="grid gap-1">
                        <span className="text-sm text-foreground-500">
                            {dataSource === "vnstat"
                                ? "VPS 入站流量"
                                : dataSource === "dynamic-key"
                                  ? "产生流量的客户"
                                  : t("activeServers")}
                        </span>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20 rounded-md" />
                        ) : (
                            <span className="text-2xl font-semibold">
                                {dataSource === "vnstat"
                                    ? formatBytes(data?.inboundUsage ?? 0)
                                    : `${data?.activeServers ?? 0}/${data?.totalServers ?? 0}`}
                            </span>
                        )}
                    </CardBody>
                </Card>

                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardBody className="grid gap-1">
                        <span className="text-sm text-foreground-500">
                            {dataSource === "vnstat"
                                ? "采集正常节点"
                                : dataSource === "dynamic-key"
                                  ? "最高用量客户"
                                  : "总计流量"}
                        </span>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20 rounded-md" />
                        ) : (
                            <span className="text-2xl font-semibold">
                                {dataSource === "vnstat"
                                    ? `${data?.collectingServers ?? 0}/${data?.totalServers ?? 0}`
                                    : dataSource === "dynamic-key"
                                      ? formatBytes(data?.ranking[0]?.usage ?? 0)
                                      : formatBytes(data?.totalUsage ?? 0)}
                            </span>
                        )}
                    </CardBody>
                </Card>

                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardBody className="grid gap-1">
                        <span className="text-sm text-foreground-500">{t("timeRange")}</span>
                        <span className="text-sm font-medium">
                            {range.startDate.toLocaleString()} - {range.endDate.toLocaleString()}
                        </span>
                    </CardBody>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardHeader className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                            {dataSource === "dynamic-key" ? "动态密钥流量使用排行" : t("serverTrafficRanking")}
                        </span>
                        <Chip radius="sm" size="sm" variant="flat">
                            {data?.ranking.length ?? 0}
                        </Chip>
                    </CardHeader>
                    <CardBody className="grid gap-2">
                        {isLoading &&
                            Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-[68px] rounded-md" />
                            ))}

                        {!isLoading &&
                            data?.ranking.map((item) => (
                                <RankingRow key={item.id} dataSource={dataSource} item={item} maxUsage={maxUsage} />
                            ))}

                        {!isLoading && data?.ranking.length === 0 && (
                            <div className="grid min-h-[180px] place-items-center text-sm text-foreground-400">
                                {t("noTrafficData")}
                            </div>
                        )}
                    </CardBody>
                </Card>

                <Card className="bg-content1" radius="sm" shadow="none">
                    <CardHeader>
                        <span className="font-medium">
                            {dataSource === "dynamic-key" ? "客户流量使用趋势" : t("trafficTrend")}
                        </span>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <Skeleton className="h-[190px] rounded-md" />
                        ) : (
                            <TrendChart data={data?.trend ?? []} />
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
