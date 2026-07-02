const { ChannelType } = require('discord.js');

// MASUKKAN: ID Channel tujuan untuk menampung semua forward pesan (bukan ID User)
const TARGET_CHANNEL_ID = '1522065658869714974'; 

// Map untuk menyimpan relasi: ID_Pesan_Log -> { channelId: 'xxx', messageId: 'xxx' }
const messageMapping = new Map();

module.exports = {
    handleBotRespon: (client) => {
        client.on('messageCreate', async (message) => {
            // Abaikan jika pesan berasal dari bot itu sendiri
            if (message.author.bot) return;

            // 1. FITUR: Forward dari semua channel server ke SATU Channel Tujuan khusus
            // Pastikan bot tidak mem-forward pesan yang berasal dari channel tujuan itu sendiri (biar tidak looping)
            if (message.channel.type !== ChannelType.DM && message.channel.id !== TARGET_CHANNEL_ID) {
                
                // === DETEKSI REPLY & ISI CHAT YANG DIBALAS ===
                let replyInfo = '';
                if (message.reference && message.reference.messageId) {
                    try {
                        const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
                        const originalContent = originalMessage.content || '_[Hanya file/gambar]_';
                        replyInfo = `\n• **Membalas Chat:** ${originalMessage.author.username} (\`${originalMessage.author.id}\`)\n• **Chat yang dibalas:** ${originalContent}`;
                    } catch (fetchError) {
                        replyInfo = `\n• **Membalas Chat:** _[Tidak diketahui]_\n• **Chat yang dibalas:** _[Pesan asli tidak ditemukan/dihapus]_`;
                    }
                }
                // ==========================================

                const messageContent = message.content || '_[Hanya mengirim file/gambar]_';
                const content = `📩 **Pesan Baru**\n• **Pengirim:** ${message.author.username} (\`${message.author.id}\`)\n• **Channel Asal:** <#${message.channel.id}>\n• **Link Chat:** https://discord.com{message.guild.id}/${message.channel.id}/${message.id}${replyInfo}\n• **Isi:** ${messageContent}`;

                try {
                    // Ambil channel tujuan log/forward
                    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
                    if (!targetChannel) return console.error('Target channel tidak ditemukan.');

                    // Kirim pesan ke channel tujuan
                    const forwardMessage = await targetChannel.send({
                        content: content,
                        files: Array.from(message.attachments.values()) 
                    });

                    // Petakan ID pesan yang dikirim bot di channel log ke pesan asli pengguna
                    messageMapping.set(forwardMessage.id, {
                        channelId: message.channel.id,
                        messageId: message.id
                    });
                } catch (error) {
                    console.error(`Gagal meneruskan pesan ke Channel ID ${TARGET_CHANNEL_ID}:`, error);
                }
                return;
            }

            // 2. FITUR: Balas (reply) pesan bot di Channel Tujuan untuk merespon ke channel asli
            if (message.channel.id === TARGET_CHANNEL_ID) {
                // Pastikan user melakukan reply ke pesan bot
                if (!message.reference || !message.reference.messageId) return;

                const referenceData = messageMapping.get(message.reference.messageId);
                if (!referenceData) {
                    return message.reply("❌ Data pesan asli tidak ditemukan atau bot baru saja direstart.");
                }

                try {
                    // Ambil channel asli tempat user pertama kali mengirim pesan
                    const originChannel = await client.channels.fetch(referenceData.channelId);
                    if (!originChannel) return message.reply("❌ Channel server asal tidak ditemukan.");

                    // Ambil pesan asli untuk dibalas secara langsung (threads/replies)
                    const originalMessage = await originChannel.messages.fetch(referenceData.messageId);
                    
                    // Kirim balasan ke channel asli
                    await originalMessage.reply({
                        content: message.content || '',
                        files: Array.from(message.attachments.values())
                    });

                    // Beri reaksi centang pada pesan admin sebagai penanda sukses
                    await message.react('✅');

                } catch (error) {
                    console.error(`Gagal mengirim balasan ke channel asal:`, error);
                    message.reply("❌ Gagal mengirim balasan. Pastikan bot memiliki izin kirim pesan di channel tersebut.");
                }
            }
        });
    }
};
