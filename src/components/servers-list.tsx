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
import { useLanguage } from "@/src/components/language-provider";

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
    const { t } = useLanguage();

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
                        <span>{t("removeServerConfirm")}</span>
                        <p className="text-default-500 text-sm">{t("removeServerNote")}</p>
                    </div>
                }
                confirmLabel={t("remove")}
                disclosure={removeServerConfirmModalDisclosure}
                title={t("removeServer")}
                onConfirm={handleRemoveServer}
            />

            <div className="grid gap-4">
                <h1 className="text-xl">{t("servers")}</h1>

                <div className="flex justify-between items-center gap-2">
                    <form onSubmit={searchForm.handleSubmit(handleSearch)}>
                        <Input
                            className="w-fit"
                            placeholder={t("nameOrHostSearchPlaceholder")}
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
                        {t("add")}
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
                                    <span>{t("id")}</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.id}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("hostIp")}</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.hostnameOrIp}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("newAccessKeyHost")}</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.hostnameForNewAccessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("newAccessKeyPort")}</span>
                                    <Chip radius="sm" size="sm" variant="flat">
                                        {item.portForNewAccessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("keyCount")}</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {item._count?.accessKeys}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("totalUsedData")}</span>
                                    <Chip color="default" radius="sm" size="sm" variant="flat">
                                        {formatBytes(Number(item.totalDataUsage))}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("status")}</span>
                                    <Chip
                                        color={item.isAvailable ? "success" : "danger"}
                                        radius="sm"
                                        size="sm"
                                        variant="flat"
                                    >
                                        {item.isAvailable ? t("available") : t("unavailable")}
                                    </Chip>
                                </div>

                                <div className="flex gap-1 justify-between items-center">
                                    <span>{t("tags")}</span>

                                    {item.tags.length > 0 ? (
                                        <div className="flex gap-2 justify-end items-center flex-wrap">
                                            {item.tags.map((tag) => (
                                                <Chip
                                                    key={tag.tag.id}
                                                    color="default"
                                                    radius="sm"
                                                    size="sm"
                                                    variant="flat"
                                                >
                                                    {tag.tag.name}
                                                </Chip>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-foreground-400">-</span>
                                    )}
                                </div>
                            </CardBody>
                            <CardFooter>
                                <ButtonGroup color="default" fullWidth={true} size="sm" variant="flat">
                                    <Button as={Link} href={`/servers/${item.id}/access-keys`}>
                                        {t("accessKeys")}
                                    </Button>

                                    <Button as={Link} href={`/servers/${item.id}/settings`}>
                                        {t("serverSettings")}
                                    </Button>

                                    <Button as={Link} href={`/servers/${item.id}/metrics`}>
                                        {t("metrics")}
                                    </Button>

                                    <Button
                                        color="danger"
                                        onPress={() => {
                                            setServerToRemove(item.id);
                                            removeServerConfirmModalDisclosure.onOpen();
                                        }}
                                    >
                                        {t("delete")}
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
