const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { Client: PgClient } = require('pg');
const { postgresConnectionString } = require('../config')

const pg = new PgClient({
  connectionString: postgresConnectionString,
  ssl: { rejectUnauthorized: false }
});
pg.connect();

module.exports = {
  name: 'dbview',
  description: 'Veja o banco de dados',
  async execute(client, message, args) {
    // Só permite para o ID especificado
    if (message.author.id !== '946569782508019764') {
      return;
    }

    // Busca as tabelas do banco
    let tables;
    try {
      const res = await pg.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      tables = res.rows.map(r => r.table_name);
    } catch (err) {
      console.error('[DBVIEW] Erro ao buscar tabelas:', err);
      return message.reply('Erro ao buscar as tabelas.');
    }

    if (!tables.length) return message.reply('Nenhuma tabela encontrada.');

    // Menu de seleção de tabela
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_db_table')
      .setPlaceholder('Selecione uma tabela...')
      .addOptions(tables.map(t => ({
        label: t,
        value: t
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const sentMsg = await message.channel.send({
      content: 'Selecione uma tabela para visualizar:',
      components: [row]
    });

    // Collector para aguardar seleção
    const collector = sentMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId === 'select_db_table',
      time: 2 * 60 * 1000
    });

    collector.on('collect', async interaction => {
      const table = interaction.values[0];
      let rows;
      try {
        const res = await pg.query(`SELECT * FROM "${table}"`);
        rows = res.rows;
      } catch (err) {
        console.error('[DBVIEW] Erro ao ler tabela:', err);
        return interaction.reply({ content: 'Erro ao ler a tabela.', ephemeral: true });
      }

      // Formatação especial para as tabelas específicas
      if (table === 'guild_settings') {
        if (!rows.length) {
          return interaction.reply({ content: 'A tabela está vazia.', ephemeral: true });
        }
        const fields = [];
        for (const row of rows) {
          // guild_id -> nome do server
          let guildName = row.guild_id;
          let guildObj = client.guilds.cache.get(row.guild_id);
          if (guildObj) guildName = guildObj.name;
          // stock_channel_id -> menção do canal
          let channelMention = row.stock_channel_id ? `<#${row.stock_channel_id}>` : 'Nenhum';
          fields.push({
            name: guildName,
            value: `Canal de stock: ${channelMention}`
          });
        }
        const embed = new EmbedBuilder()
          .setTitle('Tabela: guild_settings')
          .setColor(0x43b581)
          .addFields(fields);
        await interaction.update({ embeds: [embed], components: [] });
      } else if (table === 'pings') {
        if (!rows.length) {
          return interaction.reply({ content: 'A tabela está vazia.', ephemeral: true });
        }
        const fields = [];
        for (const row of rows) {
          // guild_id -> nome do server
          let guildName = row.guild_id;
          let guildObj = client.guilds.cache.get(row.guild_id);
          if (guildObj) guildName = guildObj.name;
          // role_id -> menção do cargo
          let roleMention = row.role_id ? `<@&${row.role_id}>` : 'Nenhum';
          // ping_key -> apenas texto
          fields.push({
            name: `${guildName} - ${row.ping_key}`,
            value: `Cargo: ${roleMention}`
          });
        }
        const embed = new EmbedBuilder()
          .setTitle('Tabela: pings')
          .setColor(0x43b581)
          .addFields(fields);
        await interaction.update({ embeds: [embed], components: [] });
      } else {
        // Outras tabelas: mostra tudo como texto mesmo
        if (!rows.length) {
          return interaction.reply({ content: 'A tabela está vazia.', ephemeral: true });
        }
        let text = '';
        rows.forEach((row, idx) => {
          text += `**#${idx + 1}**\n`;
          Object.entries(row).forEach(([k, v]) => {
            text += `\`${k}\`: ${v}\n`;
          });
          text += '\n';
        });
        const embed = new EmbedBuilder()
          .setTitle(`Tabela: ${table}`)
          .setColor(0x43b581)
          .setDescription(text.length < 4000 ? text : 'Muitos dados para exibir.');
        await interaction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', async () => {
      await sentMsg.edit({ components: [] }).catch(() => {});
    });
  }
};
