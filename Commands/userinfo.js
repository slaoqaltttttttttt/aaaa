const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'Mostra informações detalhadas de um usuário',
  async execute(botClient, message, args) {
    try {
      let user;
      let member;

      const input = args.join(' ').trim();

      // 1. Mencionado
      const mention = message.mentions.users.first();
      if (mention) {
        user = mention;
      }

      // 2. ID
      else if (/^\d{17,19}$/.test(input)) {
        user = await botClient.users.fetch(input).catch(() => null);
      }

      // 3. Nome de usuário
      else if (input.length >= 2) {
        const search = input.toLowerCase();
        user = botClient.users.cache.find(u =>
          u.username.toLowerCase() === search
        ) || null;
      }

      // 4. Nenhum argumento: usar quem executou
      if (!user) user = message.author;

      // Tenta pegar membro
      member = message.guild.members.cache.get(user.id) || null;

      const userTag = user.tag;
      const username = user.displayName || user.username;
      const isBot = user.bot ? ' (Bot)' : '';
      const userLink = `https://discord.com/users/${user.id}`;
      const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });

      const createdTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`;
      const ageTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`;

      // Badges
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

      // Presença
      let status = 'offline';
      let customStatus = 'Nenhum';
      let platform = 'Desconhecida';

      if (member?.presence) {
        status = member.presence?.status || 'offline';

        const activity = member.presence.activities.find(a => a.type === 4);
        if (activity) customStatus = activity.state || 'Nenhum';

        const clientStatus = member.presence.clientStatus;
        if (clientStatus) {
          if (clientStatus.desktop) platform = 'Desktop';
          else if (clientStatus.mobile) platform = 'Mobile';
          else if (clientStatus.web) platform = 'Web';
        }
      }

      // Descrição
      let description =
        `### [${username}](${userLink})\n` +
        `ID: \`${user.id}\`\n\n` +
        `**User info**\n` +
        `**Data de criação da conta:** ${createdTimestamp}\n` +
        `**Idade da conta:** ${ageTimestamp}\n` +
        `**Status:** ${status}\n` +
        `**Status personalizado:** ${customStatus}\n` +
        `**Plataforma:** ${platform}\n` +
        `**Badges:**\n${formatBadges(badges)}\n`;

      // Se estiver no servidor, mostra server info
      if (member) {
        const joinedTimestamp = member.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`
          : 'Desconhecido';

        const roles = member.roles.cache
          .filter(r => r.id !== message.guild.id)
          .map(r => `<@&${r.id}>`)
          .join(', ') || 'Nenhum';

        description +=
          `\n**Server info**\n` +
          `**Entrou no servidor:** ${joinedTimestamp}\n` +
          `**Cargos:** ${roles}`;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Informações do usuário ${userTag}${isBot}`, iconURL: avatar })
        .setThumbnail(avatar)
        .setColor(0x5865F2)
        .setDescription(description)
        .setFooter({ text: `executado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

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
