const { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, OverwriteType } = require('discord.js');

const LOG_CHANNEL_ID = '1499605521416847512'; // Ganti dengan ID channel log server Anda

// Helper untuk mengirim log
function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        logChannel.send({ embeds: [embed] }).catch(err => console.error('Gagal mengirim log:', err));
    }
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

// Main handler untuk /add-fng command
async function handleAddFng(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
        // Cek permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.editReply({ 
                content: '❌ Anda tidak memiliki izin ManageChannels!' 
            });
        }

        const fngName = interaction.options.getString('name');
        const categoryAbout = interaction.options.getChannel('category_about');
        const categoryAct = interaction.options.getChannel('category_act');

        // Validasi kategori
        const validateAbout = validateCategory(categoryAbout, 'Category About');
        if (!validateAbout.valid) {
            return await interaction.editReply({ content: validateAbout.error });
        }

        const validateAct = validateCategory(categoryAct, 'Category Activity');
        if (!validateAct.valid) {
            return await interaction.editReply({ content: validateAct.error });
        }

        // Format nama channel
        const channelName = formatChannelName(fngName);

        // 1. BUAT ROLE BARU
        console.log(`[ADD-FNG] Membuat role: ${fngName}`);
        const newRole = await interaction.guild.roles.create({
            name: fngName,
            color: '#2ecc71',
            reason: `FNG dibuat oleh ${interaction.user.tag}`
        });

        // 2. BUAT CHANNEL ABOUT (View Only)
        // Role hanya bisa VIEW, TIDAK bisa SEND MESSAGE
        console.log(`[ADD-FNG] Membuat channel ABOUT: ${channelName}`);
        const channelAbout = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAbout.id,
            permissionOverwrites: createViewPermissions(newRole.id),
            topic: `📖 Channel Tentang ${fngName}`,
            reason: `Channel About untuk FNG ${fngName}`
        });

        // 3. BUAT CHANNEL ACTIVITY (Send Messages)
        // Role otomatis bisa SEND MESSAGE di channel ini
        console.log(`[ADD-FNG] Membuat channel ACTIVITY: ${channelName}`);
        const channelAct = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAct.id,
            permissionOverwrites: createActivityPermissions(newRole.id),
            topic: `💬 Channel Activity ${fngName}`,
            reason: `Channel Activity untuk FNG ${fngName}`
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
                { name: 'Permission', value: `👁️ View Only`, inline: true },
                { name: '💬 Channel Activity', value: `${channelAct}`, inline: true },
                { name: 'Kategori Activity', value: `${categoryAct.name}`, inline: true },
                { name: 'Permission', value: `✅ Send Messages`, inline: true },
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
                { name: '📖 Channel About', value: `${channelAbout} (\`${channelAbout.id}\`)\n👁️ Permission: ViewChannel, ReadMessageHistory (TIDAK bisa kirim pesan)` },
                { name: '💬 Channel Activity', value: `${channelAct} (\`${channelAct.id}\`)\n✅ Permission: ViewChannel, SendMessages, ReadMessageHistory, EmbedLinks, AttachFiles, AddReactions` },
                { name: 'Dibuat Oleh', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: 'Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        sendLog(interaction.guild, logEmbed);
        console.log(`[ADD-FNG] ✅ FNG ${fngName} berhasil dibuat!`);

    } catch (error) {
        console.error('[ADD-FNG] ❌ Error:', error);
        
        // Pastikan error message terkirim ke user
        try {
            await interaction.editReply({ 
                content: `❌ Gagal membuat FNG: ${error.message}` 
            });
        } catch (replyError) {
            console.error('[ADD-FNG] Gagal mengirim reply error:', replyError);
        }

        // Log error ke channel log
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error: Gagal Membuat FNG')
            .setColor('#e74c3c')
            .setDescription(`Terjadi kesalahan saat membuat FNG baru`)
            .addFields(
                { name: 'Error Message', value: `\`\`\`${error.message}\`\`\`` },
                { name: 'Error Stack', value: `\`\`\`${error.stack ? error.stack.slice(0, 1024) : 'No stack'}\`\`\`` },
                { name: 'Diminta Oleh', value: `${interaction.user.tag}` },
                { name: 'Server', value: `${interaction.guild.name}` }
            )
            .setTimestamp();

        sendLog(interaction.guild, errorEmbed);
    }
}

module.exports = { handleAddFng };
