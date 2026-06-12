"use server";

import { revalidatePath } from "next/cache";
import { DynamicAccessKey, Prisma } from "@prisma/client";

import prisma from "@/prisma/db";
import {
    DynamicAccessKeySortField,
    DynamicAccessKeyStats,
    DynamicAccessKeyWithAccessKeys,
    DynamicAccessKeyWithAccessKeysCountAndPoolTags,
    DynamicAccessKeyWithAccessKeysCount,
    EditDynamicAccessKeyRequest,
    LoadBalancerAlgorithm,
    NewDynamicAccessKeyRequest,
    SortDirection
} from "@/src/core/definitions";
import { BYTES_TO_MB_RATE, PAGE_SIZE } from "@/src/core/config";
import { removeAccessKey } from "@/src/core/actions/access-key";

export type DynamicAccessKeyFilters = {
    term?: string;
    skip?: number;
    take?: number;
    sortField?: DynamicAccessKeySortField;
    sortDirection?: SortDirection;
    tagId?: string | null;
};

type DynamicAccessKeyTagSource = Pick<DynamicAccessKey, "isSelfManaged" | "serverPoolType" | "serverPoolValue">;

const getDynamicAccessKeyTagIds = (dak: DynamicAccessKeyTagSource): string[] => {
    if (!dak.isSelfManaged || dak.serverPoolType !== "tag" || !dak.serverPoolValue) return [];

    try {
        return JSON.parse(dak.serverPoolValue).map(String);
    } catch {
        return [];
    }
};

const isDynamicAccessKeyInTag = (dak: DynamicAccessKeyTagSource, tagId?: string | null): boolean => {
    if (!tagId) return true;

    return getDynamicAccessKeyTagIds(dak).includes(String(tagId));
};

const getDynamicAccessKeyExpiryTime = (dak: DynamicAccessKey): number => {
    if (dak.expiresAt) return dak.expiresAt.getTime();

    if (dak.usageStartedAt && dak.validityPeriod) {
        return dak.usageStartedAt.getTime() + Number(dak.validityPeriod) * 24 * 60 * 60 * 1000;
    }

    return Number.POSITIVE_INFINITY;
};

const getDynamicAccessKeyRemainingData = (dak: DynamicAccessKey): bigint | null => {
    if (dak.dataLimit === null) return null;

    return dak.dataLimit * BigInt(BYTES_TO_MB_RATE) - dak.dataUsage;
};

const withServerPoolTags = async (
    dynamicAccessKeys: DynamicAccessKeyWithAccessKeysCount[]
): Promise<DynamicAccessKeyWithAccessKeysCountAndPoolTags[]> => {
    const tags = await prisma.tag.findMany({
        select: {
            id: true,
            name: true
        }
    });
    const tagNamesById = new Map(tags.map((tag) => [String(tag.id), tag.name]));

    return dynamicAccessKeys.map((dak) => {
        const tagIds = getDynamicAccessKeyTagIds(dak);

        return {
            ...dak,
            serverPoolTags: tagIds.map((id) => tagNamesById.get(id)).filter(Boolean) as string[]
        };
    });
};

export async function getDynamicAccessKeys(
    filters?: DynamicAccessKeyFilters,
    withKeysCount: boolean = false
): Promise<DynamicAccessKeyWithAccessKeysCountAndPoolTags[]> {
    const { skip = 0, take = PAGE_SIZE, term, sortField = "id", sortDirection = "desc", tagId } = filters || {};
    const where: Prisma.DynamicAccessKeyWhereInput = {
        OR: term ? [{ name: { contains: term } }] : undefined
    };
    const include = {
        _count: withKeysCount ? { select: { accessKeys: true } } : undefined
    };

    if (tagId || sortField === "expiresAt" || sortField === "remainingData") {
        const data = await prisma.dynamicAccessKey.findMany({
            where,
            include
        });

        const sortedData = data
            .filter((item) => isDynamicAccessKeyInTag(item, tagId))
            .sort((a, b) => {
                let result: number;

                if (sortField === "remainingData") {
                    const aRemaining = getDynamicAccessKeyRemainingData(a);
                    const bRemaining = getDynamicAccessKeyRemainingData(b);

                    if (aRemaining === null && bRemaining === null) {
                        result = 0;
                    } else if (aRemaining === null) {
                        result = 1;
                    } else if (bRemaining === null) {
                        result = -1;
                    } else {
                        result = aRemaining < bRemaining ? -1 : aRemaining > bRemaining ? 1 : 0;
                    }
                } else if (sortField === "name") {
                    result = a.name.localeCompare(b.name);
                } else if (sortField === "id") {
                    result = a.id - b.id;
                } else {
                    result = getDynamicAccessKeyExpiryTime(a) - getDynamicAccessKeyExpiryTime(b);
                }

                const primarySortResult = sortDirection === "asc" ? result : -result;

                return primarySortResult || b.id - a.id;
            })
            .slice(skip, skip + take);

        return withServerPoolTags(sortedData);
    }

    const orderBy: Prisma.DynamicAccessKeyOrderByWithRelationInput[] = [{ [sortField]: sortDirection }, { id: "desc" }];

    const data = await prisma.dynamicAccessKey.findMany({
        where,
        skip,
        take,
        orderBy,
        include
    });

    return withServerPoolTags(data);
}

export async function getDynamicAccessKeysCount(filters?: { term?: string; tagId?: string | null }): Promise<number> {
    const { term, tagId } = filters || {};

    if (tagId) {
        const data = await prisma.dynamicAccessKey.findMany({
            where: {
                OR: term ? [{ name: { contains: term } }] : undefined
            }
        });

        return data.filter((item) => isDynamicAccessKeyInTag(item, tagId)).length;
    }

    return prisma.dynamicAccessKey.count({
        where: {
            OR: term ? [{ name: { contains: term } }] : undefined
        }
    });
}

export async function getDynamicAccessKeysOnlineSummary(filters?: {
    term?: string;
    tagId?: string | null;
}): Promise<{ online: number; total: number }> {
    const { term, tagId } = filters || {};
    const data = await prisma.dynamicAccessKey.findMany({
        where: {
            OR: term ? [{ name: { contains: term } }] : undefined
        },
        select: {
            isSelfManaged: true,
            serverPoolType: true,
            serverPoolValue: true,
            lastOnlineAt: true
        }
    });
    const filteredData = data.filter((item) => isDynamicAccessKeyInTag(item, tagId));
    const onlineThreshold = Date.now() - 5 * 60 * 1000;

    return {
        online: filteredData.filter((item) => item.lastOnlineAt && item.lastOnlineAt.getTime() >= onlineThreshold)
            .length,
        total: filteredData.length
    };
}

export async function getDynamicAccessKeysPage(
    filters?: DynamicAccessKeyFilters,
    withKeysCount: boolean = false
): Promise<{
    items: DynamicAccessKeyWithAccessKeysCountAndPoolTags[];
    online: number;
    total: number;
}> {
    const [items, summary] = await Promise.all([
        getDynamicAccessKeys(filters, withKeysCount),
        getDynamicAccessKeysOnlineSummary(filters)
    ]);

    return {
        items,
        ...summary
    };
}

export async function getDynamicAccessKeyById(
    id: number,
    withKeys: boolean = false
): Promise<DynamicAccessKeyWithAccessKeys | null> {
    return prisma.dynamicAccessKey.findFirst({
        where: {
            id
        },
        include: {
            accessKeys: withKeys
        }
    });
}

export async function findDynamicAccessKeyById(id: number): Promise<DynamicAccessKey | null> {
    return prisma.dynamicAccessKey.findFirst({
        where: {
            id
        }
    });
}

export async function getDynamicAccessKeyByPath(path: string): Promise<DynamicAccessKeyWithAccessKeys | null> {
    return prisma.dynamicAccessKey.findFirst({
        where: {
            path
        },
        include: {
            accessKeys: {
                where: {
                    server: {
                        isAvailable: true
                    }
                }
            }
        }
    });
}

export async function syncDynamicAccessKeyAccessKeys(
    dynamicAccessKeyId: number,
    accessKeyIds: number[]
): Promise<void> {
    await prisma.dynamicAccessKey.update({
        where: { id: dynamicAccessKeyId },
        data: {
            accessKeys: {
                set: accessKeyIds.map((id) => ({ id }))
            }
        }
    });

    revalidatePath("/dynamic-access-keys");
}

export async function createDynamicAccessKey(data: NewDynamicAccessKeyRequest): Promise<void> {
    await prisma.dynamicAccessKey.create({
        data: {
            name: data.name,
            path: data.path,
            loadBalancerAlgorithm: data.loadBalancerAlgorithm || LoadBalancerAlgorithm.UserIpAddress,
            prefix: data.prefix,
            expiresAt: data.expiresAt,
            isSelfManaged: data.isSelfManaged,
            serverPoolType: data.serverPoolType,
            serverPoolValue: data.serverPoolValue,
            dataLimit: data.dataLimit,
            validityPeriod: data.validityPeriod?.toString() ?? null,
            usageStartedAt: data.setUsageDateOnFirstConnection ? null : new Date()
        }
    });

    revalidatePath("/dynamic-access-keys");
}

export async function updateDynamicAccessKey(data: EditDynamicAccessKeyRequest): Promise<void> {
    await prisma.dynamicAccessKey.update({
        where: { id: data.id },
        data: {
            name: data.name,
            path: data.path,
            loadBalancerAlgorithm: data.loadBalancerAlgorithm || LoadBalancerAlgorithm.UserIpAddress,
            prefix: data.prefix,
            expiresAt: data.expiresAt,
            isSelfManaged: data.isSelfManaged,
            serverPoolType: data.serverPoolType,
            serverPoolValue: data.serverPoolValue,
            dataLimit: data.dataLimit,
            validityPeriod: data.validityPeriod?.toString() ?? null,
            activeServerId: null // reset the active server
        }
    });

    revalidatePath("/dynamic-access-keys");
}

export async function resetDynamicAccessKeyUsage(id: number): Promise<void> {
    const dak = await prisma.dynamicAccessKey.findUnique({
        where: { id }
    });

    if (!dak) {
        return;
    }

    if (dak.isSelfManaged) {
        await removeSelfManagedDynamicAccessKeyAccessKeys(id);
    }

    await prisma.dynamicAccessKey.update({
        where: { id },
        data: {
            dataUsage: 0,
            usageStartedAt: null,
            activeServerId: null
        }
    });

    revalidatePath("/dynamic-access-keys");
}

export async function removeDynamicAccessKey(id: number): Promise<void> {
    const dak = await prisma.dynamicAccessKey.findUnique({
        where: { id }
    });

    if (!dak) {
        return;
    }

    await removeSelfManagedDynamicAccessKeyAccessKeys(id);

    await prisma.dynamicAccessKey.delete({
        where: { id }
    });

    revalidatePath("/dynamic-access-keys");
}

export async function removeSelfManagedDynamicAccessKeyAccessKeys(id: number): Promise<void> {
    const pattern = `self-managed-dak-access-key-${id}`;
    const accessKeys = await prisma.accessKey.findMany({
        where: {
            name: pattern
        }
    });

    if (accessKeys.length > 0) {
        for (const accessKey of accessKeys) {
            await removeAccessKey(accessKey.serverId, accessKey.id, accessKey.apiId, false);
        }
    }
}

export async function getDynamicAccessKeyStatsByPath(path: string): Promise<DynamicAccessKeyStats | null> {
    const dak = await prisma.dynamicAccessKey.findFirst({
        where: {
            path
        }
    });

    if (!dak) return null;

    return {
        name: dak.name,
        path: dak.path,
        validityPeriod: dak.validityPeriod,
        dataLimit: Number(dak.dataLimit),
        dataUsage: Number(dak.dataUsage),
        usageStartedAt: dak.usageStartedAt,
        prefix: dak.prefix,
        isSelfManaged: dak.isSelfManaged,
        expiresAt: dak.expiresAt
    };
}
