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
    Link,
    useDisclosure
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import ConfirmModal from "@/src/components/modals/confirm-modal";
import { PlusIcon } from "@/src/components/icons";
import { getServersWithTags, removeServer } from "@/src/core/actions/server";
import { ServerWithAccessKeysCountAndTags } from "@/src/core/definitions";
import { formatBytes } from "@/src/core/utils";
import { app } from "@/src/core/config";

interface Props {
    data: ServerWithAccessKeysCountAndTags[];
}

interface SearchFormProps {
    term: string;
}

export default function ServersList({ data }: Props) {
    const [servers, setServers] = useState<ServerWithAccessKeysCountAndTags[]>(data);
    const [serverToRemove, setServerToRemove] = useState<number | null>(null);
    const removeServerConfirmModalDisclosure = useDisclosure();

    const searchForm = useForm<SearchFormProps>();
    const handleSearch = async (data: SearchFormProps) => {
        const filteredServers = await getServersWithTags(
            {
                term: data.term
            },
            true
        );

        setServers(filteredServers);
    };

    const handleRemoveServer = async () => {
        if (!serverToRemove) return;

        await removeServer(serverToRemove);
    };

    useEffect(() => {
        setServers(data);
    }, [data]);

    return (
        <>
            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>确定要移除这台服务器吗？</span>
                        <p className="text-default-500 text-sm">
                            请注意，此操作只会从 {app.name} 的数据库中移除服务器，不会影响服务器本身。
                        </p>
                    </div>
                }
                confirmLabel="移除"
                disclosure={removeServerConfirmModalDisclosure}
                title="移除服务器"
                onConfirm={handleRemoveServer}
            />

            <div className="grid gap-4">
                <h1 className="text-xl">服务器</h1>

                <div className="flex justify-between items-center gap-2">
                    <form onSubmit={searchForm.handleSubmit(handleSearch)}>
                        <Input
                            className="w-fit"
                            placeholder="名称或主机名 [+回车]"
                            startContent={<>🔍</>}
                            variant="faded"
                            {...searchForm.register("term")}
                        />
                    </form>

                    <Button
                        as={Link}
                        color="primary"
                        href="/servers/add"
                        startContent={<PlusIcon size={20} />}
                        variant="shadow"
                    >
                        添加
                    </Button>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    {servers.map((item) => (
                        <Card key={item.id} className="md:w-[400px] w-full">
                            <CardHeader>
                                <div className="grid gap-1">
                                    <span className="max-w-[360px] truncate">{item.name}</span>
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
                                    <span>主机/IP</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.hostnameOrIp}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>新访问密钥主机/IP</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.hostnameForNewAccessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>新访问密钥端口</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.portForNewAccessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>密钥数量</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {item._count?.accessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>总已用流量</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {formatBytes(Number(item.totalDataUsage))}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>状态</span>
                                    <Chip
                                        color={item.isAvailable ? "success" : "danger"}
                                        radius="sm"
                                        size="sm"
                                        variant="flat"
                                    >
                                        {item.isAvailable ? "可用" : "不可用"}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>状态</span>

                                    {item.tags.length > 0 ? (
                                        <div className="flex gap-2 justify-end items-center flex-wrap">
                                            {item.tags.map((t) => (
                                                <Chip
                                                    key={t.tag.id}
                                                    color="default"
                                                    radius="sm"
                                                    size="sm"
                                                    variant="flat"
                                                >
                                                    {t.tag.name}
                                                </Chip>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-foreground-400">¯\_(ツ)_/¯</span>
                                    )}
                                </div>
                            </CardBody>
                            <CardFooter>
                                <ButtonGroup color="default" fullWidth={true} size="sm" variant="flat">
                                    <Button as={Link} href={`/servers/${item.id}/access-keys`}>
                                        访问密钥
                                    </Button>

                                    <Button as={Link} href={`/servers/${item.id}/settings`}>
                                        设置
                                    </Button>

                                    <Button as={Link} href={`/servers/${item.id}/metrics`}>
                                        监控指标
                                    </Button>

                                    <Button
                                        color="danger"
                                        onPress={() => {
                                            setServerToRemove(item.id);
                                            removeServerConfirmModalDisclosure.onOpen();
                                        }}
                                    >
                                        删除
                                    </Button>
                                </ButtonGroup>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}
