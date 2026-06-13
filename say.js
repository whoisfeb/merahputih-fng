const { 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');

async function handleSay(interaction) {
    const allowedRoleId = "1499605520603025516";
    const logChannelId = "1499605521416847512";

    // Cek permission role staf
    if (!interaction.member.roles.cache.has(allowedRoleId)) {
        return interaction.reply({
            content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
            ephemeral: true
        });
    }

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const rawRoles = interaction.options.getString('tag-roles');
    const rawUsers = interaction.options.getString('tag-users');
    const guild = interaction.guild;

    // Buat ID unik modal
    const uniqueId = `say_modal_${Date.now()}`;

    // 1. BUAT JENDELA POP-UP (MODAL)
    const modal = new ModalBuilder()
        .setCustomId(uniqueId)
        .setTitle('Kirim Pesan Manual');

    const messageInput = new TextInputBuilder()
        .setCustomId('say_message_input')
        .setLabel('Tulis Pesan Anda')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tulis pesan di sini... (Bisa langsung tekan enter ke bawah)')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(firstActionRow);

    // Tampilkan pop-up modal
    await interaction.showModal(modal);

    // 2. TUNGGU RESPONS MODAL
    try {
        const submitted = await interaction.awaitModalSubmit({
            time: 60000,
            filter: i => i.customId === uniqueId
        });

        let finalMessage = submitted.fields.getTextInputValue('say_message_input');
        let tagString = '';

        // PROSES PENCARIAN BANYAK ROLE OTOMATIS (VERSI PINTAR & AMAN)
        if (rawRoles) {
            // Memisahkan koma, menghapus spasi luar, dan menghilangkan simbol @ jika staf tidak sengaja mengetiknya
            const roleNames = rawRoles.split(',').map(r => r.trim().replace(/^@/, '').toLowerCase());
            const cacheRoles = guild.roles.cache;
            
            roleNames.forEach(name => {
                if (!name) return;
                const foundRole = cacheRoles.find(r => r.name.toLowerCase() === name);
                if (foundRole) {
                    tagString += `<@&${foundRole.id}> `;
                }
            });
        }

        // PROSES PENCARIAN BANYAK USER OTOMATIS (VERSI PINTAR & AMAN)
        if (rawUsers) {
            const userNames = rawUsers.split(',').map(u => u.trim().replace(/^@/, '').toLowerCase());
            const cacheMembers = guild.members.cache;

            userNames.forEach(name => {
                if (!name) return;
                const foundMember = cacheMembers.find(m => 
                    m.user.username.toLowerCase() === name || 
                    (m.nickname && m.nickname.toLowerCase() === name)
                );
                if (foundMember) {
                    tagString += `<@${foundMember.id}> `;
                }
            });
        }

        // Gabungkan tag ke pesan jika ada yang cocok
        if (tagString) {
            finalMessage += `\n\n${tagString.trim()}`;
        }

        await submitted.deferReply({ ephemeral: true });

        // Kirim hasil pesan akhir ke channel tujuan
        await targetChannel.send({ content: finalMessage });

        // Kirim Log ke Log Channel
        const logChannel = interaction.client.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📢 Command /say Digunakan')
                .setColor(0xffcc00)
                .addFields(
                    { name: 'User Staf', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Target Channel', value: `<#${targetChannel.id}>`, inline: true },
                    { name: 'Pesan Terkirim', value: finalMessage.substring(0, 1024) || '-' }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }

        return submitted.editReply({
            content: `✅ Pesan berhasil dikirim ke <#${targetChannel.id}>!`
        });

    } catch (err) {
        console.error('Terjadi kesalahan:', err);
    }
}

module.exports = { handleSay };
