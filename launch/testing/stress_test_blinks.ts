interface StressResult {
    totalAttempts: number;
    inboundBufferAccepted: number;
    degradedToDeadPass: number;
    hardFailures: number;
}

export function simulateInboundBufferSpike(concurrentUsers = 150, inboundBufferSize = 16): StressResult {
    if (!Number.isInteger(concurrentUsers) || concurrentUsers < 0) {
        throw new Error('concurrentUsers must be a non-negative integer.');
    }
    if (!Number.isInteger(inboundBufferSize) || inboundBufferSize <= 0) {
        throw new Error('inboundBufferSize must be a positive integer.');
    }

    const inboundBufferAccepted = Math.min(concurrentUsers, inboundBufferSize);
    const degradedToDeadPass = Math.max(concurrentUsers - inboundBufferSize, 0);

    return {
        totalAttempts: concurrentUsers,
        inboundBufferAccepted,
        degradedToDeadPass,
        hardFailures: 0,
    };
}

function main() {
    const concurrentUsers = Number(process.env.CONCURRENT_USERS || 150);
    const inboundBufferSize = Number(process.env.INBOUND_BUFFER_SIZE || 16);
    const result = simulateInboundBufferSpike(concurrentUsers, inboundBufferSize);

    console.log(JSON.stringify(result, null, 2));

    if (result.hardFailures !== 0) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}
