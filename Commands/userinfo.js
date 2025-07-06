const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js')
const Tesseract = require('tesseract.js')
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const { userClient } = require('../index')

module.exports = {
  name: 'userinfo',
  description: 'Mostra informações detalhadas de um usuário',
  async execute(botClient, message, args) {
    try {
      let user = message.mentions.users.first()
      if (!user && args[0] && /^\d{17,19}$/.test(args[0])) {
        user = await botClient.users.fetch(args[0]).catch(() => null)
      }
      if (!user) user = message.author

      const member = message.guild.members.cache.get(user.id)
      const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 })
      const created = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`
      const age = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`

      const description = `### [${user.username}](https://discord.com/users/${user.id})\n` +
        `ID: \`${user.id}\`\n\n` +
        `**Data de criação:** ${created}\n` +
        `**Idade da conta:** ${age}`

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('info_galo')
          .setLabel('info galo')
          .setStyle(ButtonStyle.Secondary)
      )

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Informações de ${user.tag}`, iconURL: avatar })
        .setThumbnail(avatar)
        .setColor(0x5865F2)
        .setDescription(description)

      const sent = await message.channel.send({ embeds: [embed], components: [row] })

      const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 })

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Apenas o autor pode usar esse botão.', ephemeral: true })
        await i.deferReply({ ephemeral: true })

        const canal = await userClient.channels.fetch('1383489203870105641')
        await canal.send(`Asura galo <@${user.id}>`)

        const filter = m => m.author.id === '470684281102925844' && m.attachments.size > 0
        canal.awaitMessages({ filter, max: 1, time: 10000 }).then(async collected => {
          const image = collected.first().attachments.first().url
          const response = await fetch(image)
          const buffer = await response.buffer()
          const filePath = path.join(__dirname, 'galo_temp.png')
          fs.writeFileSync(filePath, buffer)

          const { data: { text } } = await Tesseract.recognize(filePath, 'por')
          fs.unlinkSync(filePath)

          const nome = text.match(/^(.*)\n/)?[1] || 'Desconhecido'
          const tipo = text.match(/Tipo\s+(\w+)/i)?[1] || 'Desconhecido'
          const level = text.match(/Level\s+(\d+)/i)?[1] || 'Desconhecido'
          const item = text.match(/Item\s+(.*)/i)?[1] || 'Desconhecido'
          const trials = text.match(/Trials\s+(\d+\/\d+)/i)?[1] || 'Desconhecido'

          const galoEmbed = new EmbedBuilder()
            .setTitle(nome)
            .setDescription(`**Tipo de galo:** ${tipo}\n**Level:** ${level}\n**Item atual:** ${item}\n**Quantidade de trials:** ${trials}`)
            .setColor(0xff9966)
            .setImage(image)

          await i.editReply({ embeds: [galoEmbed] })
        }).catch(() => {
          i.editReply({ content: 'Não encontrei a imagem enviada pelo bot.' })
        })
      })

    } catch (err) {
      console.error(err)
      await message.reply({ content: 'Erro ao buscar informações do usuário.' })
    }
  }
}
