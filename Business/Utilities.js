module.exports = {
    getRndInteger(min,max) {
        return (Math.floor(Math.random() * (max - min)) + parseInt(min));
    },
    GetUserIdFromMention(mention) {
        if (!mention) return;
        const Discord = require('discord.js');


        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);

            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }


        }
        return mention;
    },
};