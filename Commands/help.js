const { EmbedBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path')

module.exports = {
  name: 'help',
  aliases: ['ajuda', 'comandos', 'commands'],
  description: 'Mostra a lista de comandos e como usar o bot de stock',
  usage: 's!help',
  async execute(botClient, message, args) {
    try {
      const commandsPath = path.join(__dirname)
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

      const comandosProibidos = ['help', 'money', 'dev', 'status', 'dbview']

      let desc = ''

      for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file))
        const nome = command.name || path.parse(file).name

        if (comandosProibidos.includes(nome)) continue

        if (
          command.onlyIds &&
          Array.isArray(command.onlyIds) &&
          command.onlyIds.length > 0 &&
          !command.onlyIds.includes(message.author.id)
        ) {
          continue
        }

        const fileContent = fs.readFileSync(path.join(commandsPath, file), 'utf8')
        const idRestrictMatch = fileContent.match(/if\s*\(\s*message\.author\.id\s*!==\s*['"`](\d+)['"`]\s*\)/)
        if (idRestrictMatch && idRestrictMatch[1] && message.author.id !== idRestrictMatch[1]) {
          continue
        }

        const descricao = command.description || 'Sem descrição'
        const uso = command.usage ? `\nUso: \`${command.usage}\`` : ''

        desc += `**${nome}**\n${descricao}${uso}\n\n`
      }

      const helpEmbed = new EmbedBuilder()
        .setTitle('Stock help')
        .setColor(0x9B59B6)
        .setDescription(desc.trim() || 'Nenhum comando disponível para você.')

      await message.reply({ embeds: [helpEmbed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Erro')
        .setDescription(
          'Ocorreu um erro ao executar este comando.' +
          (error?.message ? `\nMotivo: ${error.message}` : '')
        )
        .setColor(0x8B0000)
      await message.reply({ embeds: [errorEmbed] })
    }
  }
}
