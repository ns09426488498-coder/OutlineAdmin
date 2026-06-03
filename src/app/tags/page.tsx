import { Metadata } from "next";

import { createPageTitle } from "@/src/core/utils";
import { getTagLoadStats, getTags } from "@/src/core/actions/tags";
import TagsList from "@/src/components/tags-list";

export const metadata: Metadata = {
    title: createPageTitle("标签")
};

export default async function TagsPage() {
    const [tags, loadStats] = await Promise.all([getTags({}), getTagLoadStats()]);

    return <TagsList data={tags} loadStats={loadStats} />;
}
