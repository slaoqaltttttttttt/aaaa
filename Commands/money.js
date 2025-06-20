const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'money',
  description: 'Faz multiplicações de money e trains para usuários autorizados.',
  async execute(client, message, args) {
    // IDs autorizados
    const allowedIds = ['840646649050562561', '946569782508019764'];
    if (!allowedIds.includes(message.author.id)) {
      return message.reply('Você não tem permissão para usar este comando.');
    }

    // Argumento: número de dias
    const dias = parseInt(args[0], 10);
    if (isNaN(dias) || dias <= 0) {
      return message.reply('Você deve informar o número de dias como argumento. Ex: s!money 10');
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

    const totalMoney = (moneyMultA * dias).toFixed(2);
    const totalTrains = (trainsMultA * dias).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle(`Resultado para ${message.member ? message.member.displayName : message.author.username}`)
      .setColor('#3498db')
      .setDescription(
        `**Dias:** ${dias}\n` +
        `**total trains:** ${totalTrains}\n` +
        `**total money:** ${totalMoney}`
      );

    await message.reply({ embeds: [embed] });
  }
};
