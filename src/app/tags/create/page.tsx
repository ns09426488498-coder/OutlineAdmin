import { Metadata } from "next";

import { createPageTitle } from "@/src/core/utils";
import TagForm from "@/src/components/tag-form";

export const metadata: Metadata = {
    title: createPageTitle("新建标签")
};

export default async function TagCreatePage() {
    return <TagForm />;
}
