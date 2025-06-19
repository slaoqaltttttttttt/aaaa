const { EmbedBuilder, ComponentType } = require('discord.js');

// Função de utilidade para capitalizar texto
function capitalize(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
}

// Remove acentos e deixa minúsculo
function normalizeText(str) {
  return str
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : '';
}

module.exports = {
  name: 'stock',
  description: 'Mostra o shop/stock atual do Asura Shop',
  async execute(botClient, message, args) {
    try {
      // Pega o canal do shop
      const canalShop = await botClient.channels.fetch('1383489203870105641');
      if (!canalShop || !canalShop.isTextBased()) {
        return message.reply('❌ Canal do shop não encontrado ou não é de texto.');
      }
      
      // Pede para o userbot atualizar o shop
      if (botClient.userClient) {
        // Se por acaso você expor userClient no botClient, use isso
        await botClient.userClient.channels.cache.get('1383489203870105641').send('Asura shop');
      }
      // Espera alguns segundos para garantir que a mensagem atualizou
      await new Promise(res => setTimeout(res, 8000));
      // Busca as mensagens recentes
      const mensagens = await canalShop.messages.fetch({ limit: 20 });
      const botMsg = mensagens.find(m => m.author.id === '470684281102925844' && (m.embeds.length > 0 || m.components.length > 0));
      if (!botMsg) {
        return message.reply('Mensagem de asura shop não encontrada.');
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
        return message.reply('Nenhuma opção encontrada no stock.');
      }

      // Agrupando por categoria (descrição)
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

      await message.reply({ embeds: [shopEmbed] });

    } catch (error) {
      console.error(error);
      await message.reply('Ocorreu um erro ao buscar o stock.');
    }
  }
};
