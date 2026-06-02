import { Metadata } from "next";

import TrafficDashboard from "@/src/components/traffic-dashboard";
import { createPageTitle } from "@/src/core/utils";

export const metadata: Metadata = {
    title: createPageTitle("流量统计")
};

export default async function TrafficPage() {
    return <TrafficDashboard />;
}
