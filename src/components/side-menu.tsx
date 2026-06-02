"use client";

import NextLink from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { Button, Tooltip, useDisclosure } from "@heroui/react";
import { Link } from "@heroui/link";
import { useForm } from "react-hook-form";
import { UseDisclosureReturn } from "@heroui/use-disclosure";

import {
    BellIcon,
    DynamicAccessKeyIcon,
    GithubIcon,
    HashtagIcon,
    HealthCheckIcon,
    HeartIconDuotone,
    Logo,
    RedditIcon,
    ServersIcon,
    StatsIcon
} from "@/src/components/icons";
import { app } from "@/src/core/config";
import { logout } from "@/src/core/actions";
import { ThemeSwitch } from "@/src/components/theme-switch";
import DonationModal from "@/src/components/modals/donation-modal";
import LanguageSwitch from "@/src/components/language-switch";
import { useLanguage } from "@/src/components/language-provider";

const menuItems = [
    {
        labelKey: "servers" as const,
        pathName: "/servers",
        icon: <ServersIcon size={24} />
    },
    {
        labelKey: "dynamicAccessKeys" as const,
        pathName: "/dynamic-access-keys",
        icon: <DynamicAccessKeyIcon size={24} />
    },
    {
        labelKey: "trafficStats" as const,
        pathName: "/traffic",
        icon: <StatsIcon size={24} />
    },
    {
        labelKey: "healthChecks" as const,
        pathName: "/health-checks",
        icon: <HealthCheckIcon size={24} />
    },
    {
        labelKey: "notificationChannels" as const,
        pathName: "/notification-channels",
        icon: <BellIcon size={24} />
    },
    {
        labelKey: "tags" as const,
        pathName: "/tags",
        icon: <HashtagIcon size={24} />
    }
];

interface Props {
    drawerDisclosure?: UseDisclosureReturn;
}

export const SideMenu = ({ drawerDisclosure }: Props) => {
    const currentPathname = usePathname();
    const donationModalDisclosure = useDisclosure();
    const logoutForm = useForm();
    const { t } = useLanguage();

    const handleLogout = async () => {
        await logout();
    };

    const handleDrawerClose = () => {
        if (drawerDisclosure) {
            drawerDisclosure.onClose();
        }
    };

    return (
        <>
            <DonationModal disclosure={donationModalDisclosure} />

            <div className="flex flex-col justify-between gap-2 h-screen w-[316px] bg-default-50 dark:bg-content1 xl:fixed">
                <div className="mt-8">
                    <div className="grid gap-4">
                        <NextLink
                            className="w-fit justify-self-center flex flex-col justify-start items-center gap-2"
                            href="/"
                        >
                            <Logo size={64} />
                            <p className="font-bold text-inherit">{app.name.toUpperCase()} </p>
                        </NextLink>

                        <div className="flex gap-6 items-center justify-center">
                            <Tooltip closeDelay={100} content={t("donate")}>
                                <Link href="#" onPress={donationModalDisclosure.onOpen}>
                                    <HeartIconDuotone className="text-default-500" size={24} />
                                </Link>
                            </Tooltip>

                            <Tooltip closeDelay={100} content={t("githubPage")}>
                                <Link isExternal href={app.links.github}>
                                    <GithubIcon className="text-default-500" size={24} />
                                </Link>
                            </Tooltip>

                            <Tooltip closeDelay={100} content={t("redditPage")}>
                                <Link isExternal href={app.links.outlineVpn.index}>
                                    <RedditIcon className="text-default-500" size={24} />
                                </Link>
                            </Tooltip>

                            <ThemeSwitch />
                        </div>
                    </div>

                    <nav className="grid gap-6 mt-16 px-4">
                        {menuItems.map((item) => (
                            <NextLink
                                key={item.pathName}
                                className={`flex gap-2 items-center ${currentPathname.startsWith(item.pathName) ? "text-primary-500" : "text-default-500"}`}
                                href={item.pathName}
                                onClick={handleDrawerClose}
                            >
                                {item.icon}
                                <span>{t(item.labelKey)}</span>
                            </NextLink>
                        ))}
                    </nav>
                </div>

                <div className="p-2 grid gap-2">
                    <div className="flex justify-center">
                        <LanguageSwitch />
                    </div>

                    <form className="w-full" onSubmit={logoutForm.handleSubmit(handleLogout)}>
                        <Button
                            color="danger"
                            fullWidth={true}
                            isLoading={logoutForm.formState.isSubmitting}
                            type="submit"
                            variant="flat"
                        >
                            {t("logout")}
                        </Button>
                    </form>

                    <Tooltip color="foreground" content={t("changelog")} size="sm">
                        <NextLink
                            className="text-xs text-foreground-400 font-normal mx-auto"
                            href={`${app.links.github}/releases/tag/v${process.env.VERSION}`}
                            target="_blank"
                        >
                            v{process.env.VERSION}
                        </NextLink>
                    </Tooltip>
                </div>
            </div>
        </>
    );
};
