// utils/shard.js
const { ShardingManager } = require('discord.js')
const path = require('path')

function startSharding() {
  const manager = new ShardingManager(path.join(__dirname, '../index.js'), {
    token: process.env.BOT_TOKEN,
    totalShards: 'auto'
  })

  manager.on('shardCreate', shard => {
    console.log(`[Shard Manager] Shard ${shard.id} iniciada`)
  })

  return manager.spawn()
}

module.exports = { startSharding }
