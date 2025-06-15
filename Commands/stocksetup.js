const { Client: PgClient } = require('pg');
const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
});
pg.connect();

module.exports = {
  name: 'setup',
  async execute(client, message, args) {
    if (!message.guild) return message.reply('Este comando só pode ser usado em um servidor.');
    if (!message.member || !message.member.permissions) return message.reply('Não foi possível verificar suas permissões.');
    if (!message.member.permissions.has('Administrator')) return message.reply('Você precisa ser administrador para usar este comando.');
    const canal = message.mentions.channels.first();
    if (!canal) return message.reply('Você precisa mencionar um canal. Ex: `js!stocksetup #canal`');

    await pg.query(
      'INSERT INTO guild_settings (guild_id, stock_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET stock_channel_id = $2',
      [message.guild.id, canal.id]
    );
    message.reply(`✅ Canal de stock configurado com sucesso para ${canal}`);
  }
};