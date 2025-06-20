const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Mostra a lista de comandos e como usar o bot de stock',
  async execute(botClient, message, args) {
    const helpEmbed = new EmbedBuilder()
      .setTitle('Stock help')
      .setColor(0x9B59B6) // Roxo
      .setDescription(
        '`s!setup:`\n' +
        'Configura o canal em que o stock vai ser enviado.\n' +
        'Exemplo: `s!setup #stock`\n\n' +
        '`s!pings`\n' +
        'Configure os pings de certos itens em stock, Shard Mitico, Galo Lendario, etc.\n\n' +
        '`s!stock`\n' +
        'Veja o stock atual do asura shop.\n\n' +
        '`s!winrate`\n' +
        'Calcule o seu winrate no bot\n' +
        'Exemplo: `s!winrate 7889 756\n`'
      );

    await message.reply({ embeds: [helpEmbed] });
  }
};
