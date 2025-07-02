const { ActivityType } = require("discord.js");

module.exports = {
  name: "status",
  description: "Altera o status do bot (playing, listening, watching, competing)",
  async execute(botClient, message, args) {
    // Só permite o comando para o user de id 946569782508019764
    if (message.author.id !== "946569782508019764") {
      return message.reply("❌ Você não tem permissão para usar este comando.");
    }

    if (!args[0] || !args[1]) {
      return message.reply(
        "Uso: `s!status <tipo> <mensagem>`\nTipos: playing, listening, watching, competing"
      );
    }

    const typeArg = args[0].toLowerCase();
    const textArg = args.slice(1).join(" ");

    let parsedType;
    switch (typeArg) {
      case "playing":
        parsedType = ActivityType.Playing;
        break;
      case "listening":
        parsedType = ActivityType.Listening;
        break;
      case "watching":
        parsedType = ActivityType.Watching;
        break;
      case "competing":
        parsedType = ActivityType.Competing;
        break;
      default:
        return message.reply(
          "Tipo inválido. Tipos válidos: playing, listening, watching, competing"
        );
    }

    // Atualiza o status global (opcional, útil se quiser acessar depois)
    if (typeof global !== "undefined") {
      global.statusType = parsedType;
      global.statusText = textArg;
    }

    botClient.user.setActivity(textArg, { type: parsedType });
    message.reply(`✅ Status atualizado para **${typeArg}**: ${textArg}`);
  }
}
