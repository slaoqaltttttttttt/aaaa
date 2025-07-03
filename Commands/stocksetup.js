const { EmbedBuilder } = require('discord.js')
const { Client: PgClient } = require('pg')

const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
})
pg.connect()

module.exports = {
  name: 'setup',
  description: 'Configura o canal em que o stock vai ser enviado.',
  usage: 's!setup #canal',
  async execute(client, message, args) {
    try {
      if (!message.guild) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Este comando só pode ser usado em um servidor.')
              .setColor(0x8B0000)
          ]
        })
      }
      if (!message.member || !message.member.permissions) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Não foi possível verificar suas permissões.')
              .setColor(0x8B0000)
          ]
        })
      }
      if (!message.member.permissions.has('Administrator')) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Você precisa ser administrador para usar este comando.')
              .setColor(0x8B0000)
          ]
        })
      }
      const canal = message.mentions.channels.first()
      if (!canal) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Você precisa mencionar um canal. Ex: `s!setup #canal`')
              .setColor(0x8B0000)
          ]
        })
      }

      await pg.query(
        'INSERT INTO guild_settings (guild_id, stock_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET stock_channel_id = $2',
        [message.guild.id, canal.id]
      )

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Canal configurado!')
            .setDescription(`Canal de stock configurado com sucesso para ${canal}`)
            .setColor(0x43b581)
        ]
      })
    } catch (error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Erro')
            .setDescription(
              'Ocorreu um erro ao configurar o canal de stock.' +
              (error?.message ? `\nMotivo: ${error.message}` : '')
            )
            .setColor(0x8B0000)
        ]
      })
    }
  }
}
