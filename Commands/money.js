const { EmbedBuilder } = require('discord.js');

// Unidades em ordem decrescente
const units = [
  { value: 1e27, symbol: "no" }, // nonilhão
  { value: 1e24, symbol: "oc" }, // octilhão
  { value: 1e21, symbol: "sp" }, // septilhão
  { value: 1e18, symbol: "sx" }, // sextilhão
  { value: 1e15, symbol: "qn" }, // quintilhão
  { value: 1e12, symbol: "qd" }, // quatrilhão
  { value: 1e9, symbol: "b" },  // bilhão
  { value: 1e6, symbol: "m" },  // milhão
  { value: 1e3, symbol: "k" }   // mil
];

// Função que converte número para a string do jeito pedido
function formatNumberParts(n) {
  if (n < 1000) return n.toString();

  let result = "";
  let remainder = n;

  for (let i = 0; i < units.length; i++) {
    const { value, symbol } = units[i];
    if (remainder >= value) {
      const count = Math.floor(remainder / value);
      remainder = remainder % value;
      result += `${count}${symbol} `;
    }
  }

  if (remainder > 0) result += remainder;
  return result.trim();
}

module.exports = {
  name: 'money',
  description: 'Faz multiplicações de money e trains para usuários autorizados.',
  async execute(client, message, args) {
    // IDs autorizados
    const allowedIds = ['840646649050562561', '946569782508019764'];
    if (!allowedIds.includes(message.author.id)) {
      return message.reply('❌ Você não tem permissão para usar este comando.');
    }

    // Argumento: número de dias
    const dias = parseInt(args[0], 10);
    if (isNaN(dias) || dias <= 0) {
      return message.reply('❌ Você deve informar o número de dias como argumento. Ex: !money 3');
    }

    // Parâmetros diferentes por ID
    let moneyMultA, trainsMultA;
    if (message.author.id === '840646649050562561') {
      moneyMultA = 1440 * 17;
      trainsMultA = 360 * 17;
    } else if (message.author.id === '946569782508019764') {
      moneyMultA = 1440 * 10;
      trainsMultA = 360 * 10;
    }

    const totalMoney = moneyMultA * dias;
    const totalTrains = trainsMultA * dias;

    const embed = new EmbedBuilder()
      .setTitle(`Resultado para ${message.member ? message.member.displayName : message.author.username}`)
      .setColor('#3498db')
      .setDescription(
        `**Dias:** ${dias}\n` +
        `**total trains:** ${formatNumberParts(totalTrains)}\n` +
        `**total money:** ${formatNumberParts(totalMoney)}`
      );

    await message.reply({ embeds: [embed] });
  }
};
