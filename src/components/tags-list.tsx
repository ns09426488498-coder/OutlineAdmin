"use client";

import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Link,
    Pagination,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Tag } from "@prisma/client";

import { PAGE_SIZE } from "@/src/core/config";
import { DeleteIcon, EditIcon, PlusIcon } from "@/src/components/icons";
import NoResult from "@/src/components/no-result";
import ConfirmModal from "@/src/components/modals/confirm-modal";
import { deleteTag, getTags, getTagsCount, TagLoadStat } from "@/src/core/actions/tags";
import { formatBytes } from "@/src/core/utils";

interface Props {
    data: Tag[];
    loadStats: TagLoadStat[];
}

interface SearchFormProps {
    term: string;
}

export default function TagsList({ data, loadStats }: Props) {
    const [tags, setTags] = useState<Tag[]>(data);
    const [page, setPage] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [tag, setTag] = useState<Tag>();
    const deleteConfirmModalDisclosure = useDisclosure();
    const totalDynamicAccessKeys = loadStats.reduce((sum, item) => sum + item.dynamicAccessKeyCount, 0);
    const loadedTagsCount = loadStats.filter((item) => item.dynamicAccessKeyCount > 0).length;
    const totalYesterdayUsage = loadStats.reduce((sum, item) => sum + item.yesterdayUsage, 0);

    const handleDelete = async () => {
        if (!tag) return;

        await deleteTag(tag.id);
        await updateData();
    };

    const totalPage = Math.ceil(totalItems / PAGE_SIZE);

    const searchForm = useForm<SearchFormProps>();
    const handleSearch = async (data: SearchFormProps) => {
        const params = {
            term: data.term
        };

        const filteredServers = await getTags(params);
        const total = await getTagsCount(params);

        setTotalItems(total);
        setTags(filteredServers);
        setPage(1);
    };

    const updateData = async () => {
        const params = { skip: (page - 1) * PAGE_SIZE, term: searchForm.getValues("term") };

        setIsLoading(true);

        try {
            const data = await getTags(params);

            setTags(data);

            const count = await getTagsCount(params);

            setTotalItems(count);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        updateData();
    }, [page]);

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

                    <Card radius="sm">
                        <CardHeader className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold">标签承载排行</h2>
                                <p className="text-xs text-foreground-500">
                                    统计自主管理且服务器池类型为标签的动态密钥
                                </p>
                            </div>
                        </CardHeader>
                        <CardBody className="gap-2">
                            {loadStats.length === 0 ? (
                                <NoResult />
                            ) : (
                                loadStats.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid gap-3 rounded-md bg-default-100/60 p-3 dark:bg-content2 md:grid-cols-[minmax(120px,1fr)_auto_auto_auto_auto]"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">{item.name}</div>
                                            <div className="text-xs text-foreground-400">ID {item.id}</div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 md:grid md:justify-items-end">
                                            <span className="text-xs text-foreground-500 md:hidden">动态密钥</span>
                                            <Chip
                                                color={item.dynamicAccessKeyCount > 0 ? "primary" : "default"}
                                                size="sm"
                                                variant="flat"
                                            >
                                                {item.dynamicAccessKeyCount} 个客户
                                            </Chip>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-sm md:grid md:justify-items-end">
                                            <span className="text-xs text-foreground-500 md:hidden">服务器</span>
                                            <span>{item.serverCount} 台服务器</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-sm md:grid md:justify-items-end">
                                            <span className="text-xs text-foreground-500 md:hidden">平均承载</span>
                                            <span>
                                                {item.averageKeysPerServer === null
                                                    ? "-"
                                                    : `${item.averageKeysPerServer} 客户/台`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-sm md:grid md:justify-items-end">
                                            <span className="text-xs text-foreground-500 md:hidden">昨日/今日流量</span>
                                            <span>
                                                {formatBytes(item.yesterdayUsage)} / {formatBytes(item.todayUsage)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardBody>
                    </Card>
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
                    bottomContent={
                        totalPage > 1 && (
                            <div className="flex justify-center">
                                <Pagination initialPage={page} total={totalPage} variant="light" onChange={setPage} />
                            </div>
                        )
                    }
                    color="primary"
                    isCompact={false}
                    isHeaderSticky={true}
                    isStriped={true}
                    shadow="sm"
                >
                    <TableHeader>
                        <TableColumn>ID</TableColumn>
                        <TableColumn>NAME</TableColumn>
                        <TableColumn align="center">ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={<NoResult />} isLoading={isLoading} loadingContent={<Spinner />}>
                        {tags.map((tag) => (
                            <TableRow key={tag.id}>
                                <TableCell>{tag.id}</TableCell>
                                <TableCell>{tag.name}</TableCell>

                                <TableCell>
                                    <div className="flex gap-2 justify-center items-center">
                                        <Tooltip closeDelay={100} color="primary" content="编辑" delay={600} size="sm">
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

                                        <Tooltip closeDelay={100} color="danger" content="编辑" delay={600} size="sm">
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
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
