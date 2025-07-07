const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fetch = require('node-fetch');

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
        if (i.user.id !== message.author.id) return i.reply({ content: 'Apenas você pode usar este botão.', ephemeral: true });

        await i.deferReply({ ephemeral: true });

        const canalId = '1383489203870105641';
        const conteudo = `Asura galo <@${user.id}>`;

        const canal = await userClient.channels.fetch(canalId).catch(() => null);
        if (!canal || typeof canal.send !== 'function') return i.editReply({ content: 'Erro ao acessar canal do galo.' });

        const enviado = await canal.send(conteudo);

        setTimeout(async () => {
          try {
            const msgs = await canal.messages.fetch({ limit: 10 });
            const respostaBot = msgs.find(m => m.author.id === '470684281102925844' && m.attachments.size > 0);

            if (!respostaBot) return i.editReply({ content: 'Nenhuma imagem do galo recebida.' });

            const imageUrl = respostaBot.attachments.first().url;

            // Pré-processamento da imagem
            const ocrResponse = await fetch('https://api.ocr.space/parse/imageurl', {
              method: 'POST',
              headers: {
                apikey: process.env.OCR_SPACE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                url: imageUrl,
                language: 'por',
                isOverlayRequired: false,
                iscreatesearchablepdf: false,
                issearchablepdfhidetextlayer: false,
                scale: true,
                isTable: true,
                OCREngine: 2 // Engine mais avançada
              })
            });

            const ocrData = await ocrResponse.json();
            const text = ocrData.ParsedResults?.[0]?.ParsedText || '';

            // Processamento avançado do texto
            const lines = text.split('\n')
              .map(line => line.replace(/[^a-zA-Z0-9\u00C0-\u017F\s\/\-:]/g, '').trim())
              .filter(line => line.length > 0);

            // Função para extrair valores com múltiplos padrões
            const extractWithPatterns = (patterns, defaultValue = 'Desconhecido') => {
              for (const pattern of patterns) {
                for (const line of lines) {
                  const match = line.match(pattern);
                  if (match && match[1]) {
                    return match[1].trim();
                  }
                }
              }
              return defaultValue;
            };

            // Extração robusta dos dados
            const nome = extractWithPatterns([
              /^(?!.*(tipo|level|item|trials|habilidades|equipadas))(.+)/i,
              /nome[:]?\s*(.+)/i,
              /galo[:]?\s*(.+)/i
            ], 'Galo Desconhecido');

            const tipo = extractWithPatterns([
              /tipo[:]?\s*(\w+)/i,
              /classe[:]?\s*(\w+)/i,
              /raça[:]?\s*(\w+)/i
            ], 'Desconhecido');

            const levelData = extractWithPatterns([
              /level[:]?\s*(\d+)\s*[\/|]\s*(\d+)/i,
              /nível[:]?\s*(\d+)\s*[\/|]\s*(\d+)/i,
              /lvl[:]?\s*(\d+)\s*[\/|]\s*(\d+)/i
            ], '0/0').split('/');

            const item = extractWithPatterns([
              /item[:]?\s*(.+)/i,
              /equipamento[:]?\s*(.+)/i,
              /arma[:]?\s*(.+)/i,
              /escudo[:]?\s*(.+)/i
            ], 'Nenhum');

            const trialsData = extractWithPatterns([
              /trials[:]?\s*(\d+)\s*\/\s*(\d+)/i,
              /tentativas[:]?\s*(\d+)\s*\/\s*(\d+)/i,
              /provas[:]?\s*(\d+)\s*\/\s*(\d+)/i
            ], '0/0').split('/');

            // Processamento de habilidades
            let habilidades = [];
            let inHabilidades = false;

            for (const line of lines) {
              if (/habilidades\s*equipadas/i.test(line)) {
                inHabilidades = true;
                continue;
              }

              if (inHabilidades) {
                const habilidadeMatch = line.match(/(?:-\s*)?([^:]+?)\s*[:]?\s*(\d+\s*-\s*\d+)/);
                if (habilidadeMatch) {
                  habilidades.push({
                    nome: habilidadeMatch[1].trim(),
                    dano: habilidadeMatch[2].trim()
                  });
                } else if (line.match(/^[a-zA-Z\u00C0-\u017F]/)) {
                  habilidades.push({
                    nome: line.trim(),
                    dano: '? - ?'
                  });
                }
              }
            }

            // Construção da embed com verificações
            const levelStr = levelData.length === 2 ? `${levelData[0]} (${levelData[1]} resets)` : '0 (0 resets)';
            const trialsStr = trialsData.length === 2 ? `${trialsData[0]}/${trialsData[1]}` : '0/0';

            let descricao = `**Tipo:** ${tipo}\n` +
                            `**Level:** ${levelStr}\n` +
                            `**Item:** ${item}\n` +
                            `**Trials:** ${trialsStr}`;

            if (habilidades.length > 0) {
              descricao += '\n\n**HABILIDADES EQUIPADAS**\n';
              habilidades.forEach(habilidade => {
                descricao += `- ${habilidade.nome}: ${habilidade.dano}\n`;
              });
            } else {
              descricao += '\n\n*Nenhuma habilidade detectada*';
            }

            // Verificação final de qualidade
            if (nome === 'Galo Desconhecido' && tipo === 'Desconhecido' && levelStr === '0 (0 resets)') {
              descricao = '**Não foi possível ler as informações do galo na imagem.**\n' +
                          'Por favor, verifique se:\n' +
                          '1. A imagem está nítida e legível\n' +
                          '2. O galo está visível na imagem\n' +
                          '3. O comando foi usado corretamente\n\n' +
                          `[Clique aqui para ver a imagem](${imageUrl})`;
            }

            const galoEmbed = new EmbedBuilder()
              .setTitle(nome)
              .setDescription(descricao)
              .setColor(0x00AE86)
              .setThumbnail(imageUrl)
              .setFooter({ text: 'Se as informações estiverem incorretas, tente novamente com uma imagem mais nítida' });

            await i.editReply({ embeds: [galoEmbed] });
          } catch (error) {
            console.error('Erro ao processar imagem do galo:', error);
            await i.editReply({ content: 'Ocorreu um erro ao processar a imagem do galo. Por favor, tente novamente.' });
          }
        }, 5000);
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

function formatBadges(badges) {
  if (badges.length === 0) return 'Nenhuma';
  const lines = [];
  for (let i = 0; i < badges.length; i += 3) {
    lines.push(badges.slice(i, i + 3).join(', '));
  }
  return lines.join('\n');
}
