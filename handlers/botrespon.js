const { ChannelType } = require('discord.js');

// ID User (Developer/Admin) yang akan menerima semua pesan
const TARGET_USER_ID = '774310796565020702'; 

// Map untuk menyimpan relasi: ID_Pesan_DM -> { channelId: 'xxx', messageId: 'xxx' }
const messageMapping = new Map();

module.exports = {
    handleBotRespon: (client) => {
        client.on('messageCreate', async (message) => {
            // Abaikan jika pesan berasal dari bot itu sendiri
            if (message.author.bot) return;

            // 1. FITUR: Forward dari semua channel server ke DM User ID
            if (message.channel.type !== ChannelType.DM) {
                try {
                    // Ambil data user target
                    const targetUser = await client.users.fetch(TARGET_USER_ID);
                    
                    // Format teks isi pesan utama
                    const messageContent = message.content || '_[Hanya mengirim file/gambar]_';
                    
                    // === DETEKSI REPLY & ISI CHAT YANG DIBALAS ===
                    let replyInfo = '';
                    if (message.reference && message.reference.messageId) {
                        try {
                            // Ambil pesan asli yang sedang dibalas oleh user tersebut di server
                            const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
                            
                            // Ambil teks pesan lama (beri tanda jika pesan lama hanya gambar/file)
                            const originalContent = originalMessage.content || '_[Hanya file/gambar]_';
                            
                            // Susun informasi pengirim lama dan isi chat lamanya
                            replyInfo = `\n• **Membalas Chat:** ${originalMessage.author.username} (\`${originalMessage.author.id}\`)\n• **Chat yang dibalas:** ${originalContent}`;
                        } catch (fetchError) {
                            // Jika pesan lama sudah dihapus atau tidak bisa diakses
                            replyInfo = `\n• **Membalas Chat:** _[Tidak diketahui]_\n• **Chat yang dibalas:** _[Pesan asli tidak ditemukan/dihapus]_`;
                        }
                    }
                    // ==========================================

                    // Gabungkan semua komponen pesan
                    const content = `📩 **Pesan Baru**\n• **Pengirim:** ${message.author.username} (\`${message.author.id}\`)\n• **Channel:** <#${message.channel.id}>${replyInfo}\n• **Isi:** ${messageContent}`;

                    // Kirim pesan ke DM user target
                    const dmMessage = await targetUser.send({
                        content: content,
                        files: Array.from(message.attachments.values()) 
                    });

                    // Simpan relasi: ID Pesan DM memetakan ke Pesan Asli di Server
                    messageMapping.set(dmMessage.id, {
                        channelId: message.channel.id,
                        messageId: message.id
                    });

                } catch (error) {
                    console.error(`Gagal meneruskan pesan ke DM:`, error);
                }
                return;
            }

            // 2. FITUR: User ID membalas (reply) pesan DM tersebut untuk merespon ke server asli
            if (message.channel.type === ChannelType.DM && message.author.id === TARGET_USER_ID) {
                // Pastikan user membalas menggunakan fitur bawaan Discord (Reply Message)
                if (!message.reference || !message.reference.messageId) return;

                // Ambil data pesan asli berdasarkan ID pesan DM yang direply
                const referenceData = messageMapping.get(message.reference.messageId);
                if (!referenceData) {
                    return message.reply("❌ Data pesan asli tidak ditemukan atau bot baru saja direstart.");
                }

                try {
                    // Ambil channel tujuan di server
                    const targetChannel = await client.channels.fetch(referenceData.channelId);
                    if (!targetChannel) return message.reply("❌ Channel server tidak ditemukan.");

                    // Ambil pesan asli di channel tersebut
                    const originalMessage = await targetChannel.messages.fetch(referenceData.messageId);
                    
                    // Bot merespon/reply ke pesan asli di server
                    await originalMessage.reply({
                        content: message.content || '',
                        files: Array.from(message.attachments.values())
                    });

                    // Beri tanda sukses di DM user jika berhasil membalas
                    await message.react('✅');

                } catch (error) {
                    console.error(`Gagal mengirim balasan ke server:`, error);
                    message.reply("❌ Gagal mengirim balasan. Pastikan bot memiliki izin kirim pesan di channel tersebut.");
                }
            }
        });
    }
};
