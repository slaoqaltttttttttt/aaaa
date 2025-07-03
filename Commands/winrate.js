const { EmbedBuilder } = require('discord.js')

module.exports = {
  name: 'winrate',
  description: 'Calcula o winrate baseado em vitórias e derrotas.',
  usage: 's!winrate <win> <lose>\nExemplo: s!winrate 20 5',
  async execute(client, message, args) {
    try {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription(
                "Uso correto: `s!winrate <win> <lose>`\nExemplo: `s!winrate 20 5`\n\nWin = quantidade de vitórias\nLose = quantidade de derrotas"
              )
              .setColor(0x8B0000)
          ]
        })
      }

      const win = parseFloat(args[0])
      const lose = parseFloat(args[1])

      if (
        isNaN(win) || isNaN(lose) ||
        win < 0 || lose < 0
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Erro')
              .setDescription(
                "Coloque as suas wins e loses no comando para o calculo do winrate, usando números. Ex: `s!winrate 7689 324`"
              )
              .setColor(0x8B0000)
          ]
        })
      }

      const total = win + lose
      const winrate = total === 0 ? 0 : (win / total) * 100

      const embed = new EmbedBuilder()
        .setTitle("Cálculo de Winrate")
        .setColor("#3aa6ff")
        .setDescription(
          `\`${win} / (${win} + ${lose}) * 100\`:\nWinrate: **${winrate.toFixed(2)}%**`
        )

      await message.reply({ embeds: [embed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription(
          'Ocorreu um erro ao calcular o winrate.' +
          (error?.message ? `\nMotivo: ${error.message}` : '')
        )
        .setColor(0x8B0000)
      await message.reply({ embeds: [errorEmbed] })
    }
  }
}
