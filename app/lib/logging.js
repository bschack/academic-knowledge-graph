'use server'

import { Client, FileCreateTransaction, Hbar, FileContentsQuery } from "@hashgraph/sdk";
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

function getClient() {
    const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID;
    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

    if (!accountId || !privateKey) {
        throw new Error('ACCOUNT_ID and PRIVATE_KEY environment variables must be set');
    }

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    return client;
}

export async function hashAndStoreGraph(graphPath) {
    const client = getClient();
    try {
        const graphContent = readFileSync(graphPath, 'utf8');

        // Create SHA-256 hash
        const hash = createHash('sha256')
            .update(graphContent)
            .digest();

        // Store on Hedera
        const response = await new FileCreateTransaction()
            .setContents(hash)
            .setMaxTransactionFee(new Hbar(2))
            .execute(client);

        const receipt = await response.getReceipt(client);
        const fileId = receipt.fileId.toString();
        const hashHex = hash.toString('hex');

        // Save to local tracking file
        const trackingInfo = {
            fileId: fileId,
            hash: hashHex,
            timestamp: new Date().toISOString(),
            graphFile: graphPath
        };

        writeFileSync(
            './latest-hash.json',
            JSON.stringify(trackingInfo, null, 2)
        );

        return {
            success: true,
            fileId: fileId,
            hash: hashHex
        };
    } catch (error) {
        console.error('Error storing graph hash:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function calculateGraphHash(graphFile) {
    // Read the RDF graph file
    const graphContent = readFileSync(graphFile, 'utf8');

    // Create SHA-256 hash of the graph content
    const hash = createHash('sha256')
        .update(graphContent)
        .digest('hex');

    return hash;
}

export async function getStoredHash(fileId) {
    const client = getClient();
    // Get stored hash from Hedera
    const query = new FileContentsQuery()
        .setFileId(fileId);
    const storedHash = await query.execute(client);

    console.log('Raw stored hash:', storedHash);
    console.log('Stored hash type:', typeof storedHash);
    console.log('Is Buffer?', Buffer.isBuffer(storedHash));

    return storedHash;
}

export async function verifyGraph(graphFile, fileId) {
    const currentHash = await calculateGraphHash(graphFile);
    const storedHash = await getStoredHash(fileId);

    // Convert Buffer directly to hex
    const storedHashString = Buffer.isBuffer(storedHash)
        ? storedHash.toString('hex')
        : storedHash;

    // console.log('Buffer values:', [...storedHash]); // Debug: see raw buffer values

    return {
        isValid: currentHash === storedHashString,
        storedHash: storedHashString,
        currentHash: currentHash
    };
}

export async function verifyLatestGraph(graphFile = './research-graph.ttl') {
    try {
        const trackingInfo = JSON.parse(readFileSync('./latest-hash.json', 'utf8'));
        return await verifyGraph(graphFile, trackingInfo.fileId);
    } catch (error) {
        console.error('Error reading tracking file:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}
