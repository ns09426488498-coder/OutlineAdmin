/* eslint-disable no-console */

import { collectAllVnstat } from "@/src/core/vnstat/vnstat-collector";

collectAllVnstat()
    .then(() => {
        console.log("vnStat collection completed");
    })
    .catch((error) => {
        console.error("vnStat collection failed", error);
        process.exitCode = 1;
    });
