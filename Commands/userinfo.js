const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createWorker } = require('tesseract.js');

module.exports = {
  name: 'userinfo',
  description: 'Mostra informações detalhadas de um usuário',
  async execute(botClient, message, args, userClient) {
    try {
      let user;
      let member;

      const input = args.join(' ').trim();

      const mention = message.mentions.users.first();
      if (mention) {
        user = mention;
      } else if (/^\d{17,19}$/.test(input)) {
        user = await botClient.users.fetch(input).catch(() => null);
      } else if (input.length >= 2) {
        const search = input.toLowerCase();
        user = botClient.users.cache.find(u =>
          u.username.toLowerCase() === search
        ) || null;
      }

      if (!user) user = message.author;

      member = message.guild.members.cache.get(user.id) || null;

      const userTag = user.tag;
      const username = user.displayName || user.username;
      const isBot = user.bot ? ' (Bot)' : '';
      const userLink = `https://discord.com/users/${user.id}`;
      const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });

      const createdTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`;
      const ageTimestamp = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`;

      const badges = [];
      const flags = (await user.fetch()).flags?.toArray?.() || [];

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

      const button = new ButtonBuilder()
        .setCustomId('info_galo')
        .setLabel('Info Galo')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15_000
      });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Apenas você pode usar este botão.', flags: 64 });

        await i.deferReply({ flags: 64 });

        const canalId = '1383489203870105641';
        const conteudo = `Asura galo <@${user.id}>`;

        const canal = await userClient.channels.fetch(canalId).catch(() => null);
        if (!canal || typeof canal.send !== 'function') return i.editReply({ content: 'Erro ao acessar canal do galo.' });

        const enviado = await canal.send(conteudo);

        setTimeout(async () => {
          const msgs = await canal.messages.fetch({ limit: 10 });
          const respostaBot = msgs.find(m => m.author.id === '470684281102925844' && m.attachments.size > 0);

          if (!respostaBot) return i.editReply({ content: 'Nenhuma imagem do galo recebida.' });

          const imageUrl = respostaBot.attachments.first().url;

          const worker = await createWorker();
          await worker.load();
          await worker.loadLanguage('eng');
          await worker.initialize('eng');
          const { data: { text } } = await worker.recognize(imageUrl);
          await worker.terminate();

          const nome = (text.split('\n').find(l => l.trim().length > 5 && !/item|level|tipo|trial/i.test(l)) || 'Desconhecido').trim();
          const tipo = (text.match(/Tipo: (\w+)/i) || [])[1] || 'Desconhecido';
          const level = (text.match(/Level: (\d+)/i) || [])[1] || 'Desconhecido';
          const item = (text.match(/Item atual: (.*)/i) || [])[1] || 'Nenhum';
          const trials = (text.match(/(\d+\/\d+)\s+Trials/i) || [])[1] || '0/0';

          const galoEmbed = new EmbedBuilder()
            .setTitle(nome)
            .setDescription(
              `Tipo de galo: ${tipo}\nLevel: ${level}\nItem atual: ${item}\nQuantidade de trials: ${trials}`
            )
            .setColor(0x00AE86)
            .setThumbnail(imageUrl);

          await i.editReply({ embeds: [galoEmbed] });
        }, 5000);
      });

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
