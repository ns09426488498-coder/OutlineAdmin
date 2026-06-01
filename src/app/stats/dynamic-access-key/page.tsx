import { Metadata } from "next";

import { createPageTitle } from "@/src/core/utils";
import DynamicAccessKeyStatsForm from "@/src/components/dynamic-access-key-stats-form";

export const metadata: Metadata = {
    title: createPageTitle("动态访问密钥统计")
};

export default async function DynamicAccessKeyStatsPage() {
    return <DynamicAccessKeyStatsForm />;
}
