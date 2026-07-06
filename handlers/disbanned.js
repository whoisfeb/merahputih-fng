const { ChannelType } = require('discord.js');

// ID Channel tujuan LOG Disbanment di sini
const LOG_CHANNEL_ID = '1515243890838470796'; 

// 🔐 DAFTAR ID ROLE YANG DIIZINKAN MENGGUNAKAN PERINTAH INI
const ALLOWED_STAFF_ROLES = [
    '1499605520603025517', // ID Role Admin Anda
    '1499605520661876856'  // ID Role Moderator Anda
];

// 🆔 DAFTAR ID ROLE YANG AKAN DICABUT DARI USER (FnG Lead & FnG Member)
const FNG_LEAD_ROLE_ID = '1499605520603025515'; 
const FNG_MEMBER_ROLE_ID = '1503361899629379654';

// Fungsi utama penanganan Disbanned
async function handleDisbanned(interaction) {
    // 🛡️ PROSES PENGECEKAN ROLE STAF + OWNER SERVER
    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const hasStaffRole = interaction.member.roles.cache.some(role => ALLOWED_STAFF_ROLES.includes(role.id));
    
    if (!isOwner && !hasStaffRole) {
        return interaction.reply({
            content: '❌ Anda tidak memiliki izin (Role Staf / Owner Server) untuk menggunakan perintah ini!',
            ephemeral: true 
        });
    }

    // ⏳ SOLUSI ERROR 10062: Amankan interaksi agar token tidak kedaluwarsa
    await interaction.deferReply({ ephemeral: true });

    // Ambil data input dari user berdasarkan opsi perintah /disbanned
    const fngRole = interaction.options.getRole('faction');
    const reason = interaction.options.getString('reason');
    const timeQuarantine = interaction.options.getString('time'); // Contoh: "30 Days"
    const attachment = interaction.options.getAttachment('gambar'); // Opsional (bisa Ctrl+V)

    // Cari channel log target
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) {
        return interaction.editReply({ 
            content: '❌ Gagal mengirim log. Channel target tidak ditemukan atau dikonfigurasi salah.'
        });
    }

    try {
        // Ambil data seluruh member di server untuk sinkronisasi cache terbaru
        const allMembers = await interaction.guild.members.fetch();
        
        // Filter member yang memiliki Role Faction yang di-input
        const factionMembers = allMembers.filter(member => member.roles.cache.has(fngRole.id));

        let affectedUsersCount = 0;

        // 🔄 LOOPING UNTUK PROSES EDIT USER (Hapus Role Lead/Member & Ganti Nama)
        for (const [memberId, member] of factionMembers) {
            // 1. Hapus Role FnG Lead & FnG Member jika mereka punya (Tanpa hapus Role Faction utama)
            const rolesToRemove = [];
            if (member.roles.cache.has(FNG_LEAD_ROLE_ID)) rolesToRemove.push(FNG_LEAD_ROLE_ID);
            if (member.roles.cache.has(FNG_MEMBER_ROLE_ID)) rolesToRemove.push(FNG_MEMBER_ROLE_ID);

            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove).catch(err => console.error(`Gagal menghapus role dari ${member.user.tag}:`, err));
            }

            // 2. Ubah nickname menjadi: "Nama Awal [Spasi] Time Quarantine"
            // Menggunakan member.displayName agar mengambil nama panggilan saat ini/nama asli discord jika belum diset nick-nya
            const currentName = member.displayName;
            const newNickname = `${currentName} ${timeQuarantine}`.substring(0, 32); // Limit karakter discord maks 32

            // Proses ganti nama (Bypass jika user tersebut adalah Owner Server karena bot tidak bisa ubah nama Owner)
            if (member.id !== interaction.guild.ownerId) {
                await member.setNickname(newNickname).catch(err => console.error(`Gagal mengubah nama ${member.user.tag}:`, err));
            }

            affectedUsersCount++;
        }

        // Susun teks format pesan log sesuai permintaan
        const outputMessage = `**Disbanment Logs**\n\n` +
                              `Faction : <@&${fngRole.id}>\n\n` +
                              `Reason : ${reason}\n\n` +
                              `-# Thanks for Roleplaying at Merah Putih\n` +
                              `-# The Faction has been officially disbanned,\n` +
                              `@everyone`;

        // Siapkan payload paket pengiriman
        const payload = { content: outputMessage };

        // Jika user melampirkan berkas gambar, masukkan ke paket kiriman
        if (attachment) {
            payload.files = [attachment.url];
        }

        // Kirim ke channel target LOG
        await logChannel.send(payload);
        
        // Respons sukses ke staf yang mengeksekusi perintah
        await interaction.editReply({ 
            content: `✅ Faction **${fngRole.name}** berhasil di-disbanned!\n` +
                     `🔹 Log dikirim ke <#${LOG_CHANNEL_ID}>.\n` +
                     `🔹 Total **${affectedUsersCount} member** diproses (Role FnG dihapus & Nickname diubah ke format waktu quarantine).`
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ 
            content: '❌ Terjadi kesalahan sistem saat mencoba memproses disbanment.'
        });
    }
}

// Ekspor fungsi agar bisa dipanggil di index.js atau command handler utama Anda
module.exports = { handleDisbanned };
