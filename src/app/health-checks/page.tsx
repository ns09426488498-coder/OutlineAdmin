import { Metadata } from "next";

import { createPageTitle } from "@/src/core/utils";
import HealthCheckList from "@/src/components/health-check-list";

export const metadata: Metadata = {
    title: createPageTitle("健康检查")
};

export default async function HealthCheckPage() {
    return <HealthCheckList />;
}
