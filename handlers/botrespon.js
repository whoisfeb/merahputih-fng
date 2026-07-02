const { ChannelType } = require('discord.js');

// MASUKKAN: ID Channel server tujuan tempat bot akan mengirimkan forward pesan
const TARGET_CHANNEL_ID = '1522065658869714974'; 

// Map untuk menyimpan relasi: ID_Pesan_Log -> { channelId: 'xxx', messageId: 'xxx' }
const messageMapping = new Map();

module.exports = {
    handleBotRespon: (client) => {
        client.on('messageCreate', async (message) => {
            // Abaikan jika pesan berasal dari bot itu sendiri
            if (message.author.bot) return;

            // 1. FITUR: Forward dari semua channel server ke SATU Channel Tujuan khusus
            // Mencegah bot mem-forward pesan yang diketik di dalam channel tujuan itu sendiri
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
                
                // Format isi pesan tetap dipertahankan persis seperti versi DM Anda sebelumnya
                const content = `📩 **Pesan Baru**\n• **Pengirim:** ${message.author.username} (\`${message.author.id}\`)\n• **Channel:** <#${message.channel.id}>${replyInfo}\n• **Isi:** ${messageContent}`;

                try {
                    // Mengambil data channel server tujuan
                    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
                    if (!targetChannel) return console.error('Target channel tidak ditemukan.');

                    // Kirim pesan langsung ke channel server tujuan
                    const forwardMessage = await targetChannel.send({
                        content: content,
                        files: Array.from(message.attachments.values()) 
                    });

                    // Petakan ID pesan dari channel penampung ke pesan asli server
                    messageMapping.set(forwardMessage.id, {
                        channelId: message.channel.id,
                        messageId: message.id
                    });
                } catch (error) {
                    console.error(`Gagal meneruskan pesan ke Channel ID ${TARGET_CHANNEL_ID}:`, error);
                }
                return;
            }

            // 2. FITUR: Pengguna membalas (reply) pesan bot di Channel Tujuan untuk merespon ke channel asli
            if (message.channel.id === TARGET_CHANNEL_ID) {
                // Pastikan admin melakukan reply ke salah satu pesan forward milik bot
                if (!message.reference || !message.reference.messageId) return;

                const referenceData = messageMapping.get(message.reference.messageId);
                if (!referenceData) {
                    return message.reply("❌ Data pesan asli tidak ditemukan atau bot baru saja direstart.");
                }

                try {
                    // Ambil channel asal tempat user pertama kali mengirim pesan
                    const targetChannel = await client.channels.fetch(referenceData.channelId);
                    if (!targetChannel) return message.reply("❌ Channel server tidak ditemukan.");

                    // Ambil pesan asli untuk langsung dibalas di channel tersebut
                    const originalMessage = await targetChannel.messages.fetch(referenceData.messageId);
                    
                    await originalMessage.reply({
                        content: message.content || '',
                        files: Array.from(message.attachments.values())
                    });

                    await message.react('✅');

                } catch (error) {
                    console.error(`Gagal mengirim balasan ke server:`, error);
                    message.reply("❌ Gagal mengirim balasan. Pastikan bot memiliki izin kirim pesan di channel tersebut.");
                }
            }
        });
    }
};
