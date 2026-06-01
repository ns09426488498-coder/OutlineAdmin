"use client";

import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Input,
    Pagination,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { DynamicAccessKey } from "@prisma/client";
import { Link } from "@heroui/link";

import ConfirmModal from "@/src/components/modals/confirm-modal";
import { InfoIcon, PlusIcon, SelfManagedKeyIcon } from "@/src/components/icons";
import { DynamicAccessKeySortField, DynamicAccessKeyWithAccessKeysCount, SortDirection } from "@/src/core/definitions";
import {
    getDynamicAccessKeys,
    getDynamicAccessKeysCount,
    removeDynamicAccessKey,
    resetDynamicAccessKeyUsage
} from "@/src/core/actions/dynamic-access-key";
import DynamicAccessKeyModal from "@/src/components/modals/dynamic-access-key-modal";
import { app, PAGE_SIZE } from "@/src/core/config";
import DynamicAccessKeyValidityChip from "@/src/components/dynamic-access-key-validity-chip";
import DynamicAccessKeysSslWarning from "@/src/components/dynamic-access-keys-ssl-warning";
import DynamicAccessKeyDataUsageChip from "@/src/components/dynamic-access-key-data-usage-chip";

interface SearchFormProps {
    term: string;
}

export default function DynamicAccessKeysList() {
    const [dynamicAccessKeys, setDynamicAccessKeys] = useState<DynamicAccessKeyWithAccessKeysCount[]>([]);
    const [currentDynamicAccessKey, setCurrentDynamicAccessKey] = useState<DynamicAccessKey>();
    const [page, setPage] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [sortField, setSortField] = useState<DynamicAccessKeySortField>("id");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const totalPage = Math.ceil(totalItems / PAGE_SIZE);

    const deleteConfirmModalDisclosure = useDisclosure();
    const resetConfirmModalDisclosure = useDisclosure();
    const dynamicAccessKeyModalDisclosure = useDisclosure();

    const searchForm = useForm<SearchFormProps>();
    const handleSearch = async (data: SearchFormProps) => {
        const params = {
            term: data.term,
            sortField,
            sortDirection
        };

        const filteredServers = await getDynamicAccessKeys(params, true);
        const total = await getDynamicAccessKeysCount(params);

        setTotalItems(total);
        setDynamicAccessKeys(filteredServers);
        setPage(1);
    };

    const handleDelete = async () => {
        if (!currentDynamicAccessKey) return;

        await removeDynamicAccessKey(currentDynamicAccessKey.id);
        await updateData();
    };

    const handleReset = async () => {
        if (!currentDynamicAccessKey) return;

        await resetDynamicAccessKeyUsage(currentDynamicAccessKey.id);
        await updateData();
    };

    const getCurrentAccessKeyUrl = () => {
        if (!currentDynamicAccessKey) return;

        const swappedProtocol = window.location.origin.replace("http://", "ssconf://").replace("https://", "ssconf://");
        const name = encodeURIComponent(currentDynamicAccessKey.name);

        return `${swappedProtocol}/api/dak/${currentDynamicAccessKey.path}#${name}`;
    };

    const updateData = useCallback(async () => {
        const params = {
            skip: (page - 1) * PAGE_SIZE,
            term: searchForm.getValues("term"),
            sortField,
            sortDirection
        };

        setIsLoading(true);

        try {
            const data = await getDynamicAccessKeys(params, true);

            setDynamicAccessKeys(data);

            const count = await getDynamicAccessKeysCount(params);

            setTotalItems(count);
        } finally {
            setIsLoading(false);
        }
    }, [page, searchForm, sortDirection, sortField]);

    useEffect(() => {
        updateData();
    }, [updateData]);

    const handleSortFieldChange = (value: DynamicAccessKeySortField) => {
        setSortField(value);
        setSortDirection(value === "remainingData" ? "asc" : "desc");
        setPage(1);
    };

    const handleSortDirectionChange = (value: SortDirection) => {
        setSortDirection(value);
        setPage(1);
    };

    return (
        <>
            <DynamicAccessKeyModal disclosure={dynamicAccessKeyModalDisclosure} value={getCurrentAccessKeyUrl()} />

            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>确定要删除这个动态访问密钥吗？</span>
                        <p className="text-foreground-500 text-sm whitespace-pre-wrap break-all">
                            {getCurrentAccessKeyUrl()}
                        </p>
                    </div>
                }
                confirmLabel="删除"
                disclosure={deleteConfirmModalDisclosure}
                title="删除动态访问密钥"
                onConfirm={handleDelete}
            />

            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>确定要重置这个动态访问密钥吗？</span>
                        <p className="text-foreground-500 text-sm whitespace-pre-wrap break-all">
                            这个操作会将已用流量清零。自主管理密钥会在下次订阅请求时删除并重新创建。
                        </p>
                    </div>
                }
                confirmLabel="重置"
                disclosure={resetConfirmModalDisclosure}
                title="重置动态访问密钥"
                onConfirm={handleReset}
            />

            <div className="grid gap-4">
                <div className="flex gap-2 items-center">
                    <h1 className="text-xl">动态访问密钥</h1>

                    <Tooltip content="了解动态访问密钥">
                        <Link href={app.links.outlineVpn.dynamicAccessKeys} target="_blank">
                            <InfoIcon size={20} />
                        </Link>
                    </Tooltip>
                </div>

                <DynamicAccessKeysSslWarning />

                <div className="flex flex-wrap justify-between items-center gap-2">
                    <form onSubmit={searchForm.handleSubmit(handleSearch)}>
                        <Input
                            className="w-fit"
                            placeholder="名称 [+回车]"
                            startContent={<>🔍</>}
                            variant="faded"
                            {...searchForm.register("term")}
                        />
                    </form>

                    <div className="flex flex-wrap gap-2">
                        <ButtonGroup variant="flat">
                            <Button
                                color={sortField === "name" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("name")}
                            >
                                密钥名称
                            </Button>
                            <Button
                                color={sortField === "remainingData" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("remainingData")}
                            >
                                剩余流量
                            </Button>
                            <Button
                                color={sortField === "expiresAt" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("expiresAt")}
                            >
                                到期时间
                            </Button>
                        </ButtonGroup>

                        <ButtonGroup variant="flat">
                            <Button
                                color={sortDirection === "asc" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortDirectionChange("asc")}
                            >
                                升序
                            </Button>
                            <Button
                                color={sortDirection === "desc" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortDirectionChange("desc")}
                            >
                                降序
                            </Button>
                        </ButtonGroup>
                    </div>

                    <Button
                        as={Link}
                        color="primary"
                        href="/dynamic-access-keys/create"
                        startContent={<PlusIcon size={20} />}
                        variant="shadow"
                    >
                        新建
                    </Button>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    {dynamicAccessKeys.map((item) => (
                        <Card key={item.id} className="md:w-[400px] w-full">
                            <CardHeader>
                                <div className="grid gap-1">
                                    <span className="max-w-[360px] truncate">{item.name}</span>
                                    <span className="max-w-[360px] truncate text-foreground-400 text-sm">
                                        {item.path}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardBody className="text-sm grid gap-2">
                                <div className="flex gap-1 justify-between items-center">
                                    <span>ID</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.id}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>管理方式</span>
                                    {item.isSelfManaged ? (
                                        <Chip color="secondary" radius="sm" size="sm" variant="flat">
                                            自主管理
                                        </Chip>
                                    ) : (
                                        <Chip color="default" radius="sm" size="sm" variant="flat">
                                            手动
                                        </Chip>
                                    )}
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>已用流量</span>
                                    <DynamicAccessKeyDataUsageChip item={item} />
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>密钥数量</span>
                                    <Chip
                                        color="default"
                                        radius="sm"
                                        size="sm"
                                        startContent={item.isSelfManaged && <SelfManagedKeyIcon size={18} />}
                                        variant="flat"
                                    >
                                        {item.isSelfManaged ? <span>自动</span> : item._count?.accessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>负载均衡</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {item.loadBalancerAlgorithm}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>前缀</span>
                                    <Chip
                                        color={item.prefix ? "success" : "default"}
                                        radius="sm"
                                        size="sm"
                                        variant="flat"
                                    >
                                        {item.prefix ? item.prefix : "无"}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>有效期</span>
                                    <DynamicAccessKeyValidityChip dak={item} />
                                </div>
                            </CardBody>
                            <CardFooter>
                                <ButtonGroup color="default" fullWidth={true} size="sm" variant="flat">
                                    <Button
                                        onPress={() => {
                                            setCurrentDynamicAccessKey(() => item);
                                            dynamicAccessKeyModalDisclosure.onOpen();
                                        }}
                                    >
                                        分享
                                    </Button>

                                    {item.isSelfManaged ? (
                                        <Button
                                            onPress={() => {
                                                setCurrentDynamicAccessKey(() => item);
                                                resetConfirmModalDisclosure.onOpen();
                                            }}
                                        >
                                            重置
                                        </Button>
                                    ) : (
                                        <Button as={Link} href={`/dynamic-access-keys/${item.id}/access-keys`}>
                                            访问密钥
                                        </Button>
                                    )}

                                    <Button as={Link} href={`/dynamic-access-keys/${item.id}/edit`}>
                                        编辑
                                    </Button>

                                    <Button
                                        color="danger"
                                        onPress={() => {
                                            setCurrentDynamicAccessKey(() => item);
                                            deleteConfirmModalDisclosure.onOpen();
                                        }}
                                    >
                                        删除
                                    </Button>
                                </ButtonGroup>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {totalPage > 1 && dynamicAccessKeys.length > 0 && (
                    <div className="flex justify-center">
                        <Pagination initialPage={page} total={totalPage} variant="light" onChange={setPage} />
                    </div>
                )}
            </div>
        </>
    );
}
