const crypto = require('crypto');

class ConsistentHash {
    constructor(nodes, replicas = 100) {
        this.replicas = replicas;
        this.ring = new Map(); // hash -> node
        this.sortedHashes = [];
        
        for (const node of nodes) {
            this.addNode(node);
        }
    }

    _hash(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    }

    addNode(node) {
        for (let i = 0; i < this.replicas; i++) {
            const hash = this._hash(`${node}:${i}`);
            this.ring.set(hash, node);
            this.sortedHashes.push(hash);
        }
        this.sortedHashes.sort();
    }

    getNode(key) {
        if (this.sortedHashes.length === 0) return null;
        
        const hash = this._hash(key);
        
        let left = 0;
        let right = this.sortedHashes.length - 1;
        let target = -1;

        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.sortedHashes[mid] >= hash) {
                target = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        if (target === -1) {
            target = 0;
        }

        return this.ring.get(this.sortedHashes[target]);
    }
}

const sampleKeys = [
    'elden ring', 'minecraft', 'fortnite', 'apex legends', 'valorant',
    'league of legends', 'dota 2', 'csgo', 'cyberpunk', 'halo',
    'mario', 'zelda', 'pokemon', 'super smash bros', 'god of war',
    'spider-man', 'the last of us', 'bloodborne', 'dark souls', 'sekiro'
];

console.log("--- Initial 3-Node Cluster ---");
const cluster3 = new ConsistentHash(['cache-node-1', 'cache-node-2', 'cache-node-3']);

const distribution3 = { 'cache-node-1': 0, 'cache-node-2': 0, 'cache-node-3': 0 };
const mappings3 = new Map();

for (const key of sampleKeys) {
    const node = cluster3.getNode(key);
    mappings3.set(key, node);
    distribution3[node]++;
    console.log(`Key: "${key.padEnd(20)}" -> ${node}`);
}

console.log("\nDistribution (3 nodes):");
for (const [node, count] of Object.entries(distribution3)) {
    console.log(`${node}: ${count} keys (${((count / 20) * 100).toFixed(0)}%)`);
}

console.log("\n--- Scaling to 4-Node Cluster ---");
const cluster4 = new ConsistentHash(['cache-node-1', 'cache-node-2', 'cache-node-3', 'cache-node-4']);

const distribution4 = { 'cache-node-1': 0, 'cache-node-2': 0, 'cache-node-3': 0, 'cache-node-4': 0 };
let remappedCount = 0;

for (const key of sampleKeys) {
    const newNode = cluster4.getNode(key);
    const oldNode = mappings3.get(key);
    
    distribution4[newNode]++;
    
    if (newNode !== oldNode) {
        remappedCount++;
        console.log(`Key: "${key.padEnd(20)}" -> Shifted from ${oldNode} to ${newNode}`);
    }
}

console.log(`\nTotal Keys Remapped: ${remappedCount} / 20 (${((remappedCount / 20) * 100).toFixed(0)}%)`);
console.log(`(In a standard modulus system (hash % N), adding a 4th node would remap ~75% of keys)`);

console.log("\nDistribution (4 nodes):");
for (const [node, count] of Object.entries(distribution4)) {
    console.log(`${node}: ${count} keys (${((count / 20) * 100).toFixed(0)}%)`);
}
