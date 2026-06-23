const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

// Konfigurasi ID
const ALLOWED_ROLE_IDS = ['1480248506655703101']; // Menggunakan array agar pengecekan .includes() berfungsi dengan benar
const LOG_CHANNEL_ID = '1483432966163136584';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setmember')
        .setDescription('Mengubah nama pengguna dan memberikan role sekaligus.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User yang akan diubah')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('nickname')
                .setDescription('Nickname baru')
                .setRequired(true))
        .addRoleOption(option =>
            option
                .setName('role_wajib')
                .setDescription('Role wajib')
                .setRequired(true))
        .addRoleOption(option =>
            option
                .setName('role_opsional_1')
                .setDescription('Role opsional 1')
                .setRequired(false))
        .addRoleOption(option =>
            option
                .setName('role_opsional_2')
                .setDescription('Role opsional 2')
                .setRequired(false))
        .addRoleOption(option =>
            option
                .setName('role_opsional_3')
                .setDescription('Role opsional 3')
                .setRequired(false))
        .addRoleOption(option =>
            option
                .setName('role_opsional_4')
                .setDescription('Role opsional 4')
                .setRequired(false)),
    
    /**
     * Fungsi eksekusi utama handler perintah
     * @param {import('discord.js').CommandInteraction} interaction 
     */
    async execute(interaction) {
        // 1. Cek Akses Role Pengguna Command
        const hasAccess = interaction.member.roles.cache.some(role =>
            ALLOWED_ROLE_IDS.includes(role.id)
        );

        if (!hasAccess) {
            return interaction.reply({
                content: '❌ Kamu tidak memiliki akses menggunakan command ini.',
                ephemeral: true
            });
        }

        // 2. Ambil Input Data dari Interaksi Slah Command
        const targetUser = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
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
            return interaction.reply({
                content: '❌ Member tidak ditemukan di server ini.',
                ephemeral: true
            });
        }

        try {
            // 4. Proses Perubahan Nickname
            await member.setNickname(nickname);

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

            // 7. Konstruksi Log Berbentuk Embed
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Logs Success Update User') // Tanda kutip penutup diperbaiki di sini
                .addFields(
                    {
                        name: 'Member',
                        value: `${targetUser.tag} (${targetUser.id})`
                    },
                    {
                        name: 'Nickname Baru',
                        value: nickname
                    },
                    {
                        name: 'Role Ditambahkan',
                        value: rolesAddedLog.map(r => `<@&${r.id}>`).join('\n')
                    },
                    {
                        name: 'Dilakukan Oleh',
                        value: `${interaction.user.tag}`
                    }
                )
                .setTimestamp();

            // 8. Kirim Respons Privat ke Staff/Eksekutor
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // 9. Kirim Salinan Logs ke Channel Log Server
            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                await logChannel.send({
                    embeds: [embed]
                });
            }

        } catch (error) {
            console.error(error);

            // Penanganan error interaksi yang aman
            const errorMessage = {
                content: `❌ Terjadi kesalahan:\n\`${error.message}\``,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(errorMessage).catch(() => {});
            } else {
                return interaction.reply(errorMessage).catch(() => {});
            }
        }
    }
};
