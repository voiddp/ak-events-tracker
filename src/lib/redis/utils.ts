import client from "@/lib/redis/client";

export async function putToStorage(data: Record<string, any>) {
    const entries = Object.entries(data);

    const pipeline = client.multi();
    for (const [key, value] of entries) {
        pipeline.set(key, JSON.stringify(value));
    }

    await pipeline.exec();
};

export async function getFromStorage(keys: string[]) {
    const values = await Promise.all(keys.map((key) => client.get(key)));

    const result: Record<string, any> = {};
    keys.forEach((key, index) => {
        const val = values[index];
        result[key] = val ? JSON.parse(val) : null;
    });

    return result;
};

export async function isLockActive(lockKey: string): Promise<boolean> {
    return (await client.ttl(lockKey)) > 0;
};

export async function setLock(lockKey: string, timeout_ms: number): Promise<string | null> {
    return await client.set(lockKey, '1', {
        NX: true,
        EX: timeout_ms / 1000
    })
};

export async function removeLock(lockKey: string): Promise<number> {
    return await client.del(lockKey)
};

export async function setKeyValue(key: string, value: string, timeout_ms: number): Promise<string | null> {
    return await client.set(key, value, {
        EX: timeout_ms / 1000
    })
};

export async function getKeyValue(key: string): Promise<string | null> {
    return await client.get(key)
};

export async function addToQueue(queueKey: string, id: string): Promise<number> {
    return await client.rPush(queueKey, id)
};

export async function removeFromQueue(queueKey: string, id: string): Promise<number> {
    return await client.lRem(queueKey, 0, id)
};

export async function getQueue(queueKey: string): Promise<string[]> {
    return await client.lRange(queueKey, 0, -1)
};

export async function getQueueHead(queueKey: string, getLength: true): Promise<{ firstItem: string | null; queueLength: number }>;
export async function getQueueHead(queueKey: string, getLength?: false): Promise<{ firstItem: string | null }>;

export async function getQueueHead(queueKey: string, getLength = false) {
    const multi = client.multi();

    // Always get the first item
    multi.lIndex(queueKey, 0);

    // Optionally get the queue length
    if (getLength) {
        multi.lLen(queueKey);
    }

    const results = await multi.exec();

    const firstItemRaw = results?.[0];
    const firstItem = firstItemRaw ? firstItemRaw.toString() : null;

    if (getLength) {
        const queueLengthRaw = results?.[1];
        const queueLength = typeof queueLengthRaw === 'number' ? queueLengthRaw : 0;

        return { firstItem, queueLength };
    }

    return { firstItem };
};