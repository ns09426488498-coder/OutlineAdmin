import { execFile } from "child_process";
import { promisify } from "util";

import { Server } from "@prisma/client";

import prisma from "@/prisma/db";

const execFileAsync = promisify(execFile);
const DEFAULT_KEY_PATH = "/app/data/vnstat_collector_key";
const DEFAULT_KNOWN_HOSTS_PATH = "/app/data/vnstat_known_hosts";

interface VnstatInterface {
    name: string;
    traffic: {
        total: {
            rx: number;
            tx: number;
        };
    };
}

interface VnstatResponse {
    interfaces?: VnstatInterface[];
}

const isValidSshValue = (value: string): boolean => /^[a-zA-Z0-9_.:@-]+$/.test(value);
const isValidInterface = (value: string): boolean => /^[a-zA-Z0-9_.:-]+$/.test(value);

const selectInterface = (data: VnstatResponse, interfaceName?: string | null): VnstatInterface => {
    const interfaces = data.interfaces ?? [];

    if (interfaceName) {
        const selected = interfaces.find((item) => item.name === interfaceName);

        if (!selected) {
            throw new Error(`vnStat interface "${interfaceName}" was not found`);
        }

        return selected;
    }

    const selected = [...interfaces].sort(
        (a, b) => b.traffic.total.rx + b.traffic.total.tx - (a.traffic.total.rx + a.traffic.total.tx)
    )[0];

    if (!selected) {
        throw new Error("vnStat returned no monitored interfaces");
    }

    return selected;
};

const getRemoteVnstat = async (server: Server): Promise<VnstatInterface> => {
    const keyPath = process.env.VNSTAT_SSH_KEY_PATH ?? DEFAULT_KEY_PATH;
    const knownHostsPath = process.env.VNSTAT_SSH_KNOWN_HOSTS_PATH ?? DEFAULT_KNOWN_HOSTS_PATH;
    const user = server.vnstatSshUser || "root";

    if (!isValidSshValue(user) || !isValidSshValue(server.hostnameOrIp)) {
        throw new Error("Invalid SSH user or hostname");
    }

    if (server.vnstatInterface && !isValidInterface(server.vnstatInterface)) {
        throw new Error("Invalid vnStat interface");
    }

    const args = [
        "-i",
        keyPath,
        "-p",
        String(server.vnstatSshPort || 22),
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=8",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-o",
        `UserKnownHostsFile=${knownHostsPath}`,
        `${user}@${server.hostnameOrIp}`,
        "vnstat --json"
    ];
    const { stdout } = await execFileAsync("ssh", args, {
        timeout: 20_000,
        maxBuffer: 1024 * 1024
    });
    const response = JSON.parse(stdout) as VnstatResponse;

    return selectInterface(response, server.vnstatInterface);
};

export async function collectServerVnstat(server: Server): Promise<void> {
    try {
        const selectedInterface = await getRemoteVnstat(server);
        const rxBytes = BigInt(selectedInterface.traffic.total.rx);
        const txBytes = BigInt(selectedInterface.traffic.total.tx);

        await prisma.$transaction([
            prisma.vnstatTrafficSnapshot.create({
                data: {
                    serverId: server.id,
                    rxBytes,
                    txBytes,
                    totalBytes: rxBytes + txBytes
                }
            }),
            prisma.server.update({
                where: { id: server.id },
                data: {
                    vnstatInterface: selectedInterface.name,
                    vnstatLastCollectedAt: new Date(),
                    vnstatLastError: null
                }
            })
        ]);

        const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        await prisma.vnstatTrafficSnapshot.deleteMany({
            where: {
                serverId: server.id,
                capturedAt: {
                    lt: cutoffDate
                }
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await prisma.server.update({
            where: { id: server.id },
            data: {
                vnstatLastError: message.slice(0, 500)
            }
        });
    }
}

export async function collectAllVnstat(): Promise<void> {
    const servers = await prisma.server.findMany({
        where: {
            vnstatEnabled: true
        }
    });

    for (const server of servers) {
        await collectServerVnstat(server);
    }
}
