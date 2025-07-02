const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
  name: 'dev',
  description: 'Mostra informações de desenvolvimento e uso do bot.',
  async execute(client, message, args) {
    // Quantidade de servidores (guilds)
    const servidores = client.guilds.cache.size;

    // Uso de RAM (processo do bot)
    const ramUsadaMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

    // Uso de memória total (sistema)
    const memoriaTotalMB = (os.totalmem() / 1024 / 1024).toFixed(2);
    const memoriaLivreMB = (os.freemem() / 1024 / 1024).toFixed(2);
    const memoriaUsadaMB = (memoriaTotalMB - memoriaLivreMB).toFixed(2);

    // Ping do bot
    const ping = Math.round(client.ws.ping);

    // Uptime formatado
    function formatUptime(ms) {
      let totalSeconds = parseInt(ms / 1000, 10);
      const days = Math.floor(totalSeconds / 86400);
      totalSeconds %= 86400;
      const hours = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      const minutes = Math.floor(totalSeconds / 60);
      return `${days} dias ${hours} horas ${minutes} minutos`;
    }
    const uptime = formatUptime(client.uptime);

    // Host (preencher depois)
    const host = "Koyeb"; // <- Edite isso com o valor desejado

    const embed = new EmbedBuilder()
      .setTitle('Info')
      .setColor('#00BFFF') // Azul claro
      .setDescription(
        `**Servidores:** ${servidores}\n` +
        `**Ram usada:** ${ramUsadaMB} MB\n` +
        `**Memoria usada:** ${memoriaUsadaMB} MB\n` +
        `**Ping:** ${ping}ms\n` +
        `**Bot online a** ${uptime}\n` +
        `**Host:** ${host}`
      );

    await message.send({ embeds: [embed] });
  }
};
