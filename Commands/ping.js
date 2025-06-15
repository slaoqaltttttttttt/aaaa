module.exports = {
  name: 'ping',
  async execute(client, message, args) {
    await message.channel.send('Pong!');
  }
};