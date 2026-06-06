const { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, OverwriteType } = require('discord.js');

const LOG_CHANNEL_ID = '1499605521416847512'; // Ganti dengan ID channel log server Anda

// Helper untuk mengirim log
function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] }).catch(err => console.error('Gagal mengirim log:', err));
}

// Format nama channel dari FNG name
// Contoh: "❤ Titik Kumpul" -> "❤〢titik-kumpul"
function formatChannelName(fngName) {
    const parts = fngName.trim().split(' ');
    const emoji = parts[0];
    const restName = parts.slice(1).join('-').toLowerCase();
    return `${emoji}〢${restName}`;
}

// Validasi kategori
function validateCategory(category, categoryName) {
    if (!category) {
        return { valid: false, error: `❌ ${categoryName} tidak ditemukan!` };
    }
    if (category.type !== ChannelType.GuildCategory) {
        return { valid: false, error: `❌ ${categoryName} harus berupa kategori!` };
    }
    return { valid: true };
}

// Buat permission untuk channel ABOUT (View Only)
// HANYA ViewChannel + ReadMessageHistory yang di-enable, sisanya di-disable
function createViewPermissions(roleId) {
    return [
        {
            id: roleId,
            type: OverwriteType.Role,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory
            ],
            deny: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageWebhooks
            ]
        }
    ];
}

// Buat permission untuk channel ACTIVITY (Send & Read)
function createActivityPermissions(roleId) {
    return [
        {
            id: roleId,
            type: OverwriteType.Role,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles
            ],
            deny: [
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageWebhooks
            ]
        }
    ];
}

// Buat permission berdasarkan tipe (VIEW, SEND, PRIVATE)
function createPermissionsByType(roleId, permType) {
    if (permType === 'VIEW') {
        // VIEW: Hanya bisa lihat channel dan baca pesan lama
        return {
            id: roleId,
            type: OverwriteType.Role,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageWebhooks
            ]
        };
    } else if (permType === 'SEND') {
        // SEND: Bisa kirim pesan, embed, file, dan react
        return {
            id: roleId,
            type: OverwriteType.Role,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.AddReactions
            ],
            deny: [
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageWebhooks
            ]
        };
    } else if (permType === 'PRIVATE') {
        // PRIVATE: Tidak bisa lihat channel sama sekali
        return {
            id: roleId,
            type: OverwriteType.Role,
            deny: [PermissionFlagsBits.ViewChannel]
        };
    }
}

// Main handler untuk /add-fng command
async function handleAddFng(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageChannels!' });
        }

        const fngName = interaction.options.getString('name');
        const categoryAbout = interaction.options.getChannel('category_about');
        const categoryAct = interaction.options.getChannel('category_act');

        // Validasi kategori
        const validateAbout = validateCategory(categoryAbout, 'Category About');
        if (!validateAbout.valid) {
            return interaction.editReply({ content: validateAbout.error });
        }

        const validateAct = validateCategory(categoryAct, 'Category Activity');
        if (!validateAct.valid) {
            return interaction.editReply({ content: validateAct.error });
        }

        // Format nama channel
        const channelName = formatChannelName(fngName);

        // 1. BUAT ROLE BARU
        const newRole = await interaction.guild.roles.create({
            name: fngName,
            color: '#2ecc71', // Warna hijau default
            reason: `FNG dibuat oleh ${interaction.user.tag}`
        });

        // 2. BUAT CHANNEL ABOUT (View Only)
        const channelAbout = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAbout.id,
            permissionOverwrites: createViewPermissions(newRole.id),
            topic: `📖 Channel Tentang ${fngName}`
        });

        // 3. BUAT CHANNEL ACTIVITY (Send Messages)
        const channelAct = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAct.id,
            permissionOverwrites: createActivityPermissions(newRole.id),
            topic: `💬 Channel Activity ${fngName}`
        });

        // Buat embed untuk user
        const successEmbed = new EmbedBuilder()
            .setTitle('🆕 FNG Berhasil Dibuat')
            .setColor('#2ecc71')
            .addFields(
                { name: 'Nama FNG', value: `${fngName}`, inline: true },
                { name: 'Role Baru', value: `${newRole}`, inline: true },
                { name: 'Role ID', value: `\`${newRole.id}\``, inline: true },
                { name: '📖 Channel About', value: `${channelAbout}`, inline: true },
                { name: 'Kategori About', value: `${categoryAbout.name}`, inline: true },
                { name: 'Permission', value: `📖 View Only`, inline: true },
                { name: '💬 Channel Activity', value: `${channelAct}`, inline: true },
                { name: 'Kategori Activity', value: `${categoryAct.name}`, inline: true },
                { name: 'Permission', value: `💬 Send Messages`, inline: true },
                { name: 'Dibuat Oleh', value: `${interaction.user.tag}`, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // Buat embed untuk log
        const logEmbed = new EmbedBuilder()
            .setTitle('🆕 FNG Baru Dibuat')
            .setColor('#2ecc71')
            .setDescription(`Sistem FNG telah membuat grup baru dengan informasi berikut:`)
            .addFields(
                { name: 'Nama FNG', value: `${fngName}`, inline: true },
                { name: 'Role Baru', value: `${newRole} (\`${newRole.id}\`)`, inline: true },
                { name: '📖 Channel About', value: `${channelAbout} (\`${channelAbout.id}\`)\n✅ Permission: ViewChannel, ReadMessageHistory` },
                { name: '💬 Channel Activity', value: `${channelAct} (\`${channelAct.id}\`)\n✅ Permission: ViewChannel, SendMessages, ReadMessageHistory, EmbedLinks, AttachFiles, AddReactions` },
                { name: 'Dibuat Oleh', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: 'Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        sendLog(interaction.guild, logEmbed);

    } catch (error) {
        console.error('Error di add-fng:', error);
        await interaction.editReply({ content: `❌ Gagal membuat FNG: ${error.message}` });

        // Log error ke channel log juga
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error: Gagal Membuat FNG')
            .setColor('#e74c3c')
            .setDescription(`Terjadi kesalahan saat membuat FNG baru`)
            .addFields(
                { name: 'Error', value: `\`\`\`${error.message}\`\`\`` },
                { name: 'Diminta Oleh', value: `${interaction.user.tag}` },
                { name: 'Server', value: `${interaction.guild.name}` }
            )
            .setTimestamp();

        sendLog(interaction.guild, errorEmbed);
    }
}

module.exports = { handleAddFng };
