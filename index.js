require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`${client.user.username} is online!`);
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

const userConversations = {};

function limitInput(input, maxLength) {
  return input.slice(0, maxLength);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  const userId = message.author.id;
  if (!userConversations[userId]) {
    userConversations[userId] = [
      {
        role: 'system',
        content: `You are a helpful asistant`,
      },
    ];
  }

  let conversationLog = userConversations[userId];

  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
      if (message.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      let userName = msg.author.username;
      conversationLog.push({
        role: 'user',
        content: `You are speaking to ${userName}, this is your conversation history: ` + msg.content ,
      });
    });

    
    const limitedConversationLog = limitInput(conversationLog, 2000);

    const result = await openai
      .createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: limitedConversationLog, 
        max_tokens: 140, // limit token usage
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
        message.reply(`Sorry I'm having trouble thinking, try again later?`);
      });

    message.reply(result.data.choices[0].message);
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});

client.login(process.env.TOKEN);