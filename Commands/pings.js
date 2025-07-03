const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js')
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Você precisa ser administrador para usar este comando.')
        .setColor(0x8B0000)
      return message.reply({ embeds: [errorEmbed] })
    }

    const embed = new EmbedBuilder()
      .setTitle('Pings necessários')
      .setDescription(pingNames.join('\n'))
      .setColor(0x43b581)

    const configRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('configurar_pings')
        .setLabel('Configurar')
        .setStyle(ButtonStyle.Success)
    )

    const sentMsg = await message.channel.send({ embeds: [embed], components: [configRow] })

    // Aguarda clique no botão
    const filter = i => i.customId === 'configurar_pings' && i.user.id === message.author.id
    let buttonInteraction
    try {
      buttonInteraction = await sentMsg.awaitMessageComponent({ filter, time: 5 * 60 * 1000 })
    } catch {
      await sentMsg.edit({ components: [] }).catch(() => {})
      return
    }

    // Busca todos os cargos do servidor válidos (exclui @everyone e cargos de aplicação/bot)
    // ROLE_MANAGEABLE: pode ser atribuído por bots
    // ROLE_EDITABLE: pode ser editado pelo bot
    // !role.managed -> não é de aplicação/bot
    // !role.tags?.botId && !role.tags?.integrationId && !role.tags?.premiumSubscriberRole
    const roles = message.guild.roles.cache
      .filter(role =>
        role.id !== message.guild.id && // exclui @everyone
        !role.managed && // exclui cargos de aplicação/bot
        (!role.tags || (!role.tags.botId && !role.tags.integrationId && !role.tags.premiumSubscriberRole))
      )
      .sort((a, b) => b.position - a.position)
      .map(role => role)

    const roleOptions = roles.map(role => ({
      label: role.name,
      value: role.id
    }))

    // Estado da configuração
    const cargosSelecionados = Array(pingNames.length).fill(null)
    let current = 0

    // Função para criar embed de seleção
    function getSelectionEmbed() {
      return new EmbedBuilder()
        .setTitle(`Selecione o cargo "${pingNames[current]}" no menu abaixo`)
        .setDescription('Cargos selecionados:\n' +
          cargosSelecionados
            .map((roleId, idx) => roleId ? `<@&${roleId}>` : null)
            .filter(v => v)
            .join('\n')
        )
        .setColor(0x43b581)
    }

    // Função para criar o select menu e botões
    function getRow(finalStep = false, selectedRole) {
      return [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_role')
            .setPlaceholder(selectedRole ? 'Cargo selecionado!' : 'Selecione um cargo...')
            .setOptions(roleOptions)
            .setDisabled(Boolean(selectedRole)) // se já selecionou, desativa menu até clicar próximo/pular
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('proximo')
            .setLabel(finalStep ? 'Finalizar' : 'Próximo')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!selectedRole), // só habilita se selecionou algum cargo
          new ButtonBuilder()
            .setCustomId('pular')
            .setLabel('Pular')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false)
        )
      ]
    }

    // Primeira edição: pede o primeiro cargo
    await sentMsg.edit({
      embeds: [getSelectionEmbed()],
      components: getRow(current === pingNames.length - 1, cargosSelecionados[current])
    })

    // Interação principal
    const collector = sentMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 5 * 60 * 1000
    })

    collector.on('collect', async interaction => {
      // Seleção de cargo: já mostra na lista e desativa menu
      if (interaction.isStringSelectMenu()) {
        cargosSelecionados[current] = interaction.values[0]
        await interaction.update({
          embeds: [getSelectionEmbed()],
          components: getRow(current === pingNames.length - 1, cargosSelecionados[current])
        })
      } else if (interaction.isButton()) {
        if (interaction.customId === 'proximo') {
          // Vai ao próximo ping
          current++
        } else if (interaction.customId === 'pular') {
          cargosSelecionados[current] = null
          current++
        }
        // Parou?
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
            const errorEmbed = new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Ocorreu um erro ao salvar os pings no banco de dados.' +
                (err?.message ? `\nMotivo: ${err.message}` : ''))
              .setColor(0x8B0000)
            await interaction.update({ embeds: [errorEmbed], components: [] })
          }
          return
        }
        // Atualiza embed para o próximo cargo, menu limpo e ativado
        await interaction.update({
          embeds: [getSelectionEmbed()],
          components: getRow(current === pingNames.length - 1, cargosSelecionados[current])
        })
      }
    })

    collector.on('end', async () => {
      if (current < pingNames.length) {
        await sentMsg.edit({ components: [] }).catch(() => {})
      }
    })
  }
}
