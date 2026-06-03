import { Chip } from "@heroui/react";
import React from "react";
import { AccessKey } from "@prisma/client";

import { InfinityIcon } from "@/src/components/icons";
import { convertDataLimitToUnit, formatBytes } from "@/src/core/utils";
import { DataLimitUnit } from "@/src/core/definitions";
import { BYTES_TO_MB_RATE } from "@/src/core/config";

interface Props {
    item: AccessKey;
}

export default function AccessKeyDataUsageChip({ item }: Props) {
    const dataLimitInBytes = Number(item.dataLimit) * BYTES_TO_MB_RATE;
    const isExceeded = item.dataLimit && item.dataUsage >= dataLimitInBytes;

    return (
        <Chip color={isExceeded ? "danger" : "default"} radius="sm" size="sm" variant="flat">
            <div className="flex gap-2 items-center">
                <span>{formatBytes(Number(item.dataUsage))}</span>

                <span className="text-default-500">/ </span>
                {item.dataLimit ? (
                    <span>{formatBytes(convertDataLimitToUnit(Number(item.dataLimit), DataLimitUnit.MB))}</span>
                ) : (
                    <InfinityIcon size={20} />
                )}
            </div>
        </Chip>
    );
}
