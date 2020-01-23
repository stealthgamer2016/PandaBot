const Discord = require('discord.js');
const client = new Discord.Client();
const { token } = require('./Settings.json');
const settings = require('./Settings.json');
const fs = require('fs');
const MembersBll = require('./Business/MembersBll');

client.login(token);

const cooldowns = new Discord.Collection();

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    MembersBll.Sync();
    console.log('Panda Online');
});

client.on('message', async message => {

    if (message.guild === null) {
        return;
    }

    if (message.author.bot) {
        return
    };

    var prefix = await MembersBll.GetGuildPrefix(message.guild.id);

    if (!message.content.startsWith(prefix)) {

        var LeveledUp = await MembersBll.AddXpToMember(message.guild.id, message.author.id);

        if (LeveledUp === true) {

            var XpNextLvl = await MembersBll.GetMemberXpForNextLevel(message.guild.id, message.author.id);
            var Level = await MembersBll.GetMemberLevel(message.guild.id, message.author.id);
            var Xp = await MembersBll.GetMemberXp(message.guild.id, message.author.id);

            var RichEmbedLevelUp = new Discord.RichEmbed()
                .setTitle(':tada: **' + message.member.displayName + ' just leveled up - Level ' + Level + '**')
                .setDescription('You need more ' + XpNextLvl + ' Xp points for the next level')
                .addField('Xp', Xp)
                .setColor(parseInt('0x' + settings.success))
                .setTimestamp();

            message.channel.send({ embed: RichEmbedLevelUp });
        }

        return;
    }

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    var currentdate = new Date();
    console.log('--------New Command---------');
    console.log(currentdate.toTimeString());
    console.log("Server:" + message.guild.name + ' - ' + message.guild.id);
    console.log("Channel:" + message.channel.name + ' - ' + message.channel.id);
    console.log("User:" + message.author.username + ' - ' + message.author.id);
    console.log("Command:" + commandName);
    console.log("Arguments:" + args);
    console.log('Nº of Args:' + args.length);

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    if (command.permission) {

        var RichEmbedError = new Discord.RichEmbed()
            .setTitle('❌ **You dont have the permission to do that**')
            .addField('You need the following permission', '```' + command.permission + '```')
            .setColor(parseInt('0x' + settings.error))
            .setTimestamp();

        if (!message.member.permissions.has(command.permission))
            return message.channel.send({ embed: RichEmbedError });

    }

    if (command.disabled) {
        var RichEmbedError = new Discord.RichEmbed()
            .setTitle(':skull_crossbones: **This command is disabled**')
            .setDescription('Try again later')
            .setColor(parseInt('0x' + settings.error))
            .setTimestamp();

        return message.channel.send({ embed: RichEmbedError });
    }

    if (command.args && !args.length) {
        var RichEmbedError = new Discord.RichEmbed()
            .setTitle('❗️ **' + command.args + '**')
            .setColor(parseInt('0x' + settings.warning))
            .setTimestamp();

        if (command.usage) {
            RichEmbedError.addField('Usage', '```' + command.name + ' ' + command.usage + '```', true);
        }

        return message.channel.send({ embed: RichEmbedError });
    }

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;

            var RichEmbedError = new Discord.RichEmbed()
                .setTitle('⏳  **This command is on cooldown**')
                .setDescription('Wait more ' + timeLeft.toFixed(1) + ' seconds before using this command')
                .setColor(parseInt('0x' + settings.warning))
                .setTimestamp();

            return message.channel.send({ embed: RichEmbedError });

        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
        await command.execute(message, args);
    } catch (error) {

        var RichEmbedError = new Discord.RichEmbed()
            .setTitle('❌ **An unexpected error has occurred**')
            .addField('Message', '```' + error + '```')
            .setColor(parseInt('0x' + settings.error))
            .setTimestamp();

        message.channel.send({ embed: RichEmbedError });
    }

});