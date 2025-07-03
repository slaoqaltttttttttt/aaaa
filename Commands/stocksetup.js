const { EmbedBuilder } = require('discord.js')
const { Client: PgClient } = require('pg')

const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
})
pg.connect()

module.exports = {
  name: 'setup',
  async execute(client, message, args) {
    try {
      if (!message.guild) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Este comando só pode ser usado em um servidor.')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }
      if (!message.member || !message.member.permissions) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Não foi possível verificar suas permissões.')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }
      if (!message.member.permissions.has('Administrator')) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você precisa ser administrador para usar este comando.')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }
      const canal = message.mentions.channels.first()
      if (!canal) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você precisa mencionar um canal. Ex: `js!stocksetup #canal`')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }

      await pg.query(
        'INSERT INTO guild_settings (guild_id, stock_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET stock_channel_id = $2',
        [message.guild.id, canal.id]
      )

      const successEmbed = new EmbedBuilder()
        .setTitle('Canal configurado!')
        .setDescription(`Canal de stock configurado com sucesso para ${canal}`)
        .setColor(0x43b581)
      await message.reply({ embeds: [successEmbed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription(
          'Ocorreu um erro ao configurar o canal de stock.' +
          (error?.message ? `\nMotivo: ${error.message}` : '')
        )
        .setColor(0x8B0000)
      await message.reply({ embeds: [errorEmbed] })
    }
  }
}
