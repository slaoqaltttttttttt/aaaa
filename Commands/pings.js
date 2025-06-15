const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { Client: PgClient } = require('pg');

// Conexão com PostgreSQL Railway (use a mesma do seu index.js)
const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
});
pg.connect();

const pingNames = [
  'Shard Epico',
  'Shard Lendario',
  'Shard Mitico',
  'Galo Lendario',
  'Item Beta',
  'AsuraCoins',
  'XP'
];

module.exports = {
  name: 'pings',
  async execute(client, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Você precisa ser administrador para usar este comando.');
    }

    const embed = new EmbedBuilder()
      .setTitle('pings nescessarios')
      .setDescription(pingNames.join('\n'))
      .setColor(0x43b581);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('configurar_pings')
        .setLabel('Configurar')
        .setStyle(ButtonStyle.Success)
    );

    const sentMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const filter = (i) => i.customId === 'configurar_pings' && i.user.id === message.author.id;
    const buttonInteraction = await sentMsg.awaitMessageComponent({ filter, time: 60000 }).catch(() => null);

    if (!buttonInteraction) return sentMsg.edit({ components: [] });

    await buttonInteraction.reply({ content: `Cargo para ${pingNames[0]}`, ephemeral: true });

    const cargos = [];
    let current = 0;

    const collector = message.channel.createMessageCollector({
      filter: m => m.author.id === message.author.id,
      time: 5 * 60 * 1000
    });

    await sentMsg.edit({ components: [] }); // Remove botão

    collector.on('collect', async (msg) => {
      const role = msg.mentions.roles.first();
      if (!role) {
        msg.reply('Mencione um cargo válido.');
        return;
      }
      cargos.push(role.id);
      current++;
      if (current < pingNames.length) {
        msg.reply(`Cargo para ${pingNames[current]}`);
      } else {
        collector.stop('done');
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason !== 'done') return;

      try {
        // Remove todos os pings antigos desse servidor
        await pg.query('DELETE FROM pings WHERE guild_id = $1', [message.guild.id]);
        // Insere os novos pings
        for (let i = 0; i < pingNames.length; i++) {
          await pg.query(
            'INSERT INTO pings (guild_id, ping_key, role_id) VALUES ($1, $2, $3)',
            [message.guild.id, pingNames[i], cargos[i]]
          );
        }
        message.channel.send('Pings configurados.');
      } catch (err) {
        console.error('[Pings] Erro ao salvar pings no banco:', err);
      }
    });
  }
};