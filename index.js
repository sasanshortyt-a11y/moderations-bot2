// === Imports ===
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// === Client Setup mit Intents ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// === XP/Level Daten laden oder erstellen ===
let xpData = {};
const xpFile = './xp.json';
if (fs.existsSync(xpFile)) {
    xpData = JSON.parse(fs.readFileSync(xpFile));
}

// === Helper-Funktion: XP speichern ===
function saveXP() {
    fs.writeFileSync(xpFile, JSON.stringify(xpData, null, 2));
}

// === Helper-Funktion: Level berechnen ===
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

// === Ready Event ===
client.on('ready', () => {
    console.log(`Bot ist online: ${client.user.tag}`);
});

// === Nachrichtenevent ===
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignoriere eigene Nachrichten

    const content = message.content.toLowerCase();

    // --- 1️⃣ XP sammeln & Level-Up ---
    const userId = message.author.id;
    if (!xpData[userId]) xpData[userId] = { xp: 0, level: 0 };

    xpData[userId].xp += 5; // +5 XP pro Nachricht
    const newLevel = calculateLevel(xpData[userId].xp);

    if (newLevel > xpData[userId].level) {
        xpData[userId].level = newLevel;

        // Rolle für neues Level vergeben
        const roleName = `Level ${newLevel}`;
        let role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            try {
                role = await message.guild.roles.create({
                    name: roleName,
                    color: 'BLUE',
                    reason: `Neues Level ${newLevel} erreicht`
                });
            } catch (err) {
                console.log('Fehler beim Erstellen der Rolle:', err);
            }
        }

        try {
            const member = message.member;
            if (role && member) await member.roles.add(role);
            message.channel.send(`🎉 ${message.author} hat Level ${newLevel} erreicht und die Rolle **${roleName}** bekommen!`);
        } catch (err) {
            console.log('Fehler beim Rollen hinzufügen:', err);
        }
    }

    saveXP();

    // --- 2️⃣ Auf @BotName reagieren ---
    if (message.mentions.has(client.user)) {
        await message.channel.send(`Hallo ${message.author}! Du hast mich getaggt. 😊`);
    }

    // --- 3️⃣ Admin-Befehle ---
    if (!message.member.permissions.has('Administrator')) return;

    if (content.startsWith('!hilfe')) {
        await message.channel.send(
            `📋 **Admin-Befehle:**\n` +
            `!löschen <Anzahl> → löscht die letzten Nachrichten\n` +
            `!rollegeben @User <Rolle> → gibt eine Rolle\n` +
            `!rollernehmen @User <Rolle> → entfernt eine Rolle`
        );
        return;
    }

    if (content.startsWith('!löschen ')) {
        const num = parseInt(content.split(' ')[1]);
        if (!num || num < 1 || num > 100) return message.channel.send('Bitte gib eine Zahl zwischen 1 und 100 an.');
        try {
            await message.channel.bulkDelete(num + 1, true); // +1 um den Befehl selbst zu löschen
            message.channel.send(`✅ ${num} Nachrichten wurden gelöscht.`).then(msg => setTimeout(() => msg.delete(), 5000));
        } catch (err) {
            console.log('Fehler beim Löschen:', err);
        }
        return;
    }

    if (content.startsWith('!rollegeben ')) {
        const mention = message.mentions.members.first();
        const roleName = content.split(' ').slice(2).join(' ');
        if (!mention || !roleName) return message.channel.send('Bitte gib @User und Rollenname an.');
        let role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            role = await message.guild.roles.create({ name: roleName, color: 'GREEN', reason: 'Neue Rolle erstellt' });
        }
        await mention.roles.add(role);
        message.channel.send(`✅ ${mention} hat die Rolle **${roleName}** erhalten.`);
        return;
    }

    if (content.startsWith('!rollernehmen ')) {
        const mention = message.mentions.members.first();
        const roleName = content.split(' ').slice(2).join(' ');
        if (!mention || !roleName) return message.channel.send('Bitte gib @User und Rollenname an.');
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return message.channel.send('Rolle nicht gefunden.');
        await mention.roles.remove(role);
        message.channel.send(`✅ ${mention} hat die Rolle **${roleName}** entfernt.`);
        return;
    }
});

// === Bot Login ===
client.login(process.env.TOKEN);
