"use server";

import prisma from "@/prisma/db";

export interface TrafficRange {
    startDate: Date;
    endDate: Date;
}

export interface ServerTrafficRankItem {
    id: number;
    name: string;
    hostnameOrIp: string;
    tags: string[];
    usage: number;
    previousUsage: number;
    changePercent: number | null;
    isAvailable: boolean;
}

export interface TrafficTrendPoint {
    label: string;
    usage: number;
}

export interface TrafficDashboardData {
    totalUsage: number;
    activeServers: number;
    totalServers: number;
    ranking: ServerTrafficRankItem[];
    trend: TrafficTrendPoint[];
}

const getSnapshotUsage = async (serverId: number, startDate: Date, endDate: Date): Promise<number> => {
    const [baseline, snapshotsInRange] = await Promise.all([
        prisma.serverTrafficSnapshot.findFirst({
            where: {
                serverId,
                capturedAt: {
                    lt: startDate
                }
            },
            orderBy: {
                capturedAt: "desc"
            }
        }),
        prisma.serverTrafficSnapshot.findMany({
            where: {
                serverId,
                capturedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                capturedAt: "asc"
            }
        })
    ]);
    const snapshots = baseline ? [baseline, ...snapshotsInRange] : snapshotsInRange;

    if (snapshots.length < 2) return 0;

    const usage = snapshots.slice(1).reduce((total, snapshot, index) => {
        const previous = snapshots[index];
        const diff = snapshot.totalDataUsage - previous.totalDataUsage;

        return diff > 0 ? total + diff : total;
    }, BigInt(0));

    return Number(usage);
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

export async function getTrafficDashboardData(range: TrafficRange): Promise<TrafficDashboardData> {
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    const duration = endDate.getTime() - startDate.getTime();
    const previousRange = {
        startDate: new Date(startDate.getTime() - duration),
        endDate: startDate
    };

    const servers = await prisma.server.findMany({
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
        },
        orderBy: {
            name: "asc"
        }
    });

    const ranking = await Promise.all(
        servers.map(async (server) => {
            const [usage, previousUsage] = await Promise.all([
                getSnapshotUsage(server.id, startDate, endDate),
                getSnapshotUsage(server.id, previousRange.startDate, previousRange.endDate)
            ]);
            const changePercent =
                previousUsage > 0 ? Number((((usage - previousUsage) / previousUsage) * 100).toFixed(1)) : null;

            return {
                id: server.id,
                name: server.name,
                hostnameOrIp: server.hostnameOrIp,
                tags: server.tags.map((item) => item.tag.name),
                usage,
                previousUsage,
                changePercent,
                isAvailable: server.isAvailable
            };
        })
    );

    ranking.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));

    const buckets = splitRangeIntoBuckets(startDate, endDate, 7);
    const trend = await Promise.all(
        buckets.map(async (bucket) => {
            const usageValues = await Promise.all(
                servers.map((server) => getSnapshotUsage(server.id, bucket.startDate, bucket.endDate))
            );

            return {
                label: formatTrendLabel(bucket.endDate),
                usage: usageValues.reduce((sum, value) => sum + value, 0)
            };
        })
    );

    return {
        totalUsage: ranking.reduce((sum, item) => sum + item.usage, 0),
        activeServers: servers.filter((server) => server.isAvailable).length,
        totalServers: servers.length,
        ranking,
        trend
    };
}
