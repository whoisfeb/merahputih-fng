const { ChannelType } = require('discord.js');

// ID Channel tujuan LOG di sini
const LOG_CHANNEL_ID = '1499605521630625929'; 

// Nama fungsi disamakan dengan yang di-import pada index.js Anda
async function handleFngLogs(interaction) {
    // Ambil data input dari user
    const fngRole = interaction.options.getRole('fng-role');
    const strike = interaction.options.getString('strike');
    const reason = interaction.options.getString('reason');
    const attachment = interaction.options.getAttachment('gambar');

    // Cari channel log target
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) {
        return interaction.reply({ 
            content: '❌ Gagal mengirim log. Channel target tidak ditemukan atau dikonfigurasi salah.', 
            ephemeral: true 
        });
    }

    // Susun teks format pesan log
    const outputMessage = `**Faction Logs**\n\n` +
                          `Faction : <@&${fngRole.id}>\n\n` +
                          `Logs : ${strike}\n\n` +
                          `Reason : ${reason}\n\n` +
                          `@everyone`;

    // Siapkan payload paket pengiriman
    const payload = { content: outputMessage };

    // Jika user melampirkan berkas gambar (Ctrl+V), masukkan ke paket kiriman
    if (attachment) {
        payload.files = [attachment.url];
    }

    try {
        // Kirim ke channel target LOG
        await logChannel.send(payload);
        
        // Beri respon sukses ke admin/user yang menjalankan perintah
        await interaction.reply({ 
            content: `✅ Faction Log untuk ${fngRole.name} berhasil dikirim ke <#${LOG_CHANNEL_ID}>!`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: '❌ Terjadi kesalahan saat mencoba mengirim log ke channel tujuan.', 
            ephemeral: true 
        });
    }
}

// WAJIB DIEKSPOR: Agar bisa dibaca oleh const { handleFngLogsSlash } di index.js
module.exports = { handleFngLogs };
