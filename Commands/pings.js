const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js')
const { Client: PgClient } = require('pg')
const { postgresConnectionString } = require('../config')

const pg = new PgClient({
  connectionString: postgresConnectionString,
  ssl: { rejectUnauthorized: false }
})
pg.connect()

const pingNames = [ 
  'Shard Epico',
  'Shard Lendario',
  'Shard Mitico',
  'Galo Lendario',
  'Galo Divino',
  'Item Beta',
  'AsuraCoins',
  'XP'
]

module.exports = {
  name: 'pings',
  aliases: ['config', 'pingconfig', 'notifications'],
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
        .setTitle('Lista de pings:')
        .setDescription(pingNames.join('\n'))
        .setColor(0x43b581)

      const configRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('configurar_pings')
          .setLabel('Configurar')
          .setStyle(ButtonStyle.Success)
      )

      const sentMsg = await message.channel.send({ embeds: [embed], components: [configRow] })

      const filter = i => i.customId === 'configurar_pings' && i.user.id === message.author.id
      let buttonInteraction
      try {
        buttonInteraction = await sentMsg.awaitMessageComponent({ filter, time: 7 * 60 * 1000 })
        await buttonInteraction.deferUpdate()
      } catch (err) {
        await sentMsg.edit({ components: [] }).catch(() => {})
        return
      }

      const roles = message.guild.roles.cache
        .filter(role =>
          role.id !== message.guild.id &&
          !role.managed &&
          (!role.tags || (!role.tags.botId && !role.tags.integrationId && !role.tags.premiumSubscriberRole))
        )
        .sort((a, b) => b.position - a.position)
        .map(role => role)

      const roleOptions = roles.map(role => ({
        label: role.name,
        value: role.id
      }))

      const cargosSelecionados = Array(pingNames.length).fill(null)
      let current = 0

      function getSelectionEmbed() {
        return new EmbedBuilder()
          .setTitle(`Selecione o cargo "${pingNames[current]}" no menu abaixo`)
          .setDescription('Cargos selecionados:\n' +
            cargosSelecionados
              .map(roleId => roleId ? `<@&${roleId}>` : null)
              .filter(Boolean)
              .join('\n')
          )
          .setColor(0x43b581)
      }

      function getRow(finalStep = false) {
        return [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_role')
              .setPlaceholder('Selecione um cargo...')
              .addOptions(
                roleOptions.map(option => ({
                  ...option,
                  default: option.value === cargosSelecionados[current]
                }))
              )
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('proximo')
              .setLabel(finalStep ? 'Finalizar' : 'Próximo')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('pular')
              .setLabel('Pular')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(false)
          )
        ]
      }

      await sentMsg.edit({
        embeds: [getSelectionEmbed()],
        components: getRow(current === pingNames.length - 1)
      })

      const collector = sentMsg.createMessageComponentCollector({
        time: 5 * 60 * 1000
      })

      collector.on('collect', async interaction => {
        try {
          if (interaction.user.id !== message.author.id) {
            return;
          }

          if (interaction.isStringSelectMenu()) {
            cargosSelecionados[current] = interaction.values[0]
            await interaction.update({
              embeds: [getSelectionEmbed()],
              components: getRow(current === pingNames.length - 1)
            })
          } else if (interaction.isButton()) {
            if (interaction.customId === 'proximo') {
              current++
            } else if (interaction.customId === 'pular') {
              cargosSelecionados[current] = null
              current++
            }
            if (current >= pingNames.length) {
              collector.stop('done')
              try {
                await pg.query('DELETE FROM pings WHERE guild_id = $1', [message.guild.id])
                for (let i = 0; i < pingNames.length; i++) {
                  if (cargosSelecionados[i]) {
                    await pg.query(
                      'INSERT INTO pings (guild_id, ping_key, role_id) VALUES ($1, $2, $3)',
                      [message.guild.id, pingNames[i], cargosSelecionados[i]]
                    )
                  }
                }
                const doneEmbed = new EmbedBuilder()
                  .setTitle('Sucesso')
                  .setDescription('Os pings foram salvos com sucesso!')
                  .setColor(0x43b581)
                await interaction.update({ embeds: [doneEmbed], components: [] })
              } catch (err) {
                console.error('[Erro ao salvar no banco]', err)
                const errorEmbed = new EmbedBuilder()
                  .setTitle('Erro ao salvar os pings')
                  .setDescription('Ocorreu um erro ao salvar os pings no banco de dados. Por favor, tente novamente ou contate um administrador.')
                  .setColor(0x8B0000)
                await interaction.update({ embeds: [errorEmbed], components: [] })
              }
              return
            }
            await interaction.update({
              embeds: [getSelectionEmbed()],
              components: getRow(current === pingNames.length - 1)
            })
          }
        } catch (err) {
          console.error('[Erro na interação de seleção de ping]', err)
          try {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('Erro inesperado')
                  .setDescription('Ocorreu um erro inesperado ao processar sua ação. Por favor, tente novamente ou contate um administrador.')
                  .setColor(0x8B0000)
              ],
              ephemeral: true
            }).catch(() => {});
          } catch {}
        }
      })

      collector.on('end', async () => {
        if (current < pingNames.length) {
          await sentMsg.edit({ components: [] }).catch(() => {})
        }
      })
    } catch (error) {
      console.error('[Erro geral no comando pings]', error)
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao executar este comando.')
        .setColor(0x8B0000)
      await message.channel.send({ embeds: [errorEmbed] }).catch(() => {})
    }
  }
}
