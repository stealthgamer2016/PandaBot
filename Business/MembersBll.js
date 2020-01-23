const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

const TbGuilds = sequelize.define('guild', {
    id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        primaryKey: true
    },
    Prefix: {
        type: Sequelize.STRING,
        defaultValue: '+',
        allowNull: false
    },

});

const TbMembers = sequelize.define('member', {
    id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    guild: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    xp: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    },
    level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    },
    money: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    },
    proposing: {
        type: Sequelize.STRING,
        default: ''
    },
});

const TbNotes = sequelize.define('note', {
    id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    guild: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    createBy: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    text: {
        type: Sequelize.STRING,
        allowNull: false,
        default: 0
    },
});

const TbMarriages = sequelize.define('marriage', {
    id1: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    id2: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    guild: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    cheats1: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    },
    cheats2: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    }
});

module.exports = {

    //Marriages

    //nos metodos onde precisso de um objeto mariage usar o metodo GetMemberMarriage() inves de fazer uma nova query

    async ProposeToMember(guildId, userId, proposingTo) {
        var Member = await this.GetMemberFromId(guildId, userId);
        await TbMembers.update({ proposing: proposingTo }, { where: { id: userId, guild: guildId } });
    },

    async DenyMemberProposal(guildId, userId, unproposingTo) {
        var Member = await this.GetMemberFromId(guildId, userId);
        if (Member.proposing != unproposingTo)
            throw new Error('That member isnt proposing');

        await TbMembers.update({ proposing: '' }, { where: { id: userId, guild: guildId } });
    },

    async MarryMembers(guildId, userId1, userId2) {
        var Member1 = await this.GetMemberFromId(guildId, userId1);
        var Member2 = await this.GetMemberFromId(guildId, userId2);
        if (Member1.proposing != Member2.id && Member2.proposing != Member1.id)
            throw new Error('Those members arent proposed yet');

        TbMembers.update({ proposing: '' }, { where: { id: userId1, guild: guildId } });
        TbMembers.update({ proposing: '' }, { where: { id: userId2, guild: guildId } });

        TbMarriages.create({
            id1: userId1,
            id2: userId2,
            guild: guildId,
            cheats1: 0,
            cheats2: 0
        });
    },

    async DivorceMembers(guildId, userId1, userId2) {

        //var Marriage = await TbMarriages.findOne({ where: { id1: userId1, id2: userId2, guild: guildId } });
        //if (Marriage)
        //    TbMembers.destroy({ where: { id1: userId1, id2: userId2, guild: guildId } });

        //Marriage = await TbMarriages.findOne({ where: { id1: userId2, id2: userId1, guild: guildId } });
        //if (Marriage)
        //    TbMembers.destroy({ where: { id1: userId2, id2: userId1, guild: guildId } });

        TbMarriages.destroy({ where: Sequelize.and({ guild: guildId }, Sequelize.or({ id1: userId1, id2: userId2 }, { id1: userId2, id2: userId1 })) });
    },

    async GetMemberSpounceId(guildId, userId) {
        //var Marriage = await TbMarriages.findOne({ where: { id1: userId, guild: guildId } });
        //if (!Marriage)
        //    Marriage = await TbMarriages.findOne({ where: { id2: userId, guild: guildId } });
        //if (!Marriage)
        //    throw new Error('You ');

        var Marriage = await TbMarriages.findOne({ where: Sequelize.and({ guild: guildId }, Sequelize.or({ id1: userId }, { id2: userId })) });
        if (!Marriage)
            throw new Error('Member is not married');

        var SpounceId = Marriage.id1;
        if (SpounceId === userId)
            SpounceId = Marriage.id2;

        return SpounceId;

    },

    async GetMemberCheats(guildId, userId) {
        var Marriage = await TbMarriages.findOne({ where: Sequelize.and({ guild: guildId }, Sequelize.or({ id1: userId }, { id2: userId })) });
        if (!Marriage)
            throw new Error('Member is not married');

        if (Marriage.id1 === userId)
            return Marriage.cheats1;
        if (Marriage.id2 === userId)
            return Marriage.cheats2;
    },

    async IsMemberMarried(guildId, userId) {
        var Marriage = await TbMarriages.findOne({ where: Sequelize.and({ guild: guildId }, Sequelize.or({ id1: userId }, { id2: userId })) });
        if (Marriage)
            return true;
        else
            return false;
    },

    async GetMemberProposal(guildId, userId) {
        var Member = await this.GetMemberFromId(guildId, userId);
        return await Member.get("proposing");
    },

    async GetMemberMarriage(guildId, userId) {
        var Marriage = await TbMarriages.findOne({ where: Sequelize.and({ guild: guildId }, Sequelize.or({ id1: userId }, { id2: userId })) });
        if (!Marriage)
            throw new Error('Member is not married');

        return Marriage;
    },

    //Xp

    async AddXpToMember(guildId, userId) {

        const Util = require('./Utilities');

        var Xp = await Util.getRndInteger(5, 15);

        var Member = await this.GetMemberFromId(guildId, userId);

        var Xp = parseInt(Member.get("xp")) + parseInt(Xp);
        var Level = parseInt(Member.get("level"));
        var LeveledUp = false;

        if (Xp >= Level * 50) {
            Xp -= Level * 50;
            Level++;
            LeveledUp = true;
        }

        await TbMembers.update({ xp: Xp, level: Level }, { where: { id: userId, guild: guildId } });

        return LeveledUp;
    },

    async GetMemberLevel(guildId, userId) {
        var Member = await this.GetMemberFromId(guildId, userId);
        return await Member.get("level");
    },

    async GetMemberXp(guildId, userId) {
        var Member = await this.GetMemberFromId(guildId, userId);
        return await Member.get("xp");
    },

    async GetMemberXpForNextLevel(guildId, userId) {
        var Member = await this.GetMemberFromId(guildId, userId);
        var Xp = parseInt(await Member.get("xp"));
        Xp = parseInt(await Member.get("level")) * 50 - Xp
        return Xp;
    },

    //Money

    async TransferMoney(guildId, fromId, toId, amount) {

        if (!amount || isNaN(amount))
            throw new Error('Amount must be a number');

        var MemberFrom = await TbMembers.findOne({ where: { id: fromId, guild: guildId } });
        if (!MemberFrom) {
            await this.InsertMember(guildId, fromId);
            MemberFrom = await TbMembers.findOne({ where: { id: fromId, guild: guildId } });
        }

        var MemberTo = await TbMembers.findOne({ where: { id: toId, guild: guildId } });
        if (!MemberTo) {
            await this.InsertMember(guildId, toId);
            MemberTo = await TbMembers.findOne({ where: { id: toId, guild: guildId } });
        }

        var FromMoney = parseInt(await MemberFrom.get("money"));
        var ToMoney = parseInt(await MemberTo.get("money"));

        if (FromMoney < amount)
            throw new Error('Member doesnt have enough money');

        FromMoney -= parseInt(amount);
        ToMoney += parseInt(amount);

        await TbMembers.update({ money: FromMoney }, { where: { id: fromId, guild: guildId } });
        await TbMembers.update({ money: ToMoney }, { where: { id: toId, guild: guildId } });
    },

    async GetMemberMoney(guildId, userId) {
        var Member = await this.GetMemberFromId(guildId, userId);
        return await Member.get("money");
    },

    async AddMoneyToMember(guildId, userId, amount) {

        if (!amount || isNaN(amount) || amount <= 0)
            throw new Error('Amount must be a number higher than 0');

        var Member = await this.GetMemberFromId(guildId, userId);

        var Money = parseInt(await Member.get("money"));

        Money += parseInt(amount);

        await TbMembers.update({ money: Money }, { where: { id: userId, guild: guildId } });
    },

    async RemoveMoneyToMember(guildId, userId, amount) {

        if (!amount || isNaN(amount) || amount <= 0)
            throw new Error('Amount must be a number higher than 0');

        var Member = await this.GetMemberFromId(guildId, userId);

        var Money = parseInt(await Member.get("money"));

        if (Money < amount)
            throw new Error('Member doesnt have that amount of money');

        Money -= parseInt(amount);

        await TbMembers.update({ money: Money }, { where: { id: userId, guild: guildId } });
    },

    //TbNotes

    async AddNoteToMember(guildId, userId, authorId, Text) {
        const note = await this.GetNoteFromMemberId(guildId, userId, authorId);//Creates note if it doesnt exist
        await TbNotes.update({ text: Text }, { where: { id: userId, guild: guildId, createBy: authorId } });
    },

    async SetNoteToMember(guildId, userId, authorId, Text) {
        var Note = await this.GetNoteFromMemberIdIfExist(guildId, userId, authorId);
        if (!Note) {
            await this.InsertNote(guildId, userId, authorId, Text);
        }
        await TbNotes.update({ text: Text }, { where: { id: userId, guild: guildId, createBy: authorId } });
    },

    async GetRandomNoteTextFromMember(guildId, userId) {
        const NotesId = await TbNotes.findAll({ attributes: ['createBy'], where: { id: userId, guild: guildId } });
        const Util = require('./Utilities');
        var RandomIndex = await Util.getRndInteger(0, NotesId.length - 1);
        return await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: NotesId[RandomIndex].get("createBy") } }).get("text");
    },

    async GetRandomNoteFromMember(guildId, userId) {
        const NotesId = await TbNotes.findAll({ attributes: ['createBy'], where: { id: userId, guild: guildId } });
        const Util = require('./Utilities');
        var RandomIndex = await Util.getRndInteger(0, NotesId.length - 1);
        return await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: NotesId[RandomIndex].get("createBy") } });
    },

    async GetNoteTextFromMember(guildId, userId, authorId) {
        return await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: authorId } }).get("text");
    },

    async GetNoteFromMember(guildId, userId, authorId) {
        return await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: authorId } });
    },

    async GetNoteCountByMember(guildId, userId) {
        var Notes = await TbNotes.findAll({ where: { id: userId, guild: guildId } });
        return Notes.length;
    },

    async GetNoteByMemberAndIndex(guildId, userId, index) {
        const Notes = await TbNotes.findAll({ where: { id: userId, guild: guildId } });
        if (index >= Notes.length)
            throw new Error('Cant find any note in that index');
        return Notes[index];
    },

    //Others

    async InsertMember(guildId, userId) {
        try {
            const member = await TbMembers.create({
                guild: guildId,
                id: userId,
                xp: 0,
                level: 0,
                money: 0
            });

        } catch (e) {
            console.log(e);
            return false;
        }
        return true;

    },

    async GetNoteFromMemberIdIfExist(guildId, userId, authorId) {
        return await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: authorId } });
    },

    async GetNoteFromMemberId(guildId, userId, authorId) {
        var Note = await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: authorId } });
        if (!Note) {
            await this.InsertNote(guildId, userId, authorId, '');
            Note = await TbNotes.findOne({ where: { id: userId, guild: guildId, createBy: authorId } });
        }
        return Note;
    },

    async InsertNote(guildId, userId, authorId, Text) {
        try {
            const Note = await TbNotes.create({
                id: userId,
                guild: guildId,
                createBy: authorId,
                text: Text
            });

        } catch (e) {
            return false;
        }
        return true;
    },

    async InsertGuild(guildId) {
        try {
            const guild = await TbGuilds.create({
                id: guildId
            });

        } catch (e) {
            return false;
        }
        return true;

    },

    async SetGuildPrefix(guildId, prefix) {
        var Guild = await this.GetGuildFromId(guildId);
        await TbGuilds.update({ Prefix: prefix }, { where: { id: guildId } });
    },

    async GetGuildPrefix(guildId) {
        var Guild = await this.GetGuildFromId(guildId);
        return await Guild.get("Prefix");
    },

    async GetMemberFromId(guildId, userId) {
        var Member = await TbMembers.findOne({ where: { id: userId, guild: guildId } });
        if (!Member) {
            await this.InsertMember(guildId, userId);
            Member = await TbMembers.findOne({ where: { id: userId, guild: guildId } });
        }
        return Member;
    },

    async GetGuildFromId(guildId) {
        var Guild = await TbGuilds.findOne({ where: { id: guildId } });
        if (!Guild) {
            await this.InsertGuild(guildId);
            Guild = await TbGuilds.findOne({ where: { id: guildId } });
        }
        return Guild;
    },

    Sync() {
        TbMembers.sync({ alter: true });
        TbGuilds.sync();
        TbNotes.sync();
        TbMarriages.sync({ alter: true });
        sequelize.sync();
    },
};