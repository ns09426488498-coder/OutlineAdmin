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
    NewDynamicAccessKeyRequest,
    SortDirection
} from "@/src/core/definitions";
import { BYTES_TO_MB_RATE, PAGE_SIZE } from "@/src/core/config";
import { removeAccessKey } from "@/src/core/actions/access-key";

type DynamicAccessKeyFilters = {
    term?: string;
    skip?: number;
    take?: number;
    sortField?: DynamicAccessKeySortField;
    sortDirection?: SortDirection;
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
        let tagIds: string[] = [];

        if (dak.isSelfManaged && dak.serverPoolType === "tag" && dak.serverPoolValue) {
            try {
                tagIds = JSON.parse(dak.serverPoolValue).map(String);
            } catch {
                tagIds = [];
            }
        }

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
    const { skip = 0, take = PAGE_SIZE, term, sortField = "id", sortDirection = "desc" } = filters || {};
    const where: Prisma.DynamicAccessKeyWhereInput = {
        OR: term ? [{ name: { contains: term } }] : undefined
    };
    const include = {
        _count: withKeysCount ? { select: { accessKeys: true } } : undefined
    };

    if (sortField === "expiresAt" || sortField === "remainingData") {
        const data = await prisma.dynamicAccessKey.findMany({
            where,
            include
        });

        const sortedData = data
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
                } else {
                    result = getDynamicAccessKeyExpiryTime(a) - getDynamicAccessKeyExpiryTime(b);
                }

                return sortDirection === "asc" ? result : -result;
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

export async function getDynamicAccessKeysCount(filters?: { term?: string }): Promise<number> {
    const { term } = filters || {};

    return prisma.dynamicAccessKey.count({
        where: {
            OR: term ? [{ name: { contains: term } }] : undefined
        }
    });
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
            loadBalancerAlgorithm: data.loadBalancerAlgorithm,
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
            loadBalancerAlgorithm: data.loadBalancerAlgorithm,
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
