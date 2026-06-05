"use client";

import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    Input,
    Pagination,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { DynamicAccessKey, Tag } from "@prisma/client";
import { Link } from "@heroui/link";

import ConfirmModal from "@/src/components/modals/confirm-modal";
import { InfoIcon, PlusIcon, SelfManagedKeyIcon } from "@/src/components/icons";
import {
    DynamicAccessKeySortField,
    DynamicAccessKeyWithAccessKeysCountAndPoolTags,
    SortDirection
} from "@/src/core/definitions";
import {
    getDynamicAccessKeysPage,
    removeDynamicAccessKey,
    resetDynamicAccessKeyUsage
} from "@/src/core/actions/dynamic-access-key";
import { getTags } from "@/src/core/actions/tags";
import DynamicAccessKeyModal from "@/src/components/modals/dynamic-access-key-modal";
import { app, PAGE_SIZE } from "@/src/core/config";
import DynamicAccessKeyValidityChip from "@/src/components/dynamic-access-key-validity-chip";
import DynamicAccessKeysSslWarning from "@/src/components/dynamic-access-keys-ssl-warning";
import DynamicAccessKeyDataUsageChip from "@/src/components/dynamic-access-key-data-usage-chip";
import { useLanguage } from "@/src/components/language-provider";

interface SearchFormProps {
    term: string;
}

function OnlineStatusLight({ lastOnlineAt, language }: { lastOnlineAt: Date | null; language: "zh" | "en" }) {
    const lastOnlineTime = lastOnlineAt ? new Date(lastOnlineAt) : null;
    const offlineMinutes = lastOnlineTime
        ? Math.max(0, Math.floor((Date.now() - lastOnlineTime.getTime()) / 60000))
        : null;
    const isOnline = offlineMinutes !== null && offlineMinutes <= 5;
    const tooltip = isOnline
        ? language === "zh"
            ? "当前在线"
            : "Currently online"
        : lastOnlineTime
          ? language === "zh"
              ? `最后在线时间：${lastOnlineTime.toLocaleString("zh-CN", { hour12: false })} 离线时长：${offlineMinutes}分钟`
              : `Last online: ${lastOnlineTime.toLocaleString()} · Offline for ${offlineMinutes} minutes`
          : language === "zh"
            ? "暂无在线记录"
            : "No online activity recorded";

    return (
        <Tooltip content={tooltip} placement="top">
            <span
                aria-label={tooltip}
                className={`inline-block size-2.5 shrink-0 rounded-full ${
                    isOnline ? "bg-success shadow-[0_0_7px_hsl(var(--heroui-success))]" : "bg-default-400"
                }`}
            />
        </Tooltip>
    );
}

export default function DynamicAccessKeysList() {
    const [dynamicAccessKeys, setDynamicAccessKeys] = useState<DynamicAccessKeyWithAccessKeysCountAndPoolTags[]>([]);
    const [currentDynamicAccessKey, setCurrentDynamicAccessKey] = useState<DynamicAccessKey>();
    const [page, setPage] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(1);
    const [onlineItems, setOnlineItems] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [sortField, setSortField] = useState<DynamicAccessKeySortField>("id");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string>("");
    const requestId = useRef<number>(0);
    const { language, t } = useLanguage();

    const totalPage = Math.ceil(totalItems / PAGE_SIZE);
    const selectedTagLabel = selectedTagId
        ? (tags.find((tag) => String(tag.id) === selectedTagId)?.name ?? selectedTagId)
        : language === "zh"
          ? "全部标签"
          : "All Tags";
    const tagFilterItems = [
        { id: "all", name: selectedTagId ? (language === "zh" ? "全部标签" : "All Tags") : selectedTagLabel },
        ...tags.map((tag) => ({ id: String(tag.id), name: tag.name }))
    ];

    const deleteConfirmModalDisclosure = useDisclosure();
    const resetConfirmModalDisclosure = useDisclosure();
    const dynamicAccessKeyModalDisclosure = useDisclosure();

    const searchForm = useForm<SearchFormProps>();
    const handleSearch = async (data: SearchFormProps) => {
        const params = {
            term: data.term,
            sortField,
            sortDirection,
            tagId: selectedTagId || undefined
        };

        const currentRequestId = ++requestId.current;
        const result = await getDynamicAccessKeysPage(params, true);

        if (currentRequestId !== requestId.current) return;

        setTotalItems(result.total);
        setOnlineItems(result.online);
        setDynamicAccessKeys(result.items);
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
            sortDirection,
            tagId: selectedTagId || undefined
        };

        setIsLoading(true);
        const currentRequestId = ++requestId.current;

        try {
            const result = await getDynamicAccessKeysPage(params, true);

            if (currentRequestId !== requestId.current) return;

            setDynamicAccessKeys(result.items);
            setTotalItems(result.total);
            setOnlineItems(result.online);
        } finally {
            if (currentRequestId === requestId.current) setIsLoading(false);
        }
    }, [page, searchForm, selectedTagId, sortDirection, sortField]);

    useEffect(() => {
        updateData();
    }, [updateData]);

    useEffect(() => {
        const interval = window.setInterval(updateData, 60 * 1000);

        return () => window.clearInterval(interval);
    }, [updateData]);

    useEffect(() => {
        getTags().then(setTags);
    }, []);

    const handleSortFieldChange = (value: DynamicAccessKeySortField) => {
        if (value === sortField) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSortField(value);
            setSortDirection("asc");
        }

        setPage(1);
    };

    const getSortLabel = (field: DynamicAccessKeySortField, label: string) => {
        if (field !== sortField) return label;

        return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
    };

    return (
        <>
            <DynamicAccessKeyModal disclosure={dynamicAccessKeyModalDisclosure} value={getCurrentAccessKeyUrl()} />

            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>{t("deleteDynamicAccessKeyConfirm")}</span>
                        <p className="text-foreground-500 text-sm whitespace-pre-wrap break-all">
                            {getCurrentAccessKeyUrl()}
                        </p>
                    </div>
                }
                confirmLabel={t("delete")}
                disclosure={deleteConfirmModalDisclosure}
                title={t("deleteDynamicAccessKey")}
                onConfirm={handleDelete}
            />

            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>{t("resetDynamicAccessKeyConfirm")}</span>
                        <p className="text-foreground-500 text-sm whitespace-pre-wrap break-all">
                            {t("resetDynamicAccessKeyNote")}
                        </p>
                    </div>
                }
                confirmLabel={t("reset")}
                disclosure={resetConfirmModalDisclosure}
                title={t("resetDynamicAccessKey")}
                onConfirm={handleReset}
            />

            <div className="grid gap-4">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <h1 className="whitespace-nowrap text-sm font-medium sm:text-xl">{t("dynamicAccessKeys")}</h1>

                        <Tooltip content={t("dynamicAccessKeysHelp")}>
                            <Link href={app.links.outlineVpn.dynamicAccessKeys} target="_blank">
                                <InfoIcon className="size-4 sm:size-5" />
                            </Link>
                        </Tooltip>
                    </div>

                    <form
                        className="min-w-[105px] flex-1 sm:max-w-[190px]"
                        onSubmit={searchForm.handleSubmit(handleSearch)}
                    >
                        <Input
                            className="w-full"
                            placeholder={t("nameSearchPlaceholder")}
                            size="sm"
                            startContent={<>🔍</>}
                            variant="faded"
                            {...searchForm.register("term")}
                        />
                    </form>

                    <Tooltip content={language === "zh" ? "当前在线人数 / 总人数" : "Currently online / Total"}>
                        <div className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-default-100 px-2 text-xs font-medium">
                            <span className="size-2 rounded-full bg-success shadow-[0_0_5px_hsl(var(--heroui-success))]" />
                            <span>
                                {onlineItems}/{totalItems}
                            </span>
                        </div>
                    </Tooltip>
                </div>

                <DynamicAccessKeysSslWarning />

                <div className="overflow-x-auto pb-1">
                    <div className="flex min-w-full w-max items-center gap-2">
                        <ButtonGroup className="shrink-0" variant="flat">
                            <Button
                                className="min-w-0 px-2 sm:px-3"
                                color={sortField === "name" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("name")}
                            >
                                {getSortLabel("name", t("keyName"))}
                            </Button>
                            <Button
                                className="min-w-0 px-2 sm:px-3"
                                color={sortField === "remainingData" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("remainingData")}
                            >
                                {getSortLabel("remainingData", t("remainingData"))}
                            </Button>
                            <Button
                                className="min-w-0 px-2 sm:px-3"
                                color={sortField === "expiresAt" ? "primary" : "default"}
                                isDisabled={isLoading}
                                onPress={() => handleSortFieldChange("expiresAt")}
                            >
                                {getSortLabel("expiresAt", t("expiresAt"))}
                            </Button>
                        </ButtonGroup>

                        <Dropdown>
                            <DropdownTrigger>
                                <Button className="shrink-0 px-3" isDisabled={isLoading} variant="flat">
                                    {selectedTagLabel}
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                aria-label={language === "zh" ? "按标签筛选" : "Filter by tag"}
                                items={tagFilterItems}
                                selectedKeys={new Set([selectedTagId || "all"])}
                                selectionMode="single"
                                onSelectionChange={(keys) => {
                                    const key = Array.from(keys)[0]?.toString() ?? "all";

                                    setPage(1);
                                    setSelectedTagId(key === "all" ? "" : key);
                                }}
                            >
                                {(item) => <DropdownItem key={item.id}>{item.name}</DropdownItem>}
                            </DropdownMenu>
                        </Dropdown>

                        <Button
                            as={Link}
                            className="shrink-0 px-3"
                            color="primary"
                            href="/dynamic-access-keys/create"
                            startContent={<PlusIcon size={20} />}
                            variant="shadow"
                        >
                            {t("create")}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    {dynamicAccessKeys.map((item) => (
                        <Card key={item.id} className="md:w-[400px] w-full">
                            <CardHeader>
                                <div className="grid gap-1">
                                    <div className="flex max-w-[360px] items-center gap-2">
                                        <span className="truncate">{item.name}</span>
                                        <OnlineStatusLight language={language} lastOnlineAt={item.lastOnlineAt} />
                                    </div>
                                    <span className="max-w-[360px] truncate text-foreground-400 text-sm">
                                        {item.path}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardBody className="text-sm grid gap-2">
                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("id")}</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.id}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("managementType")}</span>
                                    {item.isSelfManaged ? (
                                        <Chip color="secondary" radius="sm" size="sm" variant="flat">
                                            {t("selfManaged")}
                                        </Chip>
                                    ) : (
                                        <Chip color="default" radius="sm" size="sm" variant="flat">
                                            {t("manual")}
                                        </Chip>
                                    )}
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("usedData")}</span>
                                    <DynamicAccessKeyDataUsageChip item={item} />
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("keyCount")}</span>
                                    <Chip
                                        color="default"
                                        radius="sm"
                                        size="sm"
                                        startContent={item.isSelfManaged && <SelfManagedKeyIcon size={18} />}
                                        variant="flat"
                                    >
                                        {item.isSelfManaged ? <span>{t("selfManaged")}</span> : item._count?.accessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("loadBalancer")}</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {item.loadBalancerAlgorithm}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("tags")}</span>
                                    {item.serverPoolTags.length > 0 ? (
                                        <div className="flex max-w-[240px] flex-wrap justify-end gap-1">
                                            {item.serverPoolTags.map((tag) => (
                                                <Chip key={tag} color="primary" radius="sm" size="sm" variant="flat">
                                                    {tag}
                                                </Chip>
                                            ))}
                                        </div>
                                    ) : (
                                        <Chip color="default" radius="sm" size="sm" variant="flat">
                                            {t("none")}
                                        </Chip>
                                    )}
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("validity")}</span>
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
                                        {t("share")}
                                    </Button>

                                    {item.isSelfManaged ? (
                                        <Button
                                            onPress={() => {
                                                setCurrentDynamicAccessKey(() => item);
                                                resetConfirmModalDisclosure.onOpen();
                                            }}
                                        >
                                            {t("reset")}
                                        </Button>
                                    ) : (
                                        <Button as={Link} href={`/dynamic-access-keys/${item.id}/access-keys`}>
                                            {t("accessKeys")}
                                        </Button>
                                    )}

                                    <Button as={Link} href={`/dynamic-access-keys/${item.id}/edit`}>
                                        {t("edit")}
                                    </Button>

                                    <Button
                                        color="danger"
                                        onPress={() => {
                                            setCurrentDynamicAccessKey(() => item);
                                            deleteConfirmModalDisclosure.onOpen();
                                        }}
                                    >
                                        {t("delete")}
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
