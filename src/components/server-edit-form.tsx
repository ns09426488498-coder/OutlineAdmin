"use client";

import { Button, Checkbox, CheckboxGroup, Divider, Input, Link, Tooltip, useDisclosure } from "@heroui/react";
import React, { useState } from "react";
import { Tag } from "@prisma/client";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";

import { ArrowLeftIcon } from "@/src/components/icons";
import { EditServerRequest, ServerWithTags } from "@/src/core/definitions";
import { removeServer, updateServer } from "@/src/core/actions/server";
import ConfirmModal from "@/src/components/modals/confirm-modal";
import MessageModal from "@/src/components/modals/message-modal";
import { app } from "@/src/core/config";

interface Props {
    server: ServerWithTags;
    tags: Tag[];
}

export default function ServerEditForm({ server, tags }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("return");

    const updateErrorModalDisclosure = useDisclosure();
    const removeServerConfirmModalDisclosure = useDisclosure();

    const [serverError, setServerError] = useState<string>();

    const form = useForm<EditServerRequest>({
        defaultValues: {
            name: server.name,
            hostnameForNewAccessKeys: server.hostnameForNewAccessKeys,
            portForNewAccessKeys: server.portForNewAccessKeys,
            tags: server.tags.map((st) => st.tagId.toString()),
            vnstatEnabled: server.vnstatEnabled,
            vnstatSshUser: server.vnstatSshUser,
            vnstatSshPort: server.vnstatSshPort,
            vnstatInterface: server.vnstatInterface
        }
    });

    const actualSubmit = async (data: EditServerRequest) => {
        try {
            await updateServer(server.id, data);

            if (returnUrl) {
                router.push(returnUrl);
            } else {
                router.push("/servers");
            }
        } catch (error) {
            setServerError((error as object).toString());
            updateErrorModalDisclosure.onOpen();
        }
    };

    const handle移除Server = async () => {
        await removeServer(server.id);

        router.push("/servers");
    };

    return (
        <>
            <MessageModal
                body={
                    <div className="grid gap-2">
                        <span>无法更新服务器，发生错误。</span>
                        <pre className="text-sm break-words whitespace-pre-wrap text-danger-500">{serverError}</pre>
                    </div>
                }
                disclosure={updateErrorModalDisclosure}
                title="编辑服务器"
            />

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
                onConfirm={handle移除Server}
            />

            <div className="grid gap-6">
                <section className="flex justify-start items-center gap-2">
                    <Tooltip closeDelay={100} color="default" content="返回" delay={600} size="sm">
                        <Button
                            as={Link}
                            href={returnUrl ? returnUrl : "/servers"}
                            isIconOnly={true}
                            size="sm"
                            variant="light"
                        >
                            <ArrowLeftIcon size={20} />
                        </Button>
                    </Tooltip>

                    <h1 className="text-xl">服务器设置</h1>
                </section>

                <form className="p-2 grid gap-4" onSubmit={form.handleSubmit(actualSubmit)}>
                    <span className="text-lg">可编辑信息</span>
                    <Input
                        className="w-[320px]"
                        description="为服务器设置新名称。此更改不会同步到已邀请连接的用户设备"
                        isInvalid={!!form.formState.errors.name}
                        label="服务器名称"
                        required={true}
                        size="sm"
                        variant="underlined"
                        {...form.register("name", {
                            required: true,
                            maxLength: 128
                        })}
                    />

                    <Input
                        className="w-[320px]"
                        description="不会影响已有访问密钥"
                        isInvalid={!!form.formState.errors.hostnameForNewAccessKeys}
                        label="新访问密钥主机名或 IP"
                        required={true}
                        size="sm"
                        variant="underlined"
                        {...form.register("hostnameForNewAccessKeys", {
                            required: true,
                            maxLength: 128
                        })}
                    />

                    <Input
                        className="w-[320px]"
                        description="不会影响已有访问密钥。请确保端口未被其他程序占用"
                        isInvalid={!!form.formState.errors.portForNewAccessKeys}
                        label="新访问密钥端口（最大 65535）"
                        required={true}
                        size="sm"
                        type="number"
                        variant="underlined"
                        {...form.register("portForNewAccessKeys", {
                            required: true,
                            min: 1,
                            max: 65535,
                            setValueAs: (v: string) => parseInt(v)
                        })}
                    />

                    <CheckboxGroup
                        label="标签"
                        value={form.watch("tags")}
                        onChange={(values) => form.setValue("tags", values)}
                    >
                        {tags.map((tag) => (
                            <Checkbox key={tag.id} value={tag.id.toString()}>
                                {tag.name}
                            </Checkbox>
                        ))}
                    </CheckboxGroup>

                    <Divider />

                    <span className="text-lg">VPS 实际流量采集（vnStat）</span>
                    <Checkbox
                        isSelected={form.watch("vnstatEnabled")}
                        onValueChange={(value) => form.setValue("vnstatEnabled", value)}
                    >
                        启用 vnStat 流量采集
                    </Checkbox>

                    <Input
                        className="w-[320px]"
                        description="管理面板使用专用 SSH 密钥连接节点，通常填写 root"
                        label="SSH 用户"
                        size="sm"
                        variant="underlined"
                        {...form.register("vnstatSshUser", {
                            required: true,
                            maxLength: 64
                        })}
                    />

                    <Input
                        className="w-[320px]"
                        label="SSH 端口"
                        size="sm"
                        type="number"
                        variant="underlined"
                        {...form.register("vnstatSshPort", {
                            required: true,
                            min: 1,
                            max: 65535,
                            setValueAs: (v: string) => parseInt(v)
                        })}
                    />

                    <Input
                        className="w-[320px]"
                        description="留空时首次采集会自动选择流量最大的网卡"
                        label="vnStat 网卡"
                        size="sm"
                        variant="underlined"
                        {...form.register("vnstatInterface")}
                    />

                    <Button
                        className="w-fit"
                        color="primary"
                        isLoading={form.formState.isSubmitting || (form.formState.isSubmitSuccessful && !serverError)}
                        type="submit"
                        variant="shadow"
                    >
                        保存
                    </Button>
                </form>

                <Divider />

                <div className="p-2 grid gap-4">
                    <span className="text-lg">移除服务器</span>
                    <p className="text-default-500 text-sm">
                        请注意，此操作只会从 {app.name} 的数据库中移除服务器，不会影响服务器本身。
                    </p>
                    <Button
                        className="w-fit"
                        color="danger"
                        variant="shadow"
                        onPress={removeServerConfirmModalDisclosure.onOpen}
                    >
                        移除
                    </Button>
                </div>
            </div>
        </>
    );
}
