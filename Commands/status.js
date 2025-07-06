const { ActivityType, EmbedBuilder } = require("discord.js")

module.exports = {
  name: "status",
  async execute(botClient, message, args) {
    try {
      if (message.author.id !== "946569782508019764") {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você não tem permissão para usar este comando.')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }

      if (!args[0] || !args[1]) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Uso: `s!status <tipo> <mensagem>`\nTipos: playing, listening, watching, competing')
          .setColor(0x8B0000)
        return message.reply({ embeds: [errorEmbed] })
      }

      const typeArg = args[0].toLowerCase()
      const textArg = args.slice(1).join(" ")

      let parsedType
      switch (typeArg) {
        case "playing":
          parsedType = ActivityType.Playing
          break
        case "listening":
          parsedType = ActivityType.Listening
          break
        case "watching":
          parsedType = ActivityType.Watching
          break
        case "competing":
          parsedType = ActivityType.Competing
          break
        default:
          const errorEmbed = new EmbedBuilder()
            .setTitle('Erro')
            .setDescription('Tipo inválido. Tipos válidos: playing, listening, watching, competing')
            .setColor(0x8B0000)
          return message.reply({ embeds: [errorEmbed] })
      }

      if (typeof global !== "undefined") {
        global.statusType = parsedType
        global.statusText = textArg
      }

      await botClient.user.setActivity(textArg, { type: parsedType })

      const successEmbed = new EmbedBuilder()
        .setTitle('Status atualizado')
        .setDescription(`Status definido para **${typeArg}**: ${textArg}`)
        .setColor(0x43b581)
      message.reply({ embeds: [successEmbed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription(
          'Ocorreu um erro ao executar este comando.' +
          (error?.message ? `\nMotivo: ${error.message}` : '')
        )
        .setColor(0x8B0000)
      await message.reply({ embeds: [errorEmbed] })
    }
  }
}
