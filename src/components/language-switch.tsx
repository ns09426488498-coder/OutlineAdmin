"use client";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Tooltip } from "@heroui/react";

import { Language, useLanguage } from "@/src/components/language-provider";

const languageOptions: Array<{ key: Language; label: string; shortLabel: string }> = [
    { key: "zh", label: "中文", shortLabel: "CN" },
    { key: "en", label: "English", shortLabel: "EN" }
];

export default function LanguageSwitch() {
    const { language, setLanguage, t } = useLanguage();
    const activeLanguage = languageOptions.find((item) => item.key === language) ?? languageOptions[0];

    return (
        <Dropdown placement="top-start">
            <Tooltip closeDelay={100} content={t("language")}>
                <div>
                    <DropdownTrigger>
                        <Button className="justify-start" size="sm" variant="flat">
                            <span aria-hidden="true">{language === "zh" ? "🇨🇳" : "🇬🇧"}</span>
                            <span>{activeLanguage.shortLabel}</span>
                        </Button>
                    </DropdownTrigger>
                </div>
            </Tooltip>

            <DropdownMenu
                aria-label={t("language")}
                selectedKeys={new Set([language])}
                selectionMode="single"
                onAction={(key) => setLanguage(key as Language)}
            >
                <DropdownItem key="zh" startContent={<span aria-hidden="true">🇨🇳</span>}>
                    中文
                </DropdownItem>
                <DropdownItem key="en" startContent={<span aria-hidden="true">🇬🇧</span>}>
                    English
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}
