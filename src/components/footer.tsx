"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/react";

import { app } from "@/src/core/config";
import { AmRoLogo, HeartIcon } from "@/src/components/icons";
import { useLanguage } from "@/src/components/language-provider";

export const Footer = () => {
    const { language } = useLanguage();

    return (
        <footer className="w-full grid place-items-center gap-8 py-3 mt-8">
            <Button
                isExternal
                as={Link}
                className="flex items-center gap-1 text-current"
                href={app.links.me}
                size="sm"
                variant="light"
            >
                <span className="text-default-600">{language === "zh" ? "由" : "Made"}</span>
                <HeartIcon className="fill-red-500" size={20} />
                <span className="text-default-600">by</span>
                <AmRoLogo className="fill-primary" size={24} />
                <span className="text-default-600">
                    {language === "zh" ? "为自由互联网而做" : "for the free internet"}
                </span>
            </Button>
        </footer>
    );
};
