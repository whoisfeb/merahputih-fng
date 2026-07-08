const { EmbedBuilder } = require('discord.js');

// Konfigurasi ID Internal
const ALLOWED_ROLE_IDS = ['1499605520603025517']; 
const LOG_CHANNEL_ID = '1499605521416847512';

/**
 * Fungsi eksekusi utama handler perintah setmember
 * @param {import('discord.js').CommandInteraction} interaction 
 */
async function handleSetMember(interaction) {
    // 1. Cek Akses Role Pengguna Command
    const hasAccess = interaction.member.roles.cache.some(role =>
        ALLOWED_ROLE_IDS.includes(role.id)
    );

    if (!hasAccess) {
        return interaction.editReply({ 
            content: '❌ Kamu tidak memiliki akses menggunakan command ini.'
        });
    }

    // 2. Ambil Input Data dari Interaksi Slash Command
    const targetUser = interaction.options.getUser('user');
    const namaDepan = interaction.options.getString('nama_depan'); // Input nama depan (Wajib)
    const customNickname = interaction.options.getString('nickname'); // Input nickname spesifik (Opsional)
    const requiredRole = interaction.options.getRole('role_wajib');
    
    const optionalRoles = [
        interaction.options.getRole('role_opsional_1'),
        interaction.options.getRole('role_opsional_2'),
        interaction.options.getRole('role_opsional_3'),
        interaction.options.getRole('role_opsional_4')
    ];

    // 3. Cari Member di Server Guild
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
        return interaction.editReply({ 
            content: '❌ Member tidak ditemukan di server ini.'
        });
    }

    try {
        // 4. Logika Otomatisasi Format Nickname Baru (DIPERBAIKI)
        // Jika nickname kosong, ambil nama panggilan server saat ini, nama display Discord, atau username dasarnya.
        const namaBelakang = customNickname ? customNickname : (member.displayName || targetUser.globalName || targetUser.username);
        const finalNickname = `${namaDepan} | ${namaBelakang}`;

        // Validasi batas maksimal nama panggilan Discord (32 Karakter)
        if (finalNickname.length > 32) {
            return interaction.editReply({
                content: `❌ Gagal! Format nama terlalu panjang (${finalNickname.length}/32 karakter). Harap persingkat input Anda.`
            });
        }

        // Proses Perubahan Nickname ke Server Discord
        await member.setNickname(finalNickname);

        // 5. Kumpulkan Seluruh Role ID (Wajib + Opsional)
        const rolesToApply = [requiredRole.id];
        const rolesAddedLog = [requiredRole];

        for (const role of optionalRoles) {
            if (role) {
                rolesToApply.push(role.id);
                rolesAddedLog.push(role);
            }
        }

        // 6. Pasang Semua Role Sekaligus (Menghindari Limit API Discord)
        await member.roles.add(rolesToApply);

        // 7. Konstruksi Log Berbentuk Embed (Mendukung Username Baru Discord)
        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Logs Success Update User')
            .addFields(
                {
                    name: 'Member',
                    value: targetUser.discriminator && targetUser.discriminator !== '0' 
                        ? `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})`
                        : `${targetUser.username} (${targetUser.id})`
                },
                {
                    name: 'Nickname Baru',
                    value: finalNickname
                },
                {
                    name: 'Role Ditambahkan',
                    value: rolesAddedLog.map(r => `<@&${r.id}>`).join('\n')
                },
                {
                    name: 'Dilakukan Oleh',
                    value: interaction.user.discriminator && interaction.user.discriminator !== '0'
                        ? `${interaction.user.username}#${interaction.user.discriminator}`
                        : `${interaction.user.username}`
                }
            )
            .setTimestamp();

        // 8. Kirim Respons Privat ke Staff/Eksekutor
        await interaction.editReply({ 
            embeds: [embed]
        });

        // 9. Kirim Salinan Logs ke Channel Log Server (Gunakan fetch jika cache kosong)
        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID) 
            || await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            
        if (logChannel) {
            await logChannel.send({
                embeds: [embed]
            });
        }

    } catch (error) {
        console.error(error);

        // Penanganan error interaksi yang aman
        const errorMessage = {
            content: `❌ Terjadi kesalahan:\n\`${error.message}\``
        };

        // Menggunakan editReply karena interaksi dipastikan sudah di-defer di index.js
        return interaction.editReply(errorMessage).catch(() => {});
    }
}

// 3. HANYA EKSPORT FUNGSINYA SAJA (Karena data menu sudah ada di index.js)
module.exports = { handleSetMember };
