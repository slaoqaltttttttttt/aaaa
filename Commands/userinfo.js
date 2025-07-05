const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'Mostra informações detalhadas de um usuário',
  async execute(botClient, message, args) {
    try {
      const user = message.mentions.users.first();
      if (!user) return message.reply('Você precisa mencionar um usuário!');

      const member = message.guild.members.cache.get(user.id);
      const userTag = user.tag;
      const username = user.displayName || user.username;
      const isBot = user.bot ? ' (Bot)' : '';
      const userLink = `https://discord.com/users/${user.id}`;
      const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });

      const createdTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`;
      const ageTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`;

      const badges = [];
      const flags = (await user.fetchFlags())?.toArray?.() || [];

      for (const flag of flags) {
        switch (flag) {
          case 'ActiveDeveloper': badges.push('Desenvolvedor Ativo'); break;
          case 'HypeSquadOnlineHouse1': badges.push('HypeSquad Bravery'); break;
          case 'HypeSquadOnlineHouse2': badges.push('HypeSquad Brilliance'); break;
          case 'HypeSquadOnlineHouse3': badges.push('HypeSquad Balance'); break;
          case 'Hypesquad': badges.push('HypeSquad'); break;
          case 'BugHunterLevel1': badges.push('Bug Hunter Lv1'); break;
          case 'BugHunterLevel2': badges.push('Bug Hunter Lv2'); break;
          case 'VerifiedBot': badges.push('Bot Verificado'); break;
          case 'PremiumEarlySupporter': badges.push('Early Supporter'); break;
        }
      }

      if (user.avatar?.startsWith('a_')) badges.push('Nitro (GIF)');

      if (member?.premiumSince) {
        const boostSince = `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`;
        badges.push(`Booster desde ${boostSince}`);
      }

      const roles = member?.roles.cache
        .filter(r => r.id !== message.guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'Nenhum';

      const joinedTimestamp = member?.joinedAt
        ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`
        : 'Desconhecido';

      const presence = member?.presence;
      const status = presence?.status || 'offline';
      const customStatus = presence?.activities?.find(a => a.type === 4)?.state || 'Nenhum';

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Informações do usuário ${userTag}${isBot}`, iconURL: avatar })
        .setThumbnail(avatar)
        .setColor(0x5865F2)
        .setDescription(
          `### [${username}](${userLink})\n` +
          `ID: \`${user.id}\`\n\n` +
          `**Data de criação da conta:** ${createdTimestamp}\n` +
          `**Idade da conta:** ${ageTimestamp}\n` +
          `**Status:** ${status}\n` +
          `**Status personalizado:** ${customStatus}\n` +
          `**Badges:**\n${formatBadges(badges)}`
        )
        .addFields(
          { name: 'Entrou no servidor', value: joinedTimestamp, inline: true },
          { name: 'Cargos', value: roles, inline: false }
        )
        .setFooter({ text: `Pedido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao tentar mostrar as informações do usuário.')
        .setColor(0x8B0000);
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

function formatBadges(badges) {
  if (badges.length === 0) return 'Nenhuma';
  const lines = [];
  for (let i = 0; i < badges.length; i += 3) {
    lines.push(badges.slice(i, i + 3).join(', '));
  }
  return lines.join('\n');
}
