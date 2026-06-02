"use client";

import { useForm } from "react-hook-form";
import { Button, Input } from "@heroui/react";

import { checkPassword, login } from "@/src/core/actions";
import { Logo } from "@/src/components/icons";
import { useLanguage } from "@/src/components/language-provider";

interface FormProps {
    password: string;
}

export default function LoginForm() {
    const form = useForm<FormProps>();
    const { t } = useLanguage();

    const actualSubmit = async (data: FormProps) => {
        const userId = await checkPassword(data.password);

        if (userId) {
            await login(userId);
        } else {
            form.setError("password", { type: "custom", message: t("passwordError") });
        }
    };

    return (
        <form
            className="flex flex-col items-center justify-center gap-2 min-h-[64vh]"
            onSubmit={form.handleSubmit(actualSubmit)}
        >
            <div className="mb-8">
                <Logo size={86} />
            </div>

            <Input
                className="w-[264px]"
                color="primary"
                errorMessage={form.formState.errors.password?.message}
                isInvalid={!!form.formState.errors.password}
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
                type="password"
                variant="underlined"
                {...form.register("password", {
                    required: true,
                    maxLength: 64
                })}
            />

            <Button
                className="w-[264px]"
                color="primary"
                isLoading={form.formState.isSubmitting || form.formState.isSubmitSuccessful}
                type="submit"
                variant="shadow"
            >
                {t("login")}
            </Button>
        </form>
    );
}
