const { EmbedBuilder } = require('discord.js')

const units = [
  { value: 1e27, symbol: "no" },
  { value: 1e24, symbol: "oc" },
  { value: 1e21, symbol: "sp" },
  { value: 1e18, symbol: "sx" },
  { value: 1e15, symbol: "qn" },
  { value: 1e12, symbol: "qd" },
  { value: 1e9, symbol: "b" },
  { value: 1e6, symbol: "m" },
  { value: 1e3, symbol: "k" }
]

function formatNumberParts(n) {
  if (n < 1000) return n.toString()
  let result = ""
  let remainder = n
  for (let i = 0; i < units.length; i++) {
    const { value, symbol } = units[i]
    if (remainder >= value) {
      const count = Math.floor(remainder / value)
      remainder = remainder % value
      result += `${count}${symbol} `
    }
  }
  if (remainder > 0) result += remainder
  return result.trim()
}

module.exports = {
  name: 'money',
  description: 'Faz multiplicações de money e trains para usuários autorizados.',
  async execute(client, message, args) {
    try {
      const allowedIds = ['840646649050562561', '946569782508019764']
      if (!allowedIds.includes(message.author.id)) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você não tem permissão para usar este comando.')
          .setColor(0x8B0000)
        return await message.reply({ embeds: [errorEmbed] })
      }

      const dias = parseInt(args[0], 10)
      if (isNaN(dias) || dias <= 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('Você deve informar o número de dias como argumento. Ex: !money 3')
          .setColor(0x8B0000)
        return await message.reply({ embeds: [errorEmbed] })
      }

      let moneyMultA, trainsMultA
      if (message.author.id === '840646649050562561') {
        moneyMultA = 360 * 30
        trainsMultA = 360 * 30
      } else if (message.author.id === '946569782508019764') {
        moneyMultA = 360 * 17
        trainsMultA = 360 * 17
      }

      const totalMoney = moneyMultA * dias
      const totalTrains = trainsMultA * dias

      const embed = new EmbedBuilder()
        .setTitle(`Resultado para ${message.member ? message.member.displayName : message.author.username}`)
        .setColor('#3498db')
        .setDescription(
          `**Dias:** ${dias}\n` +
          `**total trains:** ${formatNumberParts(totalTrains)}\n` +
          `**total money:** ${formatNumberParts(totalMoney)}`
        )

      await message.reply({ embeds: [embed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao executar este comando.')
        .setColor(0x8B0000)
      await message.reply({ embeds: [errorEmbed] })
    }
  }
}
