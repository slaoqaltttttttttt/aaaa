const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Tesseract = require('tesseract.js');
const fetch = require('node-fetch');
const Jimp = require('jimp');

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
        user = botClient.users.cache.find(u => u.username.toLowerCase() === search) || null;
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

      let description = `### [${username}](${userLink})\nID: \`${user.id}\`\n\n**User info**\n**Data de criação da conta:** ${createdTimestamp}\n**Idade da conta:** ${ageTimestamp}\n**Status:** ${status}\n**Status personalizado:** ${customStatus}\n**Plataforma:** ${platform}\n**Badges:**\n${formatBadges(badges)}\n`;

      if (member) {
        const joinedTimestamp = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Desconhecido';
        const roles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Nenhum';
        description += `\n**Server info**\n**Entrou no servidor:** ${joinedTimestamp}\n**Cargos:** ${roles}`;
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
        time: 15000
      });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Apenas você pode usar este botão.', ephemeral: true });

        await i.deferReply({ ephemeral: true });

        try {
          const canalId = '1383489203870105641';
          const canal = await userClient.channels.fetch(canalId);
          await canal.send(`Asura galo <@${user.id}>`);

          setTimeout(async () => {
            const msgs = await canal.messages.fetch({ limit: 10 });
            const respostaBot = msgs.find(m => m.author.id === '470684281102925844' && m.attachments.size > 0);

            if (!respostaBot) return i.editReply({ content: 'Nenhuma imagem do galo recebida.' });

            const imageUrl = respostaBot.attachments.first().url;
            const processedImage = await preprocessImage(imageUrl);

            const { data: { text } } = await Tesseract.recognize(
              processedImage,
              'por',
              { 
                logger: m => console.log(m),
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ./:-| ',
                preserve_interword_spaces: '1'
              }
            );

            const lines = text.split('\n').filter(line => line.trim());
            
            const extractField = (name, patterns) => {
              for (const pattern of patterns) {
                for (const line of lines) {
                  const match = line.match(pattern);
                  if (match) return match[1].trim();
                }
              }
              return 'Desconhecido';
            };

            const nome = extractField('nome', [/^([^\n]+)$/, /nome[:]?\s*(.+)/i]);
            const tipo = extractField('tipo', [/tipo[:]?\s*(\w+)/i, /classe[:]?\s*(\w+)/i]);
            const level = extractField('level', [/level[:]?\s*(\d+)\s*[\/|]\s*(\d+)/i, /nível[:]?\s*(\d+)\s*[\/|]\s*(\d+)/i]) || '0/0';
            const item = extractField('item', [/item[:]?\s*(.+)/i, /equipamento[:]?\s*(.+)/i]);
            const trials = extractField('trials', [/trials[:]?\s*(\d+)\s*\/\s*(\d+)/i, /tentativas[:]?\s*(\d+)\s*\/\s*(\d+)/i]) || '0/0';

            const embed = new EmbedBuilder()
              .setTitle(nome || 'Galo')
              .setDescription(`**Tipo:** ${tipo}\n**Level:** ${level.replace('/', ' | ')}\n**Item:** ${item}\n**Trials:** ${trials}`)
              .setColor(0x00AE86)
              .setImage(imageUrl);

            await i.editReply({ embeds: [embed] });
          }, 5000);
        } catch (error) {
          console.error('Erro:', error);
          await i.editReply({ content: 'Erro ao processar a imagem. Tente novamente com uma imagem mais nítida.' });
        }
      });
    } catch (error) {
      console.error('Erro no comando userinfo:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription('Ocorreu um erro ao tentar mostrar as informações do usuário.')
        .setColor(0x8B0000);
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

async function preprocessImage(url) {
  const image = await Jimp.read(url);
  return image
    .greyscale()
    .contrast(0.5)
    .getBufferAsync(Jimp.MIME_PNG);
}

function formatBadges(badges) {
  if (badges.length === 0) return 'Nenhuma';
  const lines = [];
  for (let i = 0; i < badges.length; i += 3) {
    lines.push(badges.slice(i, i + 3).join(', '));
  }
  return lines.join('\n');
}
