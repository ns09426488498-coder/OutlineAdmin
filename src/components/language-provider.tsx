"use client";

import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Language = "zh" | "en";

export type TranslationKey =
    | "accessKeys"
    | "add"
    | "adminPasswordIntro"
    | "available"
    | "cancel"
    | "changelog"
    | "create"
    | "delete"
    | "deleteDynamicAccessKey"
    | "deleteDynamicAccessKeyConfirm"
    | "descending"
    | "donate"
    | "dynamicAccessKeys"
    | "dynamicAccessKeysHelp"
    | "edit"
    | "expiresAt"
    | "githubPage"
    | "healthChecks"
    | "hostIp"
    | "id"
    | "keyCount"
    | "keyName"
    | "language"
    | "loadBalancer"
    | "login"
    | "logout"
    | "manual"
    | "managementType"
    | "metrics"
    | "nameSearchPlaceholder"
    | "nameOrHostSearchPlaceholder"
    | "newAccessKeyHost"
    | "newAccessKeyPort"
    | "none"
    | "notificationChannels"
    | "password"
    | "passwordError"
    | "passwordPlaceholder"
    | "prefix"
    | "redditPage"
    | "remove"
    | "removeServer"
    | "removeServerConfirm"
    | "removeServerNote"
    | "remainingData"
    | "reset"
    | "resetDynamicAccessKey"
    | "resetDynamicAccessKeyConfirm"
    | "resetDynamicAccessKeyNote"
    | "save"
    | "selfManaged"
    | "servers"
    | "serverSettings"
    | "share"
    | "sortAscending"
    | "status"
    | "tags"
    | "totalUsedData"
    | "unavailable"
    | "unlimited"
    | "usedData"
    | "validity";

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
    zh: {
        accessKeys: "访问密钥",
        add: "添加",
        adminPasswordIntro: "需要先为管理员设置密码",
        available: "可用",
        cancel: "取消",
        changelog: "更新日志",
        create: "新建",
        delete: "删除",
        deleteDynamicAccessKey: "删除动态访问密钥",
        deleteDynamicAccessKeyConfirm: "确定要删除这个动态访问密钥吗？",
        descending: "降序",
        donate: "赞助",
        dynamicAccessKeys: "动态访问密钥",
        dynamicAccessKeysHelp: "了解动态访问密钥",
        edit: "编辑",
        expiresAt: "到期时间",
        githubPage: "GitHub 页面",
        healthChecks: "健康检查",
        hostIp: "主机/IP",
        id: "ID",
        keyCount: "密钥数量",
        keyName: "密钥名称",
        language: "语言",
        loadBalancer: "负载均衡",
        login: "登录",
        logout: "退出登录",
        manual: "手动",
        managementType: "管理方式",
        metrics: "监控指标",
        nameSearchPlaceholder: "名称 [+回车]",
        nameOrHostSearchPlaceholder: "名称或主机名 [+回车]",
        newAccessKeyHost: "新访问密钥主机/IP",
        newAccessKeyPort: "新访问密钥端口",
        none: "无",
        notificationChannels: "通知渠道",
        password: "密码",
        passwordError: "密码错误。",
        passwordPlaceholder: "管理员密码",
        prefix: "前缀",
        redditPage: "Reddit 页面",
        remove: "移除",
        removeServer: "移除服务器",
        removeServerConfirm: "确定要移除这台服务器吗？",
        removeServerNote: `请注意，此操作只会从 ${"Outline Admin"} 的数据库中移除服务器，不会影响服务器本身。`,
        remainingData: "剩余流量",
        reset: "重置",
        resetDynamicAccessKey: "重置动态访问密钥",
        resetDynamicAccessKeyConfirm: "确定要重置这个动态访问密钥吗？",
        resetDynamicAccessKeyNote: "这个操作会将已用流量清零。自主管理密钥会在下次订阅请求时删除并重新创建。",
        save: "保存",
        selfManaged: "自主管理",
        servers: "服务器",
        serverSettings: "设置",
        share: "分享",
        sortAscending: "升序",
        status: "状态",
        tags: "标签",
        totalUsedData: "总已用流量",
        unavailable: "不可用",
        unlimited: "无限制",
        usedData: "已用流量",
        validity: "有效期"
    },
    en: {
        accessKeys: "Access Keys",
        add: "Add",
        adminPasswordIntro: "Set an administrator password first",
        available: "Available",
        cancel: "Cancel",
        changelog: "Changelog",
        create: "Create",
        delete: "Delete",
        deleteDynamicAccessKey: "Delete Dynamic Access Key",
        deleteDynamicAccessKeyConfirm: "Delete this dynamic access key?",
        descending: "Descending",
        donate: "Donate",
        dynamicAccessKeys: "Dynamic Access Keys",
        dynamicAccessKeysHelp: "Learn about dynamic access keys",
        edit: "Edit",
        expiresAt: "Expires At",
        githubPage: "GitHub Page",
        healthChecks: "Health Checks",
        hostIp: "Host/IP",
        id: "ID",
        keyCount: "Number of keys",
        keyName: "Key Name",
        language: "Language",
        loadBalancer: "Load Balancer",
        login: "Login",
        logout: "Logout",
        manual: "Manual",
        managementType: "Management Type",
        metrics: "Metrics",
        nameSearchPlaceholder: "Name [+Enter]",
        nameOrHostSearchPlaceholder: "Name or hostname [+Enter]",
        newAccessKeyHost: "New access key host/IP",
        newAccessKeyPort: "New access key port",
        none: "None",
        notificationChannels: "Notification Channels",
        password: "Password",
        passwordError: "Incorrect password.",
        passwordPlaceholder: "Admin password",
        prefix: "Prefix",
        redditPage: "Reddit Page",
        remove: "Remove",
        removeServer: "Remove Server",
        removeServerConfirm: "Remove this server?",
        removeServerNote:
            "This only removes the server from the Outline Admin database. It does not affect the server itself.",
        remainingData: "Remaining Data",
        reset: "Reset",
        resetDynamicAccessKey: "Reset Dynamic Access Key",
        resetDynamicAccessKeyConfirm: "Reset this dynamic access key?",
        resetDynamicAccessKeyNote:
            "This will clear used traffic. Self-managed keys will be deleted and recreated on the next subscription request.",
        save: "Save",
        selfManaged: "Self-Managed",
        servers: "Servers",
        serverSettings: "Settings",
        share: "Share",
        sortAscending: "Ascending",
        status: "Status",
        tags: "Tags",
        totalUsedData: "Total Used Data",
        unavailable: "Unavailable",
        unlimited: "Unlimited",
        usedData: "Used Data",
        validity: "Validity"
    }
};

interface LanguageContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "outline-admin-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("zh");

    useEffect(() => {
        const storedLanguage = window.localStorage.getItem(STORAGE_KEY);

        if (storedLanguage === "zh" || storedLanguage === "en") {
            setLanguageState(storedLanguage);
        }
    }, []);

    const setLanguage = (nextLanguage: Language) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
    };

    useEffect(() => {
        document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    }, [language]);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            t: (key: TranslationKey) => dictionaries[language][key]
        }),
        [language]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }

    return context;
}
