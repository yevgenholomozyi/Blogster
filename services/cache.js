const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
// make client.get return a promise instead of callback
client.hget = util.promisify(client.hget); 
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this; // allows to chain 'cache' to other custom propperties like limit, sort etc 
};

// we need to re write default exec function in order to fit
// with redis. 
mongoose.Query.prototype.exec = async function() {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(
        Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    })
);

    // See if we have a value
    const cacheValue = await client.hget(this.hashKey, key);
    // If we do, return that value
    if (cacheValue) {
        const doc = JSON.parse(cacheValue);
        // return hydrating data depending on type
        return Array.isArray(doc) 
        ? doc.map(d => new this.model(d))
        : new this.model(doc); 
    }
    // esle issue a query and set it to the redis
    const result = await exec.apply(this, arguments);
    client.hmset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
    return result;
};
// deleting logic
module.exports = {
    clearHash(hashKey) {
      client.del(JSON.stringify(hashKey));
    }
};