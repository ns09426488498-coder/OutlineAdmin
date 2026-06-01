"use client";

import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Link,
    Pagination,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { AccessKey } from "@prisma/client";

import AccessKeyModal from "@/src/components/modals/access-key-modal";
import ConfirmModal from "@/src/components/modals/confirm-modal";
import { ArrowLeftIcon, PlusIcon } from "@/src/components/icons";
import AccessKeyServerInfo from "@/src/components/access-key-server-info";
import { getAccessKeys, removeAccessKey } from "@/src/core/actions/access-key";
import { ServerWithTags } from "@/src/core/definitions";
import AccessKeyValidityChip from "@/src/components/access-key-validity-chip";
import MessageModal from "@/src/components/modals/message-modal";
import { AccessKeyPrefixes } from "@/src/core/outline/access-key-prefix";
import { syncServer } from "@/src/core/actions/server";
import { PAGE_SIZE } from "@/src/core/config";
import AccessKeyDataUsageChip from "@/src/components/access-key-data-usage-chip";

interface Props {
    server: ServerWithTags;
    total: number;
}

export default function ServerAccessKeys({ server, total }: Props) {
    const accessKeyModalDisclosure = useDisclosure();
    const removeAccessKeyConfirmModalDisclosure = useDisclosure();
    const apiErrorModalDisclosure = useDisclosure();

    const totalPage = Math.ceil(total / PAGE_SIZE);

    const [accessKeys, setAccessKeys] = useState<AccessKey[]>([]);
    const [serverError, setServerError] = useState<string>();
    const [formattedAccessKey, setFormattedAccessKey] = useState<string>();
    const [currentAccessKey, setCurrentAccessKey] = useState<AccessKey>();
    const [page, setPage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleRemoveAccessKey = async () => {
        if (!currentAccessKey) return;
        try {
            await removeAccessKey(server.id, currentAccessKey.id, currentAccessKey.apiId);
            await updateData();
        } catch (error) {
            setServerError((error as object).toString());
            apiErrorModalDisclosure.onOpen();
        } finally {
            await syncServer(server);
        }
    };

    const updateData = async () => {
        setIsLoading(true);

        try {
            const data = await getAccessKeys(server.id, { skip: (page - 1) * PAGE_SIZE });

            setAccessKeys(data);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!currentAccessKey) return;

        let prefixUrlValue = "";

        if (currentAccessKey.prefix) {
            const prefix = AccessKeyPrefixes.find((x) => x.type === currentAccessKey.prefix);

            if (prefix) {
                if (currentAccessKey.accessUrl.endsWith("?outline=1")) {
                    prefixUrlValue = `&prefix=${prefix.urlEncodedValue}`;
                } else {
                    prefixUrlValue = `?prefix=${prefix.urlEncodedValue}`;
                }
            }
        }

        setFormattedAccessKey(
            `${currentAccessKey.accessUrl}${prefixUrlValue}#${encodeURIComponent(currentAccessKey.name)}`
        );
    }, [currentAccessKey]);

    useEffect(() => {
        updateData();
    }, [page]);

    return (
        <>
            <AccessKeyModal disclosure={accessKeyModalDisclosure} value={formattedAccessKey} />

            <MessageModal
                body={
                    <div className="grid gap-2">
                        <span>无法删除访问密钥，发生错误。</span>
                        <pre className="text-sm break-words whitespace-pre-wrap text-danger-500">{serverError}</pre>
                    </div>
                }
                disclosure={apiErrorModalDisclosure}
                title="删除访问密钥"
            />

            <ConfirmModal
                body={
                    <div className="grid gap-2">
                        <span>确定要移除这个访问密钥吗？</span>
                        <p className="text-default-500 text-sm whitespace-pre-wrap break-all">{formattedAccessKey}</p>
                    </div>
                }
                confirmLabel="删除"
                disclosure={removeAccessKeyConfirmModalDisclosure}
                title="Remove Access Key"
                onConfirm={handleRemoveAccessKey}
            />

            <div className="grid gap-6">
                <section className="flex justify-between items-center gap-2">
                    <section className="flex items-center gap-2">
                        <Tooltip closeDelay={100} color="default" content="服务器" delay={600} size="sm">
                            <Button as={Link} href="/servers" isIconOnly={true} size="sm" variant="light">
                                <ArrowLeftIcon size={20} />
                            </Button>
                        </Tooltip>

                        <h1 className="text-xl">{server.name}</h1>
                    </section>

                    <Button
                        as={Link}
                        color="primary"
                        href={`/servers/${server.id}/settings?return=/servers/${server.id}/access-keys`}
                        variant="light"
                    >
                        Settings
                    </Button>
                </section>

                <AccessKeyServerInfo numberOfKeys={accessKeys.length} server={server} />

                <section className="grid gap-6">
                    <div className="flex justify-between items-center gap-2">
                        <h1 className="text-xl">🗝️ 访问密钥</h1>

                        <Button
                            as={Link}
                            color="primary"
                            href={`/servers/${server.id}/access-keys/create`}
                            startContent={<PlusIcon size={20} />}
                            variant="shadow"
                        >
                            Create
                        </Button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        {accessKeys.map((item) => (
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
                                        <span>已用流量</span>
                                        <AccessKeyDataUsageChip item={item} />
                                    </div>

                                    <div className="flex gap-1 justify-between items-center">
                                        <span>有效期</span>
                                        <AccessKeyValidityChip value={item.expiresAt} />
                                    </div>

                                    <div className="flex gap-1 justify-between items-center">
                                        <span>流量上限</span>
                                        <Chip
                                            color={item.prefix ? "success" : "default"}
                                            radius="sm"
                                            size="sm"
                                            variant="flat"
                                        >
                                            {item.prefix ? item.prefix : "?"}
                                        </Chip>
                                    </div>
                                </CardBody>
                                <CardFooter>
                                    <ButtonGroup color="default" fullWidth={true} size="sm" variant="flat">
                                        <Button
                                            onPress={() => {
                                                setCurrentAccessKey(() => item);
                                                accessKeyModalDisclosure.onOpen();
                                            }}
                                        >
                                            Share
                                        </Button>

                                        <Button as={Link} href={`/servers/${server.id}/access-keys/${item.id}/edit`}>
                                            Edit
                                        </Button>

                                        <Button
                                            color="danger"
                                            onPress={() => {
                                                setCurrentAccessKey(() => item);
                                                removeAccessKeyConfirmModalDisclosure.onOpen();
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </ButtonGroup>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {totalPage > 1 && (
                        <div className="flex justify-center">
                            <Pagination initialPage={page} total={totalPage} variant="light" onChange={setPage} />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
