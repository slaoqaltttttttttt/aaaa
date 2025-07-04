const { Client, GatewayIntentBits, EmbedBuilder, ComponentType, Collection, ActivityType } = require('discord.js')
const { prefix } = require('./config')
const { Client: UserClient } = require('discord.js-selfbot-v13')
const { Client: PgClient } = require('pg')
const path = require('path')
const crypto = require('crypto')

/* CONFIGURAÇÃO DE STATUS E TOKENS */
let statusType = ActivityType.Playing
let statusText = "Asura Stock"
global.statusType = statusType
global.statusText = statusText
const token = process.env.BOT_TOKEN
const userToken = process.env.USER_TOKEN

/* CONEXÃO BANCO DE DADOS */
const pg = new PgClient({
  connectionString: 'postgresql://postgres:cBCiYNNlByhwLsEbvPAXTBiYfnkWmzkx@maglev.proxy.rlwy.net:32587/railway',
  ssl: { rejectUnauthorized: false }
})
pg.connect()

/* INSTÂNCIA DE CLIENTES */
const botClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})
const userClient = new UserClient()

/* CARREGAMENTO DE COMANDOS */
botClient.commands = new Collection()
const commandsPath = path.join(__dirname, 'Commands')
const commandFiles = require('fs').readdirSync(commandsPath).filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./Commands/${file}`)
  botClient.commands.set(command.name, command)
}

/* FUNÇÕES AUXILIARES */
function normalizeOptions(options) {
  return options
    .map(opt => `${opt.title.trim().toLowerCase()}|${opt.desc.trim().toLowerCase()}`)
    .sort()
    .join('\n')
}
function capitalize(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
}
function getStockHash(options) {
  const normalized = normalizeOptions(options)
  return crypto.createHash('md5').update(normalized).digest('hex')
}
function normalizeText(str) {
  return str
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : ''
}

/* FUNÇÕES BANCO DE DADOS */
async function getAllGuildSettings() {
  const res = await pg.query('SELECT * FROM guild_settings')
  const obj = {}
  for (const row of res.rows) {
    obj[row.guild_id] = { stockChannelId: row.stock_channel_id }
  }
  return obj
}
async function getAllSentStocks() {
  const res = await pg.query('SELECT * FROM sent_stocks')
  const obj = {}
  for (const row of res.rows) {
    if (!obj[row.guild_id]) obj[row.guild_id] = {}
    obj[row.guild_id][row.channel_id] = row.stock_hash
  }
  return obj
}
async function getAllPings() {
  const res = await pg.query('SELECT * FROM pings')
  const obj = {}
  for (const row of res.rows) {
    if (!obj[row.guild_id]) obj[row.guild_id] = {}
    obj[row.guild_id][row.ping_key] = row.role_id
  }
  return obj
}
async function saveSentStock(guildId, channelId, stockHash) {
  await pg.query(
    'DELETE FROM sent_stocks WHERE guild_id = $1 AND channel_id = $2',
    [guildId, channelId]
  )
  await pg.query(
    'INSERT INTO sent_stocks (guild_id, channel_id, stock_hash) VALUES ($1, $2, $3)',
    [guildId, channelId, stockHash]
  )
}

/* SHOP AUTOMÁTICO */
async function processShop() {
  try {
    const settings = await getAllGuildSettings()
    const sentStocks = await getAllSentStocks()
    const pingsDb = await getAllPings()

    const canalShop = await botClient.channels.fetch('1383489203870105641')
    if (!canalShop || !canalShop.isTextBased()) return
    await userClient.channels.cache.get('1383489203870105641').send('Asura shop')
    await new Promise(res => setTimeout(res, 8000))
    const mensagens = await canalShop.messages.fetch({ limit: 20 })
    const botMsg = mensagens.find(m => m.author.id === '470684281102925844' && (m.embeds.length > 0 || m.components.length > 0))
    if (!botMsg) return

    let options = []
    if (botMsg.components.length > 0) {
      for (const row of botMsg.components) {
        for (const component of row.components) {
          if (component.type === ComponentType.StringSelect) {
            options = component.options.map(opt => ({
              title: opt.label,
              desc: opt.description || 'Sem descrição'
            }))
            break
          }
        }
      }
    }
    if (options.length === 0) return

    const stockHash = getStockHash(options)

    const categorias = {}
    for (const opt of options) {
      const categoria = opt.desc.trim().toLowerCase()
      if (!categorias[categoria]) categorias[categoria] = []
      categorias[categoria].push(opt.title)
    }

    let descricao = ''
    for (const [categoria, itens] of Object.entries(categorias)) {
      descricao += `** ‐ ${capitalize(categoria)}**\n${itens.join('\n')}\n\n`
    }

    const shopEmbed = new EmbedBuilder()
      .setTitle('Asura Shop')
      .setDescription(descricao.trim())
      .setColor(0xFFD700)
      .setFooter({ text: 'Use "Asura shop" ou "j!shop" para comprar os itens em stock' })

    for (const guildId in settings) {
      const guildSettings = settings[guildId]
      const canalId = guildSettings.stockChannelId
      if (!sentStocks[guildId]) sentStocks[guildId] = {}
      const jaEnviado = sentStocks[guildId][canalId] === stockHash
      if (jaEnviado) continue
      try {
        let mentionRoles = []
        const pings = pingsDb[guildId] || {}

        const normalizedPings = {}
        for (const key in pings) {
          normalizedPings[normalizeText(key)] = pings[key]
        }

        const possiblePings = [
          'shard epico',
          'shard lendario',
          'shard mitico',
          'galo lendario',
          'galo divino',   // <-- Adicionado Galo Divino
          'item beta',
          'asuracoins',
          'xp'
        ]

        for (const opt of options) {
          const normTitle = normalizeText(opt.title)
          const normDesc = normalizeText(opt.desc)

          for (const pingKey of possiblePings) {
            const dbKey = Object.keys(normalizedPings).find(
              k => normalizeText(k) === pingKey
            )
            if (!dbKey) continue

            if (pingKey === 'galo lendario') {
              if (normTitle.includes('galo') && normDesc.includes('lendario')) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`)
              }
            } else if (pingKey === 'galo divino') {
              if (normTitle.includes('galo') && normDesc.includes('divino')) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`)
              }
            } else if (pingKey === 'asuracoins') {
              if (
                normTitle.includes('asura coin') ||
                normTitle.includes('asuracoin') ||
                normTitle.includes('asura coins') ||
                normTitle.includes('asuracoins')
              ) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`)
              }
            } else if (pingKey === 'item beta') {
              if (normTitle.includes('item beta')) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`)
              }
            } else {
              if (normTitle.includes(pingKey)) {
                mentionRoles.push(`<@&${normalizedPings[dbKey]}>`)
              }
            }
          }
        }

        mentionRoles = [...new Set(mentionRoles)]

        const canal = await botClient.channels.fetch(canalId)
        if (!canal) continue
        await canal.send({ content: mentionRoles.length > 0 ? mentionRoles.join(' ') : undefined, embeds: [shopEmbed] })
        await saveSentStock(guildId, canalId, stockHash)
      } catch (err) {
        if (botClient && canalId) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Erro')
            .setDescription('Ocorreu um erro ao tentar enviar a mensagem do shop neste canal.')
            .setColor(0x8B0000)
          try {
            const canal = await botClient.channels.fetch(canalId).catch(() => null)
            if (canal) await canal.send({ embeds: [errorEmbed] })
          } catch {}
        }
      }
    }
  } catch (error) {}
}

/* EVENTOS E INICIALIZAÇÃO */
botClient.on('messageCreate', async message => {
  if (message.author.bot) return

  const botId = botClient.user.id
  const isMentioned = message.mentions.has(botId)
  const isReplyToBot =
    message.reference &&
    (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === botId

  if (isMentioned || isReplyToBot) {
    return message.reply({
      content: "Meu prefixo é `s!`\nUse `s!help` para ver meus comandos!"
    })
  }

  const prefixes = Array.isArray(prefix) ? prefix : [prefix]
  if (!prefixes.includes('stock ')) prefixes.push('stock ')

  const usedPrefix = prefixes.find(p => message.content.toLowerCase().startsWith(p.toLowerCase()))
  if (!usedPrefix) return

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/)
  const commandName = args.shift()?.toLowerCase()
  const command = botClient.commands.get(commandName)
  if (!command) return
  try {
    await command.execute(botClient, message, args)
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao executar este comando.')
      .setColor(0x8B0000)
    await message.reply({ embeds: [errorEmbed] })
  }
})

botClient.once('ready', () => {
  botClient.user.setActivity(statusText, { type: statusType })
})

userClient.once('ready', async () => {
  processShop()
  setInterval(() => {
    processShop()
  }, 5 * 60 * 1000)
})

botClient.login(token).catch(console.error)
userClient.login(userToken).catch(console.error)
