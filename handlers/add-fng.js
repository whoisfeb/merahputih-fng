const { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, OverwriteType } = require('discord.js');

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

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
// Format nama channel dari FNG name
// Format nama channel dari FNG name
function formatChannelName(fngName) {
    const trimmed = fngName.trim();
    
    // Periksa apakah karakter pertama adalah emoji
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/u;
    const hasEmoji = emojiRegex.test(trimmed);

    if (hasEmoji) {
        // Jika pakai emoji (Contoh: "❤ Titik Kumpul" -> "❤〢titik-kumpul")
        const parts = trimmed.split(' ');
        const emoji = parts[0];
        const restName = parts.slice(1).join('-').toLowerCase();
        return `${emoji}〢${restName}`;
    } else {
        // Jika tanpa emoji (Contoh: "Titik Kumpul" -> "〢titik-kumpul")
        const restName = trimmed.replace(/\s+/g, '-').toLowerCase();
        return `〢${restName}`;
    }
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

// Helper: Buat permission berdasarkan tipe
function createPermissionByType(roleId, permType) {
    if (permType === 'VIEW') {
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
        // Cek permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.editReply({ 
                content: '❌ Anda tidak memiliki izin ManageChannels!' 
            });
        }

        const fngName = interaction.options.getString('name');
        const categoryAbout = interaction.options.getChannel('category_about');
        const categoryAct = interaction.options.getChannel('category_act');

        // Ambil opsi warna dari input perintah (Gunakan warna hijau #2ecc71 jika admin mengosongkannya)
        const inputColor = interaction.options.getString('color') || '#2ecc71';

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

        // 1. BUAT ROLE BARU DENGAN WARNA KUSTOM
        console.log(`[ADD-FNG] Membuat role: ${fngName} dengan warna: ${inputColor}`);
        const newRole = await interaction.guild.roles.create({
            name: fngName,
            color: inputColor, // <--- Mengikuti input kustom admin
            reason: `FNG dibuat oleh ${interaction.user.tag}`
        });

        // Kumpulkan semua permission untuk channel ABOUT (Send Messages untuk role utama)
                // Kumpulkan semua permission untuk channel ABOUT
        const aboutPermissions = [
            {
                id: interaction.guild.id, // <--- Mengunci akses untuk @everyone
                type: OverwriteType.Role,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: newRole.id,
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

        // Kumpulkan semua permission untuk channel ACTIVITY
        const activityPermissions = [
            {
                id: interaction.guild.id, // <--- Mengunci akses untuk @everyone
                type: OverwriteType.Role,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: newRole.id,
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


        // Tambahkan role1-2 dengan permission1-2 jika ada
                // Tambahkan role1-2 dengan permission1-2 jika diisi oleh admin
        let additionalRolesInfo = '';
        for (let i = 1; i <= 2; i++) {
            const role = interaction.options.getRole(`role${i}`);
            const permission = interaction.options.getString(`permission${i}`);

            // VALIDASI PENGAMAN: Jika admin hanya mengisi salah satu saja
            if ((role && !permission) || (!role && permission)) {
                return await interaction.editReply({
                    content: `❌ Gagal! Jika Anda mengisi **role${i}**, Anda wajib memilih **permission${i}** (atau sebaliknya).`
                });
            }

            // Jika keduanya diisi lengkap, proses datanya
            if (role && permission) {
                const perm = createPermissionByType(role.id, permission);
                aboutPermissions.push(perm);
                activityPermissions.push(perm);
                additionalRolesInfo += `\n✅ ${role.name} - ${permission}`;
            }
        }


        // 2. BUAT CHANNEL ABOUT 
        console.log(`[ADD-FNG] Membuat channel ABOUT: ${channelName}`);
        const channelAbout = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAbout.id,
            permissionOverwrites: aboutPermissions,
            topic: `📖 Channel Tentang ${fngName}`,
            reason: `Channel About untuk FNG ${fngName}`
        });

        // 3. BUAT CHANNEL ACTIVITY
        console.log(`[ADD-FNG] Membuat channel ACTIVITY: ${channelName}`);
        const channelAct = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryAct.id,
            permissionOverwrites: activityPermissions,
            topic: `💬 Channel Activity ${fngName}`,
            reason: `Channel Activity untuk FNG ${fngName}`
        });

        // Buat embed untuk user (Warna embed mengikuti input warna kustom)
        const successEmbed = new EmbedBuilder()
            .setTitle('🆕 FNG Berhasil Dibuat')
            .setColor(inputColor) // <--- Mengikuti input kustom admin
            .addFields(
                { name: 'Nama FNG', value: `${fngName}`, inline: true },
                { name: 'Role Utama', value: `${newRole}`, inline: true },
                { name: 'Role ID', value: `\`${newRole.id}\``, inline: true },
                { name: '📖 Channel About', value: `${channelAbout}`, inline: true },
                { name: 'Kategori', value: `${categoryAbout.name}`, inline: true },
                { name: 'Permission', value: `✅ Send Messages`, inline: true },
                { name: '💬 Channel Activity', value: `${channelAct}`, inline: true },
                { name: 'Kategori', value: `${categoryAct.name}`, inline: true },
                { name: 'Permission', value: `✅ Send Messages`, inline: true }
            );

        if (additionalRolesInfo) {
            successEmbed.addFields(
                { name: 'Role Tambahan', value: additionalRolesInfo, inline: false }
            );
        }

        successEmbed.addFields(
            { name: 'Dibuat Oleh', value: `${interaction.user.tag}`, inline: false }
        ).setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // Buat embed untuk log
        let logAdditionalRoles = '';
        for (let i = 1; i <= 2; i++) {
            const role = interaction.options.getRole(`role${i}`);
            const permission = interaction.options.getString(`permission${i}`);
            if (role && permission) {
                logAdditionalRoles += `\n  • ${role.name} (\`${role.id}\`) - ${permission}`;
            }
        }

        const logEmbed = new EmbedBuilder()
            .setTitle('🆕 FNG Baru Dibuat')
            .setColor(inputColor) // <--- Mengikuti input kustom admin
            .setDescription(`Sistem FNG telah membuat grup baru dengan informasi berikut:`)
            .addFields(
                { name: 'Nama FNG', value: `${fngName}`, inline: true },
                { name: 'Role Utama', value: `${newRole} (\`${newRole.id}\`)`, inline: true },
                { name: '📖 Channel About', value: `${channelAbout} (\`${channelAbout.id}\`)\n✅ Role ${newRole.name}: ViewChannel, SendMessages, ReadMessageHistory, EmbedLinks, AttachFiles, AddReactions` },
                { name: '💬 Channel Activity', value: `${channelAct} (\`${channelAct.id}\`)\n✅ Role ${newRole.name}: ViewChannel, SendMessages, ReadMessageHistory, EmbedLinks, AttachFiles, AddReactions` }
            );

        if (logAdditionalRoles) {
            logEmbed.addFields(
                { name: 'Role Tambahan', value: logAdditionalRoles }
            );
        }

        logEmbed.addFields(
            { name: 'Dibuat Oleh', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
            { name: 'Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        ).setTimestamp();

        sendLog(interaction.guild, logEmbed);
        console.log(`[ADD-FNG] ✅ FNG ${fngName} berhasil dibuat dengan warna ${inputColor}!`);

    } catch (error) {
        console.error('[ADD-FNG] ❌ Error:', error);
        
        try {
            await interaction.editReply({ 
                content: `❌ Gagal membuat FNG: ${error.message}` 
            });
        } catch (replyError) {
            console.error('[ADD-FNG] Gagal mengirim reply error:', replyError);
        }

        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error: Gagal Membuat FNG')
            .setColor('#e74c3c') // Tetap merah jika terjadi error sistem
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
