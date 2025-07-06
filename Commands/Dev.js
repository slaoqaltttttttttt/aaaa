const { EmbedBuilder } = require('discord.js')
const os = require('os')

module.exports = {
  name: 'dev',
  async execute(client, message, args) {
    try {
      const servidores = client.guilds.cache.size
      const ramUsadaMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2)
      const memoriaTotalMB = (os.totalmem() / 1024 / 1024).toFixed(2)
      const memoriaLivreMB = (os.freemem() / 1024 / 1024).toFixed(2)
      const memoriaUsadaMB = (memoriaTotalMB - memoriaLivreMB).toFixed(2)
      const ping = Math.round(client.ws.ping)
      const shardId = message.guild ? message.guild.shardId : 'N/A'
      const totalShards = client.shard ? client.shard.count : 1
      const availableShards = client.shard ? client.shard.ids.length : 1

      function formatUptime(ms) {
        let totalSeconds = parseInt(ms / 1000, 10)
        const days = Math.floor(totalSeconds / 86400)
        totalSeconds %= 86400
        const hours = Math.floor(totalSeconds / 3600)
        totalSeconds %= 3600
        const minutes = Math.floor(totalSeconds / 60)
        return `${days} dias ${hours} horas ${minutes} minutos`
      }
      const uptime = formatUptime(client.uptime)
      const host = "Koyeb"

      const embed = new EmbedBuilder()
        .setTitle(`Info [Shard ${shardId}]`)
        .setColor('#00BFFF')
        .setDescription(
          `**Servidores:** ${servidores}\n` +
          `**Shards:** ${totalShards} (${availableShards} disponíveis)\n` +
          `**Ram usada:** ${ramUsadaMB} MB\n` +
          `**Memoria usada:** ${memoriaUsadaMB} MB\n` +
          `**Ping:** ${ping}ms\n` +
          `**Bot online a** ${uptime}\n` +
          `**Host:** ${host}`
        )

      await message.channel.send({ embeds: [embed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao executar este comando.')
        .setColor(0x8B0000)
      await message.channel.send({ embeds: [errorEmbed] })
    }
  }
}
