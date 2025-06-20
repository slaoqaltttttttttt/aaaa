const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'winrate',
  description: 'Calcula o winrate baseado em vitórias e derrotas.',
  async execute(client, message, args) {
    // Verifica se os dois argumentos foram passados
    if (args.length < 2) {
      return message.reply(
        "Uso correto: `s!winrate <win> <lose>`\nExemplo: `s!winrate 20 5`\n\nWin = quantidade de vitórias\nLose = quantidade de derrotas"
      );
    }

    // Tenta converter os argumentos para números
    const win = parseFloat(args[0]);
    const lose = parseFloat(args[1]);

    // Verifica se são números válidos e não negativos
    if (
      isNaN(win) || isNaN(lose) ||
      win < 0 || lose < 0
    ) {
      return message.reply(
        "Coloque as suas wins e loses no comando para o calculo do winrate, usando numeros. Ex: `s!winrate 7689 324`"
      );
    }

    // Faz o cálculo
    const total = win + lose;
    const winrate = total === 0 ? 0 : (win / total) * 100;

    const embed = new EmbedBuilder()
      .setTitle("Calculo de Winrate")
      .setColor("#3aa6ff")
      .setDescription(
        `\`${win} / (${win} + ${lose}) * 100\`:\nWinrate: **${winrate.toFixed(2)}%**`
      );

    await message.reply({ embeds: [embed] });
  }
};
