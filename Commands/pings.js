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
    // Verificação de permissão
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Você precisa ser administrador para usar este comando.')
        .setColor(0x8B0000)
      return message.reply({ embeds: [errorEmbed] })
    }

    // Embed inicial com botão configurar
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

    // Busca todos os cargos do servidor (exceto @everyone)
    const roles = message.guild.roles.cache
      .filter(role => role.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(role => role)

    // Prepara opções para o select menu
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
    function getRow(finalStep = false) {
      return [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_role')
            .setPlaceholder('Selecione um cargo...')
            .addOptions(roleOptions)
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
        )
      ]
    }

    // Primeira edição: pede o primeiro cargo
    await sentMsg.edit({
      embeds: [getSelectionEmbed()],
      components: getRow(current === pingNames.length - 1)
    })

    // Interação principal
    const collector = sentMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 5 * 60 * 1000
    })

    collector.on('collect', async interaction => {
      if (interaction.isStringSelectMenu()) {
        // Salva o cargo selecionado para o ping atual
        cargosSelecionados[current] = interaction.values[0]
        await interaction.deferUpdate()
      } else if (interaction.isButton()) {
        if (interaction.customId === 'proximo' || interaction.customId === 'finalizar') {
          if (!cargosSelecionados[current]) {
            // Se não selecionou nada, ignora
            await interaction.deferUpdate()
            return
          }
          current++
        } else if (interaction.customId === 'pular') {
          cargosSelecionados[current] = null
          current++
        }
        await interaction.deferUpdate()

        // Verifica se terminou
        if (current >= pingNames.length) {
          collector.stop('done')
          // Salva no banco e envia embed de sucesso
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
            await sentMsg.edit({ embeds: [doneEmbed], components: [] })
          } catch (err) {
            const errorEmbed = new EmbedBuilder()
              .setTitle('Erro')
              .setDescription('Ocorreu um erro ao salvar os pings no banco de dados.' +
                (err?.message ? `\nMotivo: ${err.message}` : ''))
              .setColor(0x8B0000)
            await sentMsg.edit({ embeds: [errorEmbed], components: [] })
          }
          return
        }

        // Atualiza embed e componentes para o próximo cargo
        await sentMsg.edit({
          embeds: [getSelectionEmbed()],
          components: getRow(current === pingNames.length - 1)
        })
      }
    })

    collector.on('end', async () => {
      // Se não finalizar, remove componentes
      if (current < pingNames.length) {
        await sentMsg.edit({ components: [] }).catch(() => {})
      }
    })
  }
}
