const { Client, GatewayIntentBits, EmbedBuilder, ComponentType, Collection, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { prefix, postgresConnectionString } = require('./config')
const { Client: UserClient } = require('discord.js-selfbot-v13')
const { Client: PgClient } = require('pg')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

let statusType = ActivityType.Playing
let statusText = "Asura Stock"
global.statusType = statusType
global.statusText = statusText
const token = process.env.BOT_TOKEN
const userToken = process.env.USER_TOKEN

const pg = new PgClient({
  connectionString: postgresConnectionString,
  ssl: { rejectUnauthorized: false }
})
pg.connect()

const botClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
})
const userClient = new UserClient()

botClient.commands = new Collection()
const commandsPath = path.join(__dirname, 'Commands')
const commandFiles = require('fs').readdirSync(commandsPath).filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./Commands/${file}`)
  botClient.commands.set(command.name, command)
}

const COMMANDS_LOG_PATH = path.join(__dirname, 'commands_log.json')
if (!fs.existsSync(COMMANDS_LOG_PATH)) {
  fs.writeFileSync(COMMANDS_LOG_PATH, '{}')
}
function logUserCommand(userId, commandName, args, guildId, channelId, timestamp) {
  let logs = {}
  try {
    logs = JSON.parse(fs.readFileSync(COMMANDS_LOG_PATH, 'utf8'))
  } catch {}
  if (!logs[userId]) logs[userId] = []
  logs[userId].push({
    command: commandName,
    args,
    guildId,
    channelId,
    timestamp
  })
  fs.writeFileSync(COMMANDS_LOG_PATH, JSON.stringify(logs, null, 2))
}

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

const rarityOrder = [
  'comum',
  'raro',
  'epico',
  'lendario',
  'mitico',
  'divino'
]
const rarityColors = {
  comum:    0x888888,
  raro:     0x3498db,
  epico:    0x9b59b6,
  lendario: 0xff7700,
  mitico:   0xffffff,
  divino:   0xff00ff
}

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

    let foundRarityIdx = -1
    for (const opt of options) {
      const descNorm = normalizeText(opt.desc)
      for (let i = rarityOrder.length - 1; i >= 0; i--) {
        if (descNorm.includes(rarityOrder[i])) {
          foundRarityIdx = Math.max(foundRarityIdx, i)
          break
        }
      }
    }
    
    let embedColor = 0xFFD700
    if (foundRarityIdx >= 0) {
      const highestRarity = rarityOrder[foundRarityIdx]
      embedColor = highestRarity === 'mitico' ? 0xffffff : rarityColors[highestRarity]
    }

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
      .setColor(embedColor)
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
          'galo divino',
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

botClient.on('messageCreate', async message => {
  if (!message.author.bot) {
    const prefixes = Array.isArray(prefix) ? prefix : [prefix]
    if (!prefixes.includes('stock ')) prefixes.push('stock ')
    const usedPrefix = prefixes.find(p => message.content.toLowerCase().startsWith(p.toLowerCase()))
    if (usedPrefix) {
      const args = message.content.slice(usedPrefix.length).trim().split(/ +/)
      const commandName = args.shift()?.toLowerCase()
      const command = botClient.commands.get(commandName)
      if (command) {
        try {
          await command.execute(botClient, message, args, userClient)
          logUserCommand(
            message.author.id,
            commandName,
            args,
            message.guild?.id || null,
            message.channel.id,
            Date.now()
          )
        } catch (error) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Erro')
            .setDescription('Ocorreu um erro ao executar este comando.')
            .setColor(0x8B0000)
          await message.reply({ embeds: [errorEmbed] })
        }
        return
      }
    }
  }

  if (!message.author.bot) {
    const botId = botClient.user.id
    const isMentioned = message.mentions.has(botId)
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === botId

    if (isMentioned || isReplyToBot) {
      return message.reply({
        content: "Meu prefixo é s!\nUse s!help para ver meus comandos!"
      })
    }
  }

  if (message.author.id === '946569782508019764' && message.content.toLowerCase().startsWith('logs')) {
    let parts = message.content.trim().split(/\s+/)
    let targetId = null

    if (parts.length > 1) {
      let mention = parts[1]
      if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.replace(/^<@!?/, '').replace(/>$/, '')
        targetId = mention
      } else if (/^\d{17,19}$/.test(mention)) {
        targetId = mention
      }
    }

    if (!targetId) {
      try {
        const dm = await message.author.createDM()
        await dm.send('Por favor, mencione um usuário ou forneça um ID válido após o comando logs.')
      } catch {}
      return
    }

    try {
      let logs = {}
      try {
        logs = JSON.parse(fs.readFileSync(COMMANDS_LOG_PATH, 'utf8'))
      } catch {}

      const userLogs = logs[targetId] || []
      if (!userLogs.length) {
        try {
          const dm = await message.author.createDM()
          await dm.send({ content: `Nenhum comando registrado para <@${targetId}> (${targetId}).` })
        } catch {}
        return
      }

      const logsPerPage = 10
      const maxPage = Math.ceil(userLogs.length / logsPerPage)
      let page = 0

      const getEmbed = (pageIdx) => {
        const embed = new EmbedBuilder()
          .setTitle(`Log de comandos de <@${targetId}>`)
          .setColor(0x3498db)
          .setFooter({ text: `Página ${pageIdx + 1} / ${maxPage}` })

        const logsPage = userLogs.slice(pageIdx * logsPerPage, (pageIdx + 1) * logsPerPage)
        for (const log of logsPage) {
          embed.addFields({
            name: `Comando: \`${log.command}\`  |  <t:${Math.floor(log.timestamp / 1000)}:R>`,
            value: log.args.length > 0 ? `Args: \`${log.args.join(' ')}\`` : '*Sem argumentos*',
            inline: false
          })
        }
        return embed
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Próxima')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === maxPage - 1)
      )

      try {
        const dm = await message.author.createDM()
        const sent = await dm.send({
          embeds: [getEmbed(page)],
          components: maxPage > 1 ? [row] : []
        })

        if (maxPage > 1) {
          const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60 * 1000
          })

          collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return await i.reply({ content: 'Apenas você pode usar esses botões.', ephemeral: true })
            if (i.customId === 'prev' && page > 0) page--
            if (i.customId === 'next' && page < maxPage - 1) page++
            const newRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Próxima')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === maxPage - 1)
            )
            await i.update({ embeds: [getEmbed(page)], components: [newRow] })
          })
        }
      } catch {}
    } catch {}
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
