"use client";

import React, { useState } from "react";
import { NotificationChannel } from "@prisma/client";
import { Radio, RadioGroup } from "@heroui/radio";
import { Controller, useForm } from "react-hook-form";
import { addToast, Alert, Button, Input, Link, Textarea, Tooltip, useDisclosure } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";

import MessageModal from "@/src/components/modals/message-modal";
import { ArrowLeftIcon } from "@/src/components/icons";
import { app } from "@/src/core/config";
import {
    createNotificationChannel,
    testTelegramNotificationChannel,
    updateNotificationChannel
} from "@/src/core/actions/notification-channel";
import { getNotificationChannelTypes } from "@/src/core/utils";

interface Props {
    channel?: NotificationChannel;
}

type FormFields = {
    name: string;
    type: string;
    telegramApiUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    telegramMessageTemplate?: string;
};

export default function NotificationChannelForm({ channel }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const parsedConfig = (() => {
        if (!channel) {
            return {};
        }

        try {
            return channel.config ? JSON.parse(channel.config) : {};
        } catch {
            return {};
        }
    })();

    const form = useForm<FormFields>({
        defaultValues: {
            name: channel?.name,
            type: channel?.type,
            telegramApiUrl: parsedConfig.apiUrl ?? "",
            telegramBotToken: parsedConfig.botToken ?? "",
            telegramChatId: parsedConfig.chatId ?? "",
            telegramMessageTemplate: parsedConfig.messageTemplate ?? ""
        },
        shouldUnregister: false
    });

    const { register, handleSubmit, formState, watch, control, getValues } = form;

    const errorModalDisclosure = useDisclosure();
    const [errorMessage, setErrorMessage] = useState<string>();
    const [is测试ing, setIs测试ing] = useState<boolean>(false);

    const selectedType = watch("type");

    const handle测试 = async () => {
        const values = getValues();

        try {
            setIs测试ing(true);
            const result = await testTelegramNotificationChannel({
                apiUrl: values.telegramApiUrl!,
                botToken: values.telegramBotToken!,
                chatId: values.telegramChatId!,
                messageTemplate: values.telegramMessageTemplate!
            });

            if (result.ok) {
                addToast({
                    title: "Success",
                    description: result.message,
                    color: "success"
                });
            } else {
                setErrorMessage(result.message);
                errorModalDisclosure.onOpen();
            }
        } catch (error) {
            setErrorMessage((error as object).toString());
            errorModalDisclosure.onOpen();
        } finally {
            setIs测试ing(false);
        }
    };

    const actualSubmit = async (data: FormFields) => {
        const type = data.type ?? "?";
        let config = null;

        if (data.type === "Telegram") {
            const messageTemplate = data.telegramMessageTemplate ?? "";

            config = JSON.stringify({
                apiUrl: data.telegramApiUrl!,
                botToken: data.telegramBotToken!,
                chatId: data.telegramChatId!,
                messageTemplate: messageTemplate.length > 0 ? messageTemplate : app.defaultTelegramNotificationTemplate
            });
        }

        try {
            if (channel) {
                await updateNotificationChannel({
                    id: channel.id,
                    type: type,
                    name: data.name,
                    config
                });
            } else {
                await createNotificationChannel({
                    type: type,
                    name: data.name,
                    config
                });
            }

            const returnUrl = searchParams.get("return");

            if (returnUrl) {
                router.push(returnUrl);
            } else {
                router.push("/notification-channels");
            }
        } catch (error) {
            setErrorMessage((error as object).toString());
            errorModalDisclosure.onOpen();
        }
    };

    return (
        <>
            <MessageModal
                body={
                    <div className="grid gap-2">
                        <pre className="text-sm break-words whitespace-pre-wrap text-danger-500">{errorMessage}</pre>
                    </div>
                }
                disclosure={errorModalDisclosure}
                title="错误！"
            />
            <div className="grid gap-6 w-full">
                <section className="flex justify-start items-center gap-2">
                    <Tooltip closeDelay={100} color="default" content="通知渠道" delay={600} size="sm">
                        <Button isIconOnly as={Link} href="/notification-channels" size="sm" variant="light">
                            <ArrowLeftIcon size={20} />
                        </Button>
                    </Tooltip>

                    <h1 className="text-xl">{channel ? "编辑通知渠道" : "新建通知渠道"}</h1>
                </section>

                <form className="w-full max-w-[464px] grid gap-4" onSubmit={handleSubmit(actualSubmit)}>
                    <Input
                        color="primary"
                        errorMessage={formState.errors.name?.message}
                        isInvalid={!!formState.errors.name}
                        label="渠道名称"
                        placeholder="e.g. My Telegram"
                        variant="underlined"
                        {...register("name", {
                            required: "名称为必填项"
                        })}
                    />

                    <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                            <RadioGroup
                                defaultValue={channel?.type ?? "?"}
                                label="通知类型"
                                value={field.value}
                                onChange={field.onChange}
                            >
                                {getNotificationChannelTypes().map((channel) => (
                                    <Radio key={channel} value={channel}>
                                        {channel}
                                    </Radio>
                                ))}
                            </RadioGroup>
                        )}
                    />

                    {/* Telegram settings */}
                    {selectedType === "Telegram" && (
                        <div className="grid gap-2">
                            <div className="text-sm text-foreground-500 flex justify-between gap-2 items-center">
                                <span>Configuration</span>
                                <Button
                                    isDisabled={formState.isSubmitting || formState.isSubmitSuccessful}
                                    isLoading={is测试ing}
                                    size="sm"
                                    variant="light"
                                    onPress={handle测试}
                                >
                                    测试
                                </Button>
                            </div>

                            <div>
                                {selectedType === "Telegram" && (
                                    <Alert color="warning" variant="flat">
                                        如果服务器所在地区无法访问 Telegram，通过 Telegram API
                                        发送通知可能会失败。可考虑使用代理，例如：
                                        <Link
                                            className="text-warning font-black contents"
                                            href={app.links.myTelegramApiProxyWorkerRepo}
                                            target="_blank"
                                        >
                                            基于 Cloudflare Worker 的 Telegram API 代理
                                        </Link>
                                        .
                                    </Alert>
                                )}
                                <Input
                                    color="primary"
                                    defaultValue="https://api.telegram.org"
                                    errorMessage={formState.errors.telegramApiUrl?.message}
                                    isInvalid={!!formState.errors.telegramApiUrl}
                                    label="Telegram API URL"
                                    placeholder="e.g. https://api.telegram.org"
                                    variant="underlined"
                                    {...register("telegramApiUrl", {
                                        required: "API URL 为必填项",
                                        setValueAs: (v) => v?.replace(/\/+$/, "")
                                    })}
                                />
                            </div>

                            <Input
                                color="primary"
                                errorMessage={formState.errors.telegramBotToken?.message}
                                isInvalid={!!formState.errors.telegramBotToken}
                                label="Bot token"
                                placeholder="e.g. 7049328752:AAE20ro04o0XApJ0yuesd12t5e8w41s55ck"
                                variant="underlined"
                                {...register("telegramBotToken", {
                                    required: "Bot token 为必填项"
                                })}
                            />
                            <Input
                                color="primary"
                                errorMessage={formState.errors.telegramChatId?.message}
                                isInvalid={!!formState.errors.telegramChatId}
                                label="Chat ID"
                                placeholder="e.g. 1234401001"
                                variant="underlined"
                                {...register("telegramChatId", { required: "Chat ID 为必填项" })}
                            />

                            <Textarea
                                color="primary"
                                description="可用占位符：{{serverName}} {{serverHostnameOrIp}} {{errorMessage}}"
                                errorMessage={formState.errors.telegramMessageTemplate?.message}
                                isInvalid={!!formState.errors.telegramMessageTemplate}
                                label="消息模板（Markdown）"
                                placeholder={`e.g. ${app.defaultTelegramNotificationTemplate}`}
                                variant="underlined"
                                {...register("telegramMessageTemplate")}
                            />
                        </div>
                    )}

                    <Button
                        color="primary"
                        isDisabled={is测试ing}
                        isLoading={formState.isSubmitting || formState.isSubmitSuccessful}
                        type="submit"
                        variant="shadow"
                    >
                        Save
                    </Button>
                </form>
            </div>
        </>
    );
}
