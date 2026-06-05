"use server";

import { revalidatePath } from "next/cache";
import { Tag } from "@prisma/client";

import prisma from "@/prisma/db";

export interface TagLoadStat {
    id: number;
    name: string;
    dynamicAccessKeyCount: number;
    serverCount: number;
    averageKeysPerServer: number | null;
    todayUsage: number;
    yesterdayUsage: number;
}

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

const getSnapshotUsage = async (serverId: number, startDate: Date, endDate: Date): Promise<number> => {
    const [baseline, snapshotsInRange] = await Promise.all([
        prisma.vnstatTrafficSnapshot.findFirst({
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
        prisma.vnstatTrafficSnapshot.findMany({
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
        const rxDiff = snapshot.rxBytes - previous.rxBytes;
        const txDiff = snapshot.txBytes - previous.txBytes;

        return total + (rxDiff > BigInt(0) ? rxDiff : BigInt(0)) + (txDiff > BigInt(0) ? txDiff : BigInt(0));
    }, BigInt(0));

    return Number(usage);
};

export async function createTag(data: any): Promise<void> {
    await prisma.tag.create({ data });

    revalidatePath("/tags");
}

export async function getTags(filters?: { term?: string; skip?: number; take?: number }): Promise<Tag[]> {
    const { term, skip, take } = filters || {};

    return prisma.tag.findMany({
        where: term ? { name: { contains: term } } : undefined,
        skip,
        take,
        orderBy: [{ id: "desc" }]
    });
}

export async function getTagsCount(filters?: { term?: string }): Promise<number> {
    const { term } = filters || {};

    if (term) {
        return prisma.tag.count({
            where: term ? { name: { contains: term } } : undefined
        });
    }

    return prisma.tag.count();
}

export async function getTagLoadStats(): Promise<TagLoadStat[]> {
    const now = new Date();
    const yesterday = new Date(now);

    yesterday.setDate(yesterday.getDate() - 1);

    const todayRange = {
        startDate: startOfDay(now),
        endDate: now
    };
    const yesterdayRange = {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday)
    };
    const [tags, dynamicAccessKeys] = await Promise.all([
        prisma.tag.findMany({
            include: {
                serverTags: {
                    select: {
                        serverId: true
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        }),
        prisma.dynamicAccessKey.findMany({
            where: {
                isSelfManaged: true,
                serverPoolType: "tag",
                serverPoolValue: {
                    not: null
                }
            },
            select: {
                id: true,
                serverPoolValue: true
            }
        })
    ]);

    const stats = await Promise.all(
        tags.map(async (tag) => {
            const dynamicAccessKeyCount = dynamicAccessKeys.filter((item) => {
                try {
                    return JSON.parse(item.serverPoolValue ?? "[]")
                        .map(String)
                        .includes(String(tag.id));
                } catch {
                    return false;
                }
            }).length;
            const serverIds = tag.serverTags.map((item) => item.serverId);
            const [todayUsages, yesterdayUsages] = await Promise.all([
                Promise.all(
                    serverIds.map((serverId) => getSnapshotUsage(serverId, todayRange.startDate, todayRange.endDate))
                ),
                Promise.all(
                    serverIds.map((serverId) =>
                        getSnapshotUsage(serverId, yesterdayRange.startDate, yesterdayRange.endDate)
                    )
                )
            ]);

            return {
                id: tag.id,
                name: tag.name,
                dynamicAccessKeyCount,
                serverCount: serverIds.length,
                averageKeysPerServer:
                    serverIds.length > 0 ? Number((dynamicAccessKeyCount / serverIds.length).toFixed(1)) : null,
                todayUsage: todayUsages.reduce((sum, value) => sum + value, 0),
                yesterdayUsage: yesterdayUsages.reduce((sum, value) => sum + value, 0)
            };
        })
    );

    return stats.sort((a, b) => b.dynamicAccessKeyCount - a.dynamicAccessKeyCount || a.name.localeCompare(b.name));
}

export async function getTagById(id: number) {
    return prisma.tag.findUnique({
        where: { id }
    });
}

export async function updateTag(data: any): Promise<void> {
    const { id, ...updateData } = data; // remove id

    await prisma.tag.update({
        where: { id },
        data: updateData
    });

    revalidatePath("/notification-channels");
    revalidatePath(`/notification-channels/${id}`);
}

export async function deleteTag(id: number): Promise<void> {
    await prisma.tag.delete({
        where: { id }
    });

    revalidatePath("/notification-channels");
    revalidatePath(`/notification-channels/${id}`);
}
