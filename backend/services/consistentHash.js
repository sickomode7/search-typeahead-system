const crypto = require('crypto');

class ConsistentHashRing {
    constructor() {
        this.nodes = [];
        this.ring = {}; // Map of hash -> nodeName
        this.keys = []; // Sorted array of hashes
        this.replicas = 100;
        
        ['cache-node-1', 'cache-node-2', 'cache-node-3'].forEach(node => this.addNode(node));
    }

    _hash(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    }

    addNode(nodeName) {
        this.nodes.push(nodeName);
        for (let i = 0; i < this.replicas; i++) {
            const key = this._hash(`${nodeName}:replica:${i}`);
            this.ring[key] = nodeName;
            this.keys.push(key);
        }
        this.keys.sort();
    }

    getNode(key) {
        if (this.keys.length === 0) return null;
        
        const hash = this._hash(key);
        
        let target = -1;
        let low = 0;
        let high = this.keys.length - 1;
        
        while (low <= high) {
            let mid = Math.floor((low + high) / 2);
            if (this.keys[mid] >= hash) {
                target = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        
        if (target === -1) {
            target = 0; // Wrap around to the first node
        }
        
        return this.ring[this.keys[target]];
    }
}

module.exports = new ConsistentHashRing();
