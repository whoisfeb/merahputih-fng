const { ChannelType } = require('discord.js');

// SEKARANG BERBENTUK ARRAY: Masukkan semua ID User yang ingin menerima forward pesan
const TARGET_USER_IDS = ['774310796565020702', '1089488853632548907', 'ID_USER_KETIGA_DISINI']; 

// Map untuk menyimpan relasi: ID_Pesan_DM -> { channelId: 'xxx', messageId: 'xxx' }
const messageMapping = new Map();

module.exports = {
    handleBotRespon: (client) => {
        client.on('messageCreate', async (message) => {
            // Abaikan jika pesan berasal dari bot itu sendiri
            if (message.author.bot) return;

            // 1. FITUR: Forward dari semua channel server ke DM semua Target User ID
            if (message.channel.type !== ChannelType.DM) {
                
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
                const content = `📩 **Pesan Baru**\n• **Pengirim:** ${message.author.username} (\`${message.author.id}\`)\n• **Channel:** <#${message.channel.id}>${replyInfo}\n• **Isi:** ${messageContent}`;

                // PERULANGAN: Kirim pesan ke semua user yang ada di dalam array TARGET_USER_IDS
                for (const userId of TARGET_USER_IDS) {
                    try {
                        const targetUser = await client.users.fetch(userId);
                        
                        const dmMessage = await targetUser.send({
                            content: content,
                            files: Array.from(message.attachments.values()) 
                        });

                        // Setiap ID pesan DM dari masing-masing user akan dipetakan ke pesan asli yang sama
                        messageMapping.set(dmMessage.id, {
                            channelId: message.channel.id,
                            messageId: message.id
                        });
                    } catch (error) {
                        console.error(`Gagal meneruskan pesan ke DM User ID ${userId}:`, error);
                    }
                }
                return;
            }

            // 2. FITUR: Salah satu Target User membalas (reply) pesan DM untuk merespon ke server asli
            // Mengecek apakah pengirim DM adalah salah satu dari ID yang terdaftar di array
            if (message.channel.type === ChannelType.DM && TARGET_USER_IDS.includes(message.author.id)) {
                if (!message.reference || !message.reference.messageId) return;

                const referenceData = messageMapping.get(message.reference.messageId);
                if (!referenceData) {
                    return message.reply("❌ Data pesan asli tidak ditemukan atau bot baru saja direstart.");
                }

                try {
                    const targetChannel = await client.channels.fetch(referenceData.channelId);
                    if (!targetChannel) return message.reply("❌ Channel server tidak ditemukan.");

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
