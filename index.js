const { Client, GatewayIntentBits, EmbedBuilder, ComponentType, Collection } = require('discord.js');
const { prefix } = require('./config');
const { Client: UserClient } = require('discord.js-selfbot-v13');
const { Client: PgClient } = require('pg');
const path = require('path');
const crypto = require('crypto');

// Pegando tokens das variáveis de ambiente
const token = process.env.BOT_TOKEN;
const userToken = process.env.USER_TOKEN;

// Conexão com PostgreSQL Railway
const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
});
pg.connect();

const botClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const userClient = new UserClient();

botClient.commands = new Collection();
const commandsPath = path.join(__dirname, 'Commands');
const commandFiles = require('fs').readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./Commands/${file}`);
  botClient.commands.set(command.name, command);
}

function normalizeOptions(options) {
  return options
    .map(opt => `${opt.title.trim().toLowerCase()}|${opt.desc.trim().toLowerCase()}`)
    .sort()
    .join('\n');
}

function capitalize(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
}

function getStockHash(options) {
  const normalized = normalizeOptions(options);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// Remove acentos e deixa minúsculo
function normalizeText(str) {
  return str
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : '';
}

// Funções de banco de dados
async function getAllGuildSettings() {
  const res = await pg.query('SELECT * FROM guild_settings');
  const obj = {};
  for (const row of res.rows) {
    obj[row.guild_id] = { stockChannelId: row.stock_channel_id };
  }
  return obj;
}

async function getAllSentStocks() {
  const res = await pg.query('SELECT * FROM sent_stocks');
  const obj = {};
  for (const row of res.rows) {
    if (!obj[row.guild_id]) obj[row.guild_id] = {};
    obj[row.guild_id][row.channel_id] = row.stock_hash;
  }
  return obj;
}

async function getAllPings() {
  const res = await pg.query('SELECT * FROM pings');
  const obj = {};
  for (const row of res.rows) {
    if (!obj[row.guild_id]) obj[row.guild_id] = {};
    obj[row.guild_id][row.ping_key] = row.role_id;
  }
  return obj;
}

// Agora sem ON CONFLICT, apenas delete e insert
async function saveSentStock(guildId, channelId, stockHash) {
  await pg.query(
    'DELETE FROM sent_stocks WHERE guild_id = $1 AND channel_id = $2',
    [guildId, channelId]
  );
  await pg.query(
    'INSERT INTO sent_stocks (guild_id, channel_id, stock_hash) VALUES ($1, $2, $3)',
    [guildId, channelId, stockHash]
  );
}

async function processShop() {
  try {
    const settings = await getAllGuildSettings();
    const sentStocks = await getAllSentStocks();
    const pingsDb = await getAllPings();

    // Pega o embed do shop apenas uma vez
    const canalShop = await botClient.channels.fetch('1383489203870105641');
    if (!canalShop || !canalShop.isTextBased()) {
      console.log('[Shop] Canal do shop não encontrado ou não é de texto.');
      return;
    }
    await userClient.channels.cache.get('1383489203870105641').send('Asura shop');
    await new Promise(res => setTimeout(res, 8000));
    const mensagens = await canalShop.messages.fetch({ limit: 20 });
    const botMsg = mensagens.find(m => m.author.id === '470684281102925844' && (m.embeds.length > 0 || m.components.length > 0));
    if (!botMsg) {
      console.log('[Shop] Nenhuma mensagem de shop encontrada.');
      return;
    }

    let options = [];
    if (botMsg.components.length > 0) {
      for (const row of botMsg.components) {
        for (const component of row.components) {
          if (component.type === ComponentType.StringSelect) {
            options = component.options.map(opt => ({
              title: opt.label,
              desc: opt.description || 'Sem descrição'
            }));
            break;
          }
        }
      }
    }
    if (options.length === 0) {
      console.log('[Shop] Nenhuma opção encontrada no shop.');
      return;
    }

    const stockHash = getStockHash(options);

    const categorias = {};
    for (const opt of options) {
      const categoria = opt.desc.trim().toLowerCase();
      if (!categorias[categoria]) categorias[categoria] = [];
      categorias[categoria].push(opt.title);
    }

    let descricao = '';
    for (const [categoria, itens] of Object.entries(categorias)) {
      descricao += `** ‐ ${capitalize(categoria)}**\n${itens.join('\n')}\n\n`;
    }

    const shopEmbed = new EmbedBuilder()
      .setTitle('Asura Shop')
      .setDescription(descricao.trim())
      .setColor(0xFFD700)
      .setFooter({ text: 'Use "Asura shop" ou "j!shop" para comprar os itens em stock' });

    let enviadoParaAlgum = false;

    for (const guildId in settings) {
      const guildSettings = settings[guildId];
      const canalId = guildSettings.stockChannelId;
      if (!sentStocks[guildId]) sentStocks[guildId] = {};
      const jaEnviado = sentStocks[guildId][canalId] === stockHash;

      console.log(`[Shop] Verificando canal ${canalId} do servidor ${guildId}. Já enviado? ${jaEnviado}`);

      if (jaEnviado) {
        console.log(`[Shop] Stock já enviado para canal ${canalId} do servidor ${guildId}`);
        continue;
      }
      try {
        // --- MENCIONAR CARGOS CONFORME OS ITENS DO STOCK ---
        let mentionRoles = [];
        const pings = pingsDb[guildId] || {};

        // Normaliza as chaves do pings.json para garantir comparação sem acento
        const normalizedPings = {};
        for (const key in pings) {
          normalizedPings[normalizeText(key)] = pings[key];
        }

        // Lista as keys de pings possíveis conforme imagem (normalizadas)
        const possiblePings = [
          'shard epico',
          'shard lendario',
          'shard mitico',
          'galo lendario',
          'item beta',
          'asuracoins',
          'xp'
        ];

        for (const opt of options) {
          const normTitle = normalizeText(opt.title);
          const normDesc = normalizeText(opt.desc);

          for (const pingKey of possiblePings) {
            const dbKey = Object.keys(normalizedPings).find(
              k => normalizeText(k) === pingKey
            );
            if (!dbKey) continue;

            if (pingKey === 'galo lendario') {
              if (normTitle.includes('galo') && normDesc.includes('lendario')) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`);
              }
            } else if (pingKey === 'asuracoins') {
              if (
                normTitle.includes('asura coin') ||
                normTitle.includes('asuracoin') ||
                normTitle.includes('asura coins') ||
                normTitle.includes('asuracoins')
              ) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`);
              }
            } else if (pingKey === 'item beta') {
              if (normTitle.includes('item beta')) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`);
              }
            } else {
              if (normTitle.includes(pingKey)) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`);
              }
            }
          }
        }

        mentionRoles = [...new Set(mentionRoles)];

        const canal = await botClient.channels.fetch(canalId);
        if (!canal) {
          console.log(`[Shop] Canal ${canalId} não encontrado.`);
          continue;
        }
        await canal.send({ content: mentionRoles.length > 0 ? mentionRoles.join(' ') : undefined, embeds: [shopEmbed] });
        await saveSentStock(guildId, canalId, stockHash);
        enviadoParaAlgum = true;
        console.log(`[Shop] Embed enviado para canal ${canalId} do servidor ${guildId}`);
      } catch (err) {
        console.error(`[Shop] Erro ao enviar para canal ${canalId}:`, err);
      }
    }
  } catch (error) {
    console.error(`[Shop] Erro ao processar shops:`, error);
  }
}

// SUPORTE A MÚLTIPLOS PREFIXOS, INCLUINDO "stock " (com espaço)
botClient.on('messageCreate', async message => {
  if (message.author.bot) return;
  const prefixes = Array.isArray(prefix) ? prefix : [prefix];
  if (!prefixes.includes('stock ')) prefixes.push('stock ');

  const usedPrefix = prefixes.find(p => message.content.toLowerCase().startsWith(p.toLowerCase()));
  if (!usedPrefix) return;

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  const command = botClient.commands.get(commandName);
  if (!command) return;
  try {
    await command.execute(botClient, message, args);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

botClient.once('ready', () => {
  console.log(`✅ Bot oficial conectado como ${botClient.user.tag}`);
});

userClient.once('ready', async () => {
  console.log(`✅ Conta de usuário conectada como ${userClient.user.tag}`);
  processShop();
  setInterval(() => {
    processShop();
  }, 5 * 60 * 1000);
});

botClient.login(token).catch(console.error);
userClient.login(userToken).catch(console.error);
