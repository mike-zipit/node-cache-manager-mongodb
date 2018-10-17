"use strict";

var MongoClient = require("mongodb").MongoClient,
  cacheManager = require("cache-manager"),
  mongoStore = require("../index.js"),
  cacheDatabase = "cacheTest",
  mongoUri = "mongodb://127.0.0.1:27017/" + cacheDatabase,
  collection = "test_node_cache_mongodb_1",
  assert = require("assert"),
  debug = require('debug')('test'),
  util = require('util')
;

const mongoCachePromise = (collection) => {
  return new Promise(resolve => {
    const mongoCache = cacheManager.caching({
      store: mongoStore,
      uri: mongoUri,
      options: {
        collection: collection,
        compression: false,
        poolSize: 5,
        auto_reconnect: true
      },
      createCollectionCallback: () => {
        debug("done creating collection");
        return resolve(mongoCache);
      }
    });
  });
};

const delay = async function(ms) {
  return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
  });
};

describe("node-cache-manager-mongodb", async function() {
  var client;
  var c;
  var mongoCache;
  var get, set;

  before("connect to mongo", async function() {
    mongoCache = await mongoCachePromise(collection);
    get = util.promisify(mongoCache.get);
    set = util.promisify(mongoCache.set);
    client = await MongoClient.connect(mongoUri, { useNewUrlParser: true });
    c = client.db(cacheDatabase).collection(collection);
  });

  describe("set", async function() {
    it('check mongo expiry stored correctly', async function() {
      await set("test-cookie-0", "test-user", { ttl: 1 });
      let r = await c.findOne({key: "test-cookie-0"});
      assert.equal(r.value, "test-user", `${r.value} == "test-user"`);
      assert(r.expire > Date.now(), `expires is in the future (${r.expire - Date.now()})`);
    });

    it("value with 1s expiry", async function() {
      await set("test-cookie-1", "test-user1", { ttl: 1 });
      let v = await get("test-cookie-1");
      assert("test-user1" == v, `${v} is 'test-user1'`);
      await delay(1010);
      v = await get("test-cookie-1");
      assert("test-user1" != v, `${v} is not 'test-user1'`);
    });
  });

  after("close connection", function() {
    return client.close();
  });
});
