import { runCommand, startDakJob, startHealthCheckJob, startSyncJob, startVnstatJob } from "@/scripts/utils";

const main = async () => {
    startSyncJob();
    startHealthCheckJob();
    startDakJob();
    startVnstatJob();

    try {
        await runCommand("node", ["server.js"]);
    } catch (error) {
        console.error("Failed to start dev server:", error);
        process.exit(1);
    }
};

main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
});
