const { EmbedBuilder } = require('discord.js')

/* COMANDO: ping */
module.exports = {
  name: 'ping',
  description: 'Veja o ping atual do bot',
  async execute(client, message, args) {
    try {
      const embedCalculando = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(0x00BFFF)
        .setDescription('Calculando...')
      const sent = await message.channel.send({ embeds: [embedCalculando] })

      const apiPing = sent.createdTimestamp - message.createdTimestamp
      const gatewayPing = Math.round(client.ws.ping)

      const pingEmbed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(0x00BFFF)
        .setDescription(
          `API Ping: ${apiPing}ms\nGateway Ping: ${gatewayPing}ms`
        )

      await sent.edit({ embeds: [pingEmbed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription(
          'Ocorreu um erro ao executar este comando.' +
          (error?.message ? `\nMotivo: ${error.message}` : '')
        )
        .setColor(0x8B0000)
      await message.channel.send({ embeds: [errorEmbed] })
    }
  }
}
