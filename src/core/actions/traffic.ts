"use server";

import prisma from "@/prisma/db";

export interface TrafficRange {
    startDate: Date;
    endDate: Date;
}

export type TrafficDataSource = "vnstat" | "outline" | "dynamic-key";

export interface ServerTrafficRankItem {
    id: number;
    name: string;
    hostnameOrIp: string;
    tags: string[];
    usage: number;
    inboundUsage: number;
    outboundUsage: number;
    previousUsage: number;
    changePercent: number | null;
    isAvailable: boolean;
    interfaceName: string | null;
    lastCollectedAt: Date | null;
    collectionError: string | null;
    currentUsage: number;
    dataLimit: number | null;
}

export interface TrafficTrendPoint {
    label: string;
    usage: number;
}

export interface TrafficDashboardData {
    totalUsage: number;
    inboundUsage: number;
    outboundUsage: number;
    activeServers: number;
    totalServers: number;
    collectingServers: number;
    dataSource: TrafficDataSource;
    ranking: ServerTrafficRankItem[];
    trend: TrafficTrendPoint[];
}

interface UsagePair {
    rx: number;
    tx: number;
}

const sumPositiveDiffs = <T>(snapshots: T[], getValue: (snapshot: T) => bigint): number => {
    if (snapshots.length < 2) return 0;

    const usage = snapshots.slice(1).reduce((total, snapshot, index) => {
        const diff = getValue(snapshot) - getValue(snapshots[index]);

        return diff > 0 ? total + diff : total;
    }, BigInt(0));

    return Number(usage);
};

const getOutlineUsage = async (serverId: number, startDate: Date, endDate: Date): Promise<UsagePair> => {
    const [baseline, snapshotsInRange] = await Promise.all([
        prisma.serverTrafficSnapshot.findFirst({
            where: { serverId, capturedAt: { lt: startDate } },
            orderBy: { capturedAt: "desc" }
        }),
        prisma.serverTrafficSnapshot.findMany({
            where: { serverId, capturedAt: { gte: startDate, lte: endDate } },
            orderBy: { capturedAt: "asc" }
        })
    ]);
    const snapshots = baseline ? [baseline, ...snapshotsInRange] : snapshotsInRange;

    return { rx: 0, tx: sumPositiveDiffs(snapshots, (snapshot) => snapshot.totalDataUsage) };
};

const getVnstatUsage = async (serverId: number, startDate: Date, endDate: Date): Promise<UsagePair> => {
    const [baseline, snapshotsInRange] = await Promise.all([
        prisma.vnstatTrafficSnapshot.findFirst({
            where: { serverId, capturedAt: { lt: startDate } },
            orderBy: { capturedAt: "desc" }
        }),
        prisma.vnstatTrafficSnapshot.findMany({
            where: { serverId, capturedAt: { gte: startDate, lte: endDate } },
            orderBy: { capturedAt: "asc" }
        })
    ]);
    const snapshots = baseline ? [baseline, ...snapshotsInRange] : snapshotsInRange;

    return {
        rx: sumPositiveDiffs(snapshots, (snapshot) => snapshot.rxBytes),
        tx: sumPositiveDiffs(snapshots, (snapshot) => snapshot.txBytes)
    };
};

const getDynamicKeyTags = (serverPoolType: string | null, serverPoolValue: string | null): string[] => {
    if (serverPoolType !== "tag" || !serverPoolValue) return [];

    try {
        return JSON.parse(serverPoolValue).map(String);
    } catch {
        return [];
    }
};

const formatTrendLabel = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${month}-${day}`;
};

const splitRangeIntoBuckets = (startDate: Date, endDate: Date, count: number): TrafficRange[] => {
    const ranges: TrafficRange[] = [];
    const start = startDate.getTime();
    const end = endDate.getTime();
    const duration = Math.max(1, end - start);
    const bucketSize = duration / count;

    for (let index = 0; index < count; index++) {
        ranges.push({
            startDate: new Date(start + bucketSize * index),
            endDate: new Date(index === count - 1 ? end : start + bucketSize * (index + 1))
        });
    }

    return ranges;
};

export async function getTrafficDashboardData(
    range: TrafficRange,
    dataSource: TrafficDataSource = "vnstat"
): Promise<TrafficDashboardData> {
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    const duration = endDate.getTime() - startDate.getTime();
    const previousRange = {
        startDate: new Date(startDate.getTime() - duration),
        endDate: startDate
    };

    if (dataSource === "dynamic-key") {
        const snapshotStart = new Date(previousRange.startDate.getTime() - 10 * 60 * 1000);
        const [dynamicAccessKeys, tags, snapshots] = await Promise.all([
            prisma.dynamicAccessKey.findMany({ orderBy: { name: "asc" } }),
            prisma.tag.findMany(),
            prisma.dynamicAccessKeyTrafficSnapshot.findMany({
                where: { capturedAt: { gte: snapshotStart, lte: endDate } },
                orderBy: { capturedAt: "asc" }
            })
        ]);
        const tagNames = new Map(tags.map((tag) => [String(tag.id), tag.name]));
        const snapshotsByKey = new Map<number, typeof snapshots>();

        for (const snapshot of snapshots) {
            const values = snapshotsByKey.get(snapshot.dynamicAccessKeyId) ?? [];

            values.push(snapshot);
            snapshotsByKey.set(snapshot.dynamicAccessKeyId, values);
        }

        const getUsageFromSnapshots = (id: number, rangeStart: Date, rangeEnd: Date): number => {
            const values = snapshotsByKey.get(id) ?? [];
            const baseline = [...values].reverse().find((snapshot) => snapshot.capturedAt < rangeStart);
            const inRange = values.filter(
                (snapshot) => snapshot.capturedAt >= rangeStart && snapshot.capturedAt <= rangeEnd
            );

            return sumPositiveDiffs(baseline ? [baseline, ...inRange] : inRange, (snapshot) => snapshot.dataUsage);
        };

        const ranking = dynamicAccessKeys.map((dak) => {
            const usage = getUsageFromSnapshots(dak.id, startDate, endDate);
            const previousUsage = getUsageFromSnapshots(dak.id, previousRange.startDate, previousRange.endDate);
            const changePercent =
                previousUsage > 0 ? Number((((usage - previousUsage) / previousUsage) * 100).toFixed(1)) : null;

            return {
                id: dak.id,
                name: dak.name,
                hostnameOrIp: `动态密钥 ID ${dak.id}`,
                tags: getDynamicKeyTags(dak.serverPoolType, dak.serverPoolValue)
                    .map((id) => tagNames.get(id))
                    .filter(Boolean) as string[],
                usage,
                inboundUsage: 0,
                outboundUsage: usage,
                previousUsage,
                changePercent,
                isAvailable: true,
                interfaceName: null,
                lastCollectedAt: null,
                collectionError: null,
                currentUsage: Number(dak.dataUsage),
                dataLimit: dak.dataLimit === null ? null : Number(dak.dataLimit) * 1000 * 1000
            };
        });

        ranking.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));

        const buckets = splitRangeIntoBuckets(startDate, endDate, 7);
        const trend = buckets.map((bucket) => ({
            label: formatTrendLabel(bucket.endDate),
            usage: dynamicAccessKeys.reduce(
                (sum, dak) => sum + getUsageFromSnapshots(dak.id, bucket.startDate, bucket.endDate),
                0
            )
        }));
        const totalUsage = ranking.reduce((sum, item) => sum + item.usage, 0);

        return {
            totalUsage,
            inboundUsage: 0,
            outboundUsage: totalUsage,
            activeServers: ranking.filter((item) => item.usage > 0).length,
            totalServers: ranking.length,
            collectingServers: ranking.filter((item) => item.usage > 0).length,
            dataSource,
            ranking,
            trend
        };
    }

    const getUsage = dataSource === "vnstat" ? getVnstatUsage : getOutlineUsage;

    const servers = await prisma.server.findMany({
        include: { tags: { include: { tag: true } } },
        orderBy: { name: "asc" }
    });

    const ranking = await Promise.all(
        servers.map(async (server) => {
            const [usage, previousUsage] = await Promise.all([
                getUsage(server.id, startDate, endDate),
                getUsage(server.id, previousRange.startDate, previousRange.endDate)
            ]);
            const changePercent =
                previousUsage.tx > 0
                    ? Number((((usage.tx - previousUsage.tx) / previousUsage.tx) * 100).toFixed(1))
                    : null;

            return {
                id: server.id,
                name: server.name,
                hostnameOrIp: server.hostnameOrIp,
                tags: server.tags.map((item) => item.tag.name),
                usage: usage.tx,
                inboundUsage: usage.rx,
                outboundUsage: usage.tx,
                previousUsage: previousUsage.tx,
                changePercent,
                isAvailable: server.isAvailable,
                interfaceName: dataSource === "vnstat" ? server.vnstatInterface : null,
                lastCollectedAt: dataSource === "vnstat" ? server.vnstatLastCollectedAt : null,
                collectionError: dataSource === "vnstat" ? server.vnstatLastError : null,
                currentUsage: 0,
                dataLimit: null
            };
        })
    );

    ranking.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));

    const buckets = splitRangeIntoBuckets(startDate, endDate, 7);
    const trend = await Promise.all(
        buckets.map(async (bucket) => {
            const usageValues = await Promise.all(
                servers.map((server) => getUsage(server.id, bucket.startDate, bucket.endDate))
            );

            return {
                label: formatTrendLabel(bucket.endDate),
                usage: usageValues.reduce((sum, value) => sum + value.tx, 0)
            };
        })
    );

    const inboundUsage = ranking.reduce((sum, item) => sum + item.inboundUsage, 0);
    const outboundUsage = ranking.reduce((sum, item) => sum + item.outboundUsage, 0);

    return {
        totalUsage: inboundUsage + outboundUsage,
        inboundUsage,
        outboundUsage,
        activeServers: servers.filter((server) => server.isAvailable).length,
        totalServers: servers.length,
        collectingServers: servers.filter((server) => server.vnstatLastCollectedAt && !server.vnstatLastError).length,
        dataSource,
        ranking,
        trend
    };
}
