const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Bot telah aktif sebagai ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!ambil-role') {
        try {
            // Urutkan role dari posisi tertinggi ke terendah
            const roles = message.guild.roles.cache
                .sort((a, b) => b.position - a.position)
                .filter(role => role.name !== '@everyone'); // Abaikan @everyone

            let chunks = [];
            let currentChunk = "";

            roles.forEach(role => {
                const roleText = `${role.name}\n${role.id}\n\n`;
                
                // Discord membatasi teks di dalam Embed Deskripsi maksimal 4096 karakter
                // Kita potong setiap 3500 karakter agar aman
                if ((currentChunk + roleText).length > 3500) {
                    chunks.push(currentChunk);
                    currentChunk = roleText;
                } else {
                    currentChunk += roleText;
                }
            });
            
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // Kirim semua bagian ke dalam bentuk Embed ke chat Discord
            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(i === 0 ? 'Daftar Seluruh Role (Urutan Teratas)' : 'Daftar Role (Lanjutan)')
                    .setDescription(chunks[i])
                    .setFooter({ text: `Halaman ${i + 1} dari ${chunks.length}` });

                await message.channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(error);
            message.reply("Terjadi kesalahan saat mengambil data role.");
        }
    }
});

// Bot akan membaca token secara otomatis dari sistem keamanan Environment/Secrets
client.login(process.env.DISCORD_TOKEN);

