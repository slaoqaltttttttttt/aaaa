const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js')
const { Client: PgClient } = require('pg')

const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
})
pg.connect()

const pingNames = [
  'Shard Epico',
  'Shard Lendario',
  'Shard Mitico',
  'Galo Lendario',
  'Item Beta',
  'AsuraCoins',
  'XP'
]

module.exports = {
  name: 'pings',
  description: 'Configure os pings de certos itens em stock, Shard Mitico, Galo Lendario, etc.',
  usage: 's!pings',
  async execute(client, message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você precisa ser administrador para usar este comando.')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }

      const embed = new EmbedBuilder()
        .setTitle('pings nescessarios')
        .setDescription(pingNames.join('\n'))
        .setColor(0x43b581)

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('configurar_pings')
          .setLabel('Configurar')
          .setStyle(ButtonStyle.Success)
      )

      const sentMsg = await message.channel.send({ embeds: [embed], components: [row] })

      // Timer para desativar o botão após 5 minutos se ninguém clicar
      const disableButtonTimeout = setTimeout(async () => {
        await sentMsg.edit({ components: [] }).catch(() => {})
      }, 5 * 60 * 1000)

      const filter = (i) => i.customId === 'configurar_pings' && i.user.id === message.author.id
      let buttonInteraction
      try {
        buttonInteraction = await sentMsg.awaitMessageComponent({ filter, time: 5 * 60 * 1000 })
      } catch {
        buttonInteraction = null
      }

      clearTimeout(disableButtonTimeout)

      if (!buttonInteraction) {
        await sentMsg.edit({ components: [] }).catch(() => {})
        return
      }

      await buttonInteraction.reply({ content: `Cargo para ${pingNames[0]}`, ephemeral: true })

      const cargos = []
      let current = 0
      let userMsgCount = 0
      let idleTimeout = null
      let finished = false

      // Função auxiliar para parar o collector e marcar como finalizado
      const stopCollector = (collector, reason) => {
        if (finished) return
        finished = true
        collector.stop(reason)
      }

      const collector = message.channel.createMessageCollector({
        filter: m => m.author.id === message.author.id,
        time: 5 * 60 * 1000
      })

      await sentMsg.edit({ components: [] }).catch(() => {})

      // Função para resetar o timeout de inatividade
      const resetIdleTimeout = () => {
        if (idleTimeout) clearTimeout(idleTimeout)
        idleTimeout = setTimeout(() => {
          stopCollector(collector, 'idle')
        }, 5 * 60 * 1000)
      }

      resetIdleTimeout()

      collector.on('collect', async (msg) => {
        // Ignorar mensagens que são apenas menções de cargos
        if (
          msg.mentions.roles.size === 0 &&
          msg.content.trim().length > 0
        ) {
          userMsgCount++
        }

        // Se o usuário enviou 10 mensagens não relacionadas a menções de cargos, para de observar
        if (userMsgCount >= 10) {
          stopCollector(collector, 'msglimit')
          return
        }

        resetIdleTimeout()

        const role = msg.mentions.roles.first()
        if (!role) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Erro')
            .setDescription('Mencione um cargo válido.')
            .setColor(0x8B0000)
          await msg.reply({ embeds: [errorEmbed] })
          return
        }
        cargos.push(role.id)
        current++
        if (current < pingNames.length) {
          await msg.reply(`Cargo para ${pingNames[current]}`)
        } else {
          stopCollector(collector, 'done')
        }
      })

      collector.on('end', async (_, reason) => {
        if (idleTimeout) clearTimeout(idleTimeout)
        if (reason !== 'done') return

        try {
          await pg.query('DELETE FROM pings WHERE guild_id = $1', [message.guild.id])
          for (let i = 0; i < pingNames.length; i++) {
            await pg.query(
              'INSERT INTO pings (guild_id, ping_key, role_id) VALUES ($1, $2, $3)',
              [message.guild.id, pingNames[i], cargos[i]]
            )
          }
          await message.channel.send('Pings configurados.')
        } catch (err) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Erro')
            .setDescription(
              'Ocorreu um erro ao salvar os pings no banco de dados.' +
              (err?.message ? `\nMotivo: ${err.message}` : '')
            )
            .setColor(0x8B0000)
          await message.channel.send({ embeds: [errorEmbed] })
        }
      })
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
