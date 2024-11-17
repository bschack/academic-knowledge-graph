const { Client, FileCreateTransaction, Hbar, FileContentsQuery } = require("@hashgraph/sdk");
const crypto = require('crypto');
const fs = require('fs');

class HederaLogger {
    constructor(accountId, privateKey) {
        // Initialize Hedera client with your credentials
        this.client = Client.forTestnet();
        this.client.setOperator(accountId, privateKey);
    }

    async hashAndStoreGraph(graphPath) {
        try {
            const graphContent = fs.readFileSync(graphPath, 'utf8');
            
            // Create SHA-256 hash
            const hash = crypto.createHash('sha256')
                             .update(graphContent)
                             .digest();

            // Store on Hedera
            const response = await new FileCreateTransaction()
                    .setContents(hash)
                    .setMaxTransactionFee(new Hbar(2))
                    .execute(this.client);

            const receipt = await response.getReceipt(this.client);
            const fileId = receipt.fileId.toString();
            const hashHex = hash.toString('hex');

            // Save to local tracking file
            const trackingInfo = {
                fileId: fileId,
                hash: hashHex,
                timestamp: new Date().toISOString(),
                graphFile: graphPath
            };

            fs.writeFileSync(
                'latest-hash.json', 
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

    async calculateGraphHash(graphFile) {
        // Read the RDF graph file
        const graphContent = fs.readFileSync(graphFile, 'utf8');
        
        // Create SHA-256 hash of the graph content
        const hash = crypto.createHash('sha256')
                         .update(graphContent)
                         .digest('hex');

        return hash;
    }

    async getStoredHash(fileId) {
        // Get stored hash from Hedera
        const query = new FileContentsQuery()
            .setFileId(fileId);
        const storedHash = await query.execute(this.client);
        
        console.log('Raw stored hash:', storedHash);
        console.log('Stored hash type:', typeof storedHash);
        console.log('Is Buffer?', Buffer.isBuffer(storedHash));
        
        return storedHash;
    }
  
    async verifyGraph(graphFile, fileId) {
        const currentHash = await this.calculateGraphHash(graphFile);
        const storedHash = await this.getStoredHash(fileId);
        
        // Convert Buffer directly to hex
        const storedHashString = Buffer.isBuffer(storedHash) 
            ? storedHash.toString('hex')
            : storedHash;
        
        console.log('Buffer values:', [...storedHash]); // Debug: see raw buffer values
        
        return {
            isValid: currentHash === storedHashString,
            storedHash: storedHashString,
            currentHash: currentHash
        };
    }

    async verifyLatestGraph(graphFile) {
        try {
            const trackingInfo = JSON.parse(fs.readFileSync('latest-hash.json', 'utf8'));
            return await this.verifyGraph(graphFile, trackingInfo.fileId);
        } catch (error) {
            console.error('Error reading tracking file:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }
}

module.exports = HederaLogger;
