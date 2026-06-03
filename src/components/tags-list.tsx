"use client";

import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Link,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Tag } from "@prisma/client";

import { DeleteIcon, EditIcon, PlusIcon } from "@/src/components/icons";
import NoResult from "@/src/components/no-result";
import ConfirmModal from "@/src/components/modals/confirm-modal";
import { deleteTag, getTags, TagLoadStat } from "@/src/core/actions/tags";
import { formatBytes } from "@/src/core/utils";

interface Props {
    data: Tag[];
    loadStats: TagLoadStat[];
}

interface SearchFormProps {
    term: string;
}

type TagTableSortField = "id" | "name" | "dynamicAccessKeyCount" | "serverCount" | "yesterdayUsage" | "todayUsage";
type SortDirection = "asc" | "desc";

export default function TagsList({ data, loadStats }: Props) {
    const [tags, setTags] = useState<Tag[]>(data);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [tag, setTag] = useState<Tag>();
    const [sortField, setSortField] = useState<TagTableSortField>("dynamicAccessKeyCount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const deleteConfirmModalDisclosure = useDisclosure();
    const totalDynamicAccessKeys = loadStats.reduce((sum, item) => sum + item.dynamicAccessKeyCount, 0);
    const loadedTagsCount = loadStats.filter((item) => item.dynamicAccessKeyCount > 0).length;
    const totalYesterdayUsage = loadStats.reduce((sum, item) => sum + item.yesterdayUsage, 0);
    const loadStatsByTagId = useMemo(() => {
        return new Map(loadStats.map((item) => [item.id, item]));
    }, [loadStats]);
    const sortedTags = useMemo(() => {
        return [...tags].sort((a, b) => {
            const aStats = loadStatsByTagId.get(a.id);
            const bStats = loadStatsByTagId.get(b.id);
            let result: number;

            if (sortField === "name") {
                result = a.name.localeCompare(b.name);
            } else if (sortField === "id") {
                result = a.id - b.id;
            } else {
                result = (aStats?.[sortField] ?? 0) - (bStats?.[sortField] ?? 0);
            }

            return sortDirection === "asc" ? result : -result;
        });
    }, [loadStatsByTagId, sortDirection, sortField, tags]);

    const handleDelete = async () => {
        if (!tag) return;

        await deleteTag(tag.id);
        await updateData();
    };

    const searchForm = useForm<SearchFormProps>();
    const handleSearch = async (data: SearchFormProps) => {
        const params = {
            term: data.term
        };

        const filteredServers = await getTags(params);

        setTags(filteredServers);
    };

    const updateData = async () => {
        const params = { term: searchForm.getValues("term") };

        setIsLoading(true);

        try {
            const data = await getTags(params);

            setTags(data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = (field: TagTableSortField) => {
        if (field === sortField) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection(field === "name" || field === "id" ? "asc" : "desc");
        }
    };

    const renderSortHeader = (field: TagTableSortField, label: string) => (
        <Button
            className="h-auto min-w-0 p-0 text-xs font-semibold"
            size="sm"
            variant="light"
            onPress={() => handleSort(field)}
        >
            {label}
            {sortField === field ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
        </Button>
    );

    return (
        <>
            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>
                            确定要删除标签 <q>{tag?.name}</q> 吗？
                        </span>
                    </div>
                }
                confirmLabel="删除"
                disclosure={deleteConfirmModalDisclosure}
                title="删除标签"
                onConfirm={handleDelete}
            />

            <div className="grid gap-4">
                <section className="flex justify-start items-center gap-2">
                    <h1 className="text-xl">标签</h1>
                </section>

                <section className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Card radius="sm">
                            <CardBody className="gap-1">
                                <span className="text-xs text-foreground-500">动态密钥总数</span>
                                <span className="text-2xl font-semibold">{totalDynamicAccessKeys}</span>
                            </CardBody>
                        </Card>
                        <Card radius="sm">
                            <CardBody className="gap-1">
                                <span className="text-xs text-foreground-500">有承载的标签</span>
                                <span className="text-2xl font-semibold">
                                    {loadedTagsCount}
                                    <span className="text-sm font-normal text-foreground-500">
                                        {" "}
                                        / {loadStats.length}
                                    </span>
                                </span>
                            </CardBody>
                        </Card>
                        <Card radius="sm">
                            <CardBody className="gap-1">
                                <span className="text-xs text-foreground-500">昨日标签流量</span>
                                <span className="text-2xl font-semibold">{formatBytes(totalYesterdayUsage)}</span>
                            </CardBody>
                        </Card>
                    </div>
                </section>

                <div className="flex justify-between items-center gap-2">
                    <form onSubmit={searchForm.handleSubmit(handleSearch)}>
                        <Input
                            className="w-fit"
                            placeholder="名称 [+回车]"
                            startContent={<>🔍</>}
                            variant="faded"
                            {...searchForm.register("term")}
                        />
                    </form>

                    <Button
                        as={Link}
                        color="primary"
                        href="/tags/create"
                        startContent={<PlusIcon size={20} />}
                        variant="shadow"
                    >
                        Add
                    </Button>
                </div>

                <Table
                    aria-label="标签列表"
                    color="primary"
                    isCompact={false}
                    isHeaderSticky={true}
                    isStriped={true}
                    shadow="sm"
                >
                    <TableHeader>
                        <TableColumn>{renderSortHeader("id", "ID")}</TableColumn>
                        <TableColumn>{renderSortHeader("name", "名称")}</TableColumn>
                        <TableColumn>{renderSortHeader("dynamicAccessKeyCount", "动态密钥")}</TableColumn>
                        <TableColumn>{renderSortHeader("serverCount", "服务器")}</TableColumn>
                        <TableColumn>{renderSortHeader("yesterdayUsage", "昨日流量")}</TableColumn>
                        <TableColumn>{renderSortHeader("todayUsage", "今日流量")}</TableColumn>
                        <TableColumn align="center">操作</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={<NoResult />} isLoading={isLoading}>
                        {sortedTags.map((tag) => {
                            const stats = loadStatsByTagId.get(tag.id);

                            return (
                                <TableRow key={tag.id}>
                                    <TableCell>{tag.id}</TableCell>
                                    <TableCell>{tag.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            color={(stats?.dynamicAccessKeyCount ?? 0) > 0 ? "primary" : "default"}
                                            size="sm"
                                            variant="flat"
                                        >
                                            {stats?.dynamicAccessKeyCount ?? 0}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>{stats?.serverCount ?? 0}</TableCell>
                                    <TableCell>{formatBytes(stats?.yesterdayUsage ?? 0)}</TableCell>
                                    <TableCell>{formatBytes(stats?.todayUsage ?? 0)}</TableCell>

                                    <TableCell>
                                        <div className="flex gap-2 justify-center items-center">
                                            <Tooltip
                                                closeDelay={100}
                                                color="primary"
                                                content="编辑"
                                                delay={600}
                                                size="sm"
                                            >
                                                <Button
                                                    as={Link}
                                                    color="primary"
                                                    href={`/tags/${tag.id}/edit`}
                                                    isIconOnly={true}
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    <EditIcon size={24} />
                                                </Button>
                                            </Tooltip>

                                            <Tooltip
                                                closeDelay={100}
                                                color="danger"
                                                content="删除"
                                                delay={600}
                                                size="sm"
                                            >
                                                <Button
                                                    color="danger"
                                                    isIconOnly={true}
                                                    size="sm"
                                                    variant="light"
                                                    onPress={() => {
                                                        setTag(() => tag);
                                                        deleteConfirmModalDisclosure.onOpen();
                                                    }}
                                                >
                                                    <DeleteIcon size={24} />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
