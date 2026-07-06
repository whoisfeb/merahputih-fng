const { ChannelType } = require('discord.js');

// ID Channel tujuan LOG Disbanment di sini
const LOG_CHANNEL_ID = '1499605521630625929'; 

// 🔐 DAFTAR ID ROLE YANG DIIZINKAN MENGGUNAKAN PERINTAH INI
const ALLOWED_STAFF_ROLES = [
    '1499605520603025517', // ID Role Admin Anda
    '1499605520661876856'  // ID Role Moderator Anda
];

// 🆔 DAFTAR ID ROLE YANG AKAN DICABUT DARI USER (FnG Lead & FnG Member)
const FNG_LEAD_ROLE_ID = 'ID_ROLE_FNG_LEAD_DI_SINI'; 
const FNG_MEMBER_ROLE_ID = 'ID_ROLE_FNG_MEMBER_DI_SINI';

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

    // Ambil data input dari user
    const fngRole = interaction.options.getRole('faction');
    const reason = interaction.options.getString('reason');
    const timeQuarantine = interaction.options.getString('time'); // Contoh: "karantina 6 juli-13 juli(1/3)" atau "(2/3)"
    const attachment = interaction.options.getAttachment('gambar');

    // Cari channel log target (Mendukung Text & Announcement Channel)
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel || !logChannel.isTextBased()) {
        return interaction.editReply({ 
            content: '❌ Gagal mengirim log. Channel target tidak ditemukan atau tidak mendukung pesan teks.'
        });
    }

    try {
        // 🔄 1. PROSES MENGUBAH NAMA ROLE FACTION
        const oldRoleName = fngRole.name;
        // Menggabungkan nama role awal dengan input time quarantine (Contoh: "Testing Bot (2/3)")
        const newRoleName = `${oldRoleName} ${timeQuarantine}`; 
        
        // Eksekusi pengubahan nama role ke server Discord
        await fngRole.setName(newRoleName).catch(err => {
            console.error(`Gagal mengubah nama role Faction:`, err);
        });

        // 🔄 2. PROSES PENCABUTAN ROLE LEAD & MEMBER DARI ANGGOTA FACTION
        // Ambil data seluruh member di server untuk sinkronisasi cache terbaru
        const allMembers = await interaction.guild.members.fetch();
        
        // Filter member yang memegang Role Faction tersebut sebelum namanya diubah
        const factionMembers = allMembers.filter(member => member.roles.cache.has(fngRole.id));

        let affectedUsersCount = 0;

        for (const [memberId, member] of factionMembers) {
            const rolesToRemove = [];
            if (member.roles.cache.has(FNG_LEAD_ROLE_ID)) rolesToRemove.push(FNG_LEAD_ROLE_ID);
            if (member.roles.cache.has(FNG_MEMBER_ROLE_ID)) rolesToRemove.push(FNG_MEMBER_ROLE_ID);

            // Cabut role FnG Lead/Member (Role Faction utama/yang diganti namanya tetap aman menempel)
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove).catch(err => console.error(`Gagal mencabut role dari ${member.user.tag}:`, err));
            }
            affectedUsersCount++;
        }

        // 📝 3. SUSUN TEKS FORMAT PESAN LOG
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
            content: `✅ Faction **${oldRoleName}** berhasil di-disbanned!\n` +
                     `🔹 Nama role diubah menjadi: **${newRoleName}**\n` +
                     `🔹 Log dikirim ke <#${LOG_CHANNEL_ID}>.\n` +
                     `🔹 Total **${affectedUsersCount} member** dibersihkan dari role Lead/Member FnG.`
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ 
            content: '❌ Terjadi kesalahan sistem saat mencoba memproses disbanment.'
        });
    }
}

module.exports = { handleDisbanned };
