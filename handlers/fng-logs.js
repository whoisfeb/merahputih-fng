const { ChannelType } = require('discord.js');

// ID Channel tujuan LOG di sini
const LOG_CHANNEL_ID = '1499605521630625929'; 

// 🔐 DAFTAR ID ROLE YANG DIIZINKAN MENGGUNAKAN PERINTAH INI
const ALLOWED_STAFF_ROLES = [
    '1499605520603025517', // ID Role Admin Anda
    '1499605520661876856'  // ID Role Moderator Anda
];

// Nama fungsi disamakan dengan yang di-import pada index.js Anda
async function handleFngLogs(interaction) {
    // 🛡️ PROSES PENGECEKAN ROLE STAF + OWNER SERVER
    // 1. Periksa apakah pengguna adalah Pemilik Konten/Owner Server asli
    const isOwner = interaction.user.id === interaction.guild.ownerId;

    // 2. Periksa apakah pengguna memiliki salah satu role dari ALLOWED_STAFF_ROLES
    const hasStaffRole = interaction.member.roles.cache.some(role => ALLOWED_STAFF_ROLES.includes(role.id));
    
    // Jika dia BUKAN owner DAN JUGA TIDAK memiliki role staf, maka akses diblokir
    if (!isOwner && !hasStaffRole) {
        return interaction.reply({
            content: '❌ Anda tidak memiliki izin (Role Staf / Owner Server) untuk menggunakan perintah ini!',
            ephemeral: true // Hanya bisa dilihat secara pribadi oleh user tersebut
        });
    }

    // ⏳ SOLUSI ERROR 10062: Amankan interaksi agar token tidak kedaluwarsa dalam 3 detik
    // Memberikan bot waktu tambahan hingga 15 menit untuk memproses unggahan file gambar
    await interaction.deferReply({ ephemeral: true });

    // Ambil data input dari user jika lolos pengecekan izin di atas
    const fngRole = interaction.options.getRole('fng-role');
    const strike = interaction.options.getString('strike');
    const reason = interaction.options.getString('reason');
    const attachment = interaction.options.getAttachment('gambar');

    // Cari channel log target
    // Cari channel log target
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);

    // PERBAIKAN: Masukkan GuildAnnouncement ke dalam daftar tipe yang diizinkan
    const tipeChannelAman = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

    if (!logChannel || !tipeChannelAman.includes(logChannel.type)) {
        return interaction.editReply({ 
            content: '❌ Gagal mengirim log. Channel target tidak ditemukan atau jenis channel tidak didukung.'
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
        
        // PERBAIKAN: Menggunakan editReply untuk memberikan respons sukses akhir
        await interaction.editReply({ 
            content: `✅ Faction Log untuk ${fngRole.name} berhasil dikirim ke <#${LOG_CHANNEL_ID}>!`
        });
    } catch (error) {
        console.error(error);
        // PERBAIKAN: Menggunakan editReply untuk respons error
        await interaction.editReply({ 
            content: '❌ Terjadi kesalahan saat mencoba mengirim log ke channel tujuan.'
        });
    }
}

// WAJIB DIEKSPOR: Agar bisa dibaca oleh const { handleFngLogs } di index.js
module.exports = { handleFngLogs };
