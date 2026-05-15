// Mengaktifkan dotenv di baris paling pertama
require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    AuditLogEvent, 
    EmbedBuilder, 
    Partials, 
    REST, 
    Routes, 
    PermissionFlagsBits,
    ChannelType,      // <--- TAMBAHKAN INI
    OverwriteType,    // <--- TAMBAHKAN INI
    MessageFlags      // <--- TAMBAHKAN INI
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Wajib aktif di Developer Portal
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.Reaction, 
        Partials.GuildMember, 
        Partials.User
    ]
});


// GANTI ID DI BAWAH INI DENGAN ID CHANNEL LOG SERVER ANDA
const LOG_CHANNEL_ID = '1499605521416847512'; 


// Helper universal untuk mengirim log ke channel tujuan
function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] }).catch(err => console.error('Gagal mengirim log:', err));
}

// ==========================================
// SLASH COMMAND HANDLERS
// ==========================================

// --- BARIS PEMBUKA YANG HILANG DAN PERBAIKAN ASYNC ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;
// -----------------------------------------------------

        // ==================== COMMAND: /addrole ====================
    if (commandName === 'addrole') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageRoles!' });
            }

            const targetUser = interaction.options.getMember('user');
            const roleToGive = interaction.options.getRole('role');

            if (targetUser.roles.cache.has(roleToGive.id)) {
                return interaction.editReply({ content: `❌ Member ${targetUser} sudah memiliki role **${roleToGive.name}**!` });
            }

            await targetUser.roles.add(roleToGive);

            const embed = new EmbedBuilder()
                .setTitle('👤 Role Berhasil Diberikan')
                .setColor('#2ecc71')
                .addFields(
                    { name: 'Target Member', value: `${targetUser}`, inline: true },
                    { name: 'Role Diberikan', value: `${roleToGive}`, inline: true },
                    { name: 'Diberikan Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: `✅ Berhasil memberikan role **${roleToGive.name}** kepada ${targetUser}.` });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal memberikan role: ${error.message}` });
        }
    }

    // ==================== COMMAND: /removerole ====================
    if (commandName === 'removerole') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageRoles!' });
            }

            const targetUser = interaction.options.getMember('user');
            const roleToRemove = interaction.options.getRole('role');

            if (!targetUser.roles.cache.has(roleToRemove.id)) {
                return interaction.editReply({ content: `❌ Member ${targetUser} memang tidak memiliki role **${roleToRemove.name}**!` });
            }

            await targetUser.roles.remove(roleToRemove);

            const embed = new EmbedBuilder()
                .setTitle('👤 Role Berhasil Dihapus')
                .setColor('#e74c3c')
                .addFields(
                    { name: 'Target Member', value: `${targetUser}`, inline: true },
                    { name: 'Role Dihapus', value: `${roleToRemove}`, inline: true },
                    { name: 'Dihapus Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: `✅ Berhasil menghapus role **${roleToRemove.name}** dari ${targetUser}.` });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal menghapus role: ${error.message}` });
        }
    }

        // ==================== COMMAND: /createrole ====================
    if (commandName === 'createrole') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageRoles!' });
            }

            const roleName = interaction.options.getString('name');
            const roleColor = interaction.options.getString('color') || '#95a5a6'; // Default abu-abu jika kosong

            // Validasi format warna HEX sederhana
            if (roleColor && !/^#[0-9A-F]{6}$/i.test(roleColor)) {
                return interaction.editReply({ content: '❌ Format warna salah! Gunakan kode Hex seperti `#ff0000` (Merah) atau `#00ff00` (Hijau).' });
            }

            // Eksekusi pembuatan role
            const newRole = await interaction.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `Dibuat oleh ${interaction.user.tag} via bot`
            });

            const embed = new EmbedBuilder()
                .setTitle('🆕 Role Berhasil Dibuat')
                .setColor(roleColor)
                .addFields(
                    { name: 'Nama Role', value: `${newRole}`, inline: true },
                    { name: 'Warna (HEX)', value: `\`${roleColor}\``, inline: true },
                    { name: 'Dibuat Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: `✅ Role **${newRole.name}** berhasil dibuat!` });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal membuat role: ${error.message}` });
        }
    }

    // ==================== COMMAND: /deleterole ====================
    if (commandName === 'deleterole') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageRoles!' });
            }

            const roleToDelete = interaction.options.getRole('role');

            // Proteksi agar tidak menghapus @everyone atau role milik bot itu sendiri
            if (roleToDelete.id === interaction.guild.id) {
                return interaction.editReply({ content: '❌ Anda tidak bisa menghapus role @everyone!' });
            }
            if (roleToDelete.managed) {
                return interaction.editReply({ content: '❌ Role ini dikelola oleh integrasi eksternal/bot lain dan tidak bisa dihapus manual.' });
            }

            const roleNameBackup = roleToDelete.name;
            await roleToDelete.delete(`Dihapus oleh ${interaction.user.tag} via bot`);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Role Berhasil Dihapus')
                .setColor('#e74c3c')
                .addFields(
                    { name: 'Nama Role (Sebelumnya)', value: `@${roleNameBackup}`, inline: true },
                    { name: 'Dihapus Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: `✅ Role **${roleNameBackup}** berhasil dihapus dari server.` });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal menghapus role: ${error.message}` });
        }
    }


    // ==================== COMMAND: /addchannel ====================
    if (commandName === 'addchannel') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageChannels!' });
            }

            const channelName = interaction.options.getString('name');
            const category = interaction.options.getChannel('category');
            
            // Bangun permission overwrites secara dinamis
            const permissionOverwrites = [];

            // Loop untuk mengecek pasangan role dan jenis permission yang diinput user (maksimal 3 pasang)
            for (let i = 1; i <= 3; i++) {
                const role = interaction.options.getRole(`role${i}`);
                const permType = interaction.options.getString(`permission${i}`);

                if (role && permType) {
                    if (permType === 'VIEW') {
                        permissionOverwrites.push({
                            id: role.id,
                            type: OverwriteType.Role,
                            allow: [PermissionFlagsBits.ViewChannel]
                        });
                    } else if (permType === 'SEND') {
                        permissionOverwrites.push({
                            id: role.id,
                            type: OverwriteType.Role,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessage]
                        });
                    } else if (permType === 'PRIVATE') {
                        permissionOverwrites.push({
                            id: role.id,
                            type: OverwriteType.Role,
                            deny: [PermissionFlagsBits.ViewChannel]
                        });
                    }
                }
            }

            // Eksekusi pembuatan kanal teks
            const newChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category ? category.id : null,
                permissionOverwrites: permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setTitle('🆕 Kanal Berhasil Dibuat')
                .setColor('#3498db')
                .addFields(
                    { name: 'Nama Kanal', value: `${newChannel}`, inline: true },
                    { name: 'Kategori', value: category ? `${category.name}` : 'Tanpa Kategori', inline: true },
                    { name: 'Dibuat Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal membuat kanal: ${error.message}` });
        }
    }

    // ==================== COMMAND: /editchannel ====================
    if (commandName === 'editchannel') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageChannels!' });
            }

            const channel = interaction.options.getChannel('channel');
            const newName = interaction.options.getString('new-name');
            const newCategory = interaction.options.getChannel('new-category');

            if (!newName && !newCategory) {
                return interaction.editReply({ content: '❌ Anda harus mengisi setidaknya satu opsi ubah (Nama Baru atau Kategori Baru)!' });
            }

            const updateData = {};
            if (newName) updateData.name = newName;
            if (newCategory) updateData.parent = newCategory.id;

            await channel.edit(updateData);

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Kanal Berhasil Diubah')
                .setColor('#f1c40f')
                .addFields(
                    { name: 'Kanal', value: `${channel}`, inline: true },
                    { name: 'Perubahan', value: `${newName ? `• Nama Baru: **${newName}**\n` : ''}${newCategory ? `• Kategori Baru: **${newCategory.name}**` : ''}` },
                    { name: 'Diubah Oleh', value: `${interaction.user.tag}` }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal mengubah kanal: ${error.message}` });
        }
    }

    // ==================== COMMAND: /deletechannel ====================
    if (commandName === 'deletechannel') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.editReply({ content: '❌ Anda tidak memiliki izin ManageChannels!' });
            }

            const channel = interaction.options.getChannel('channel');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan spesifik';

            const channelNameBackup = channel.name;
            await channel.delete(reason);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Kanal Berhasil Dihapus')
                .setColor('#e67e22')
                .addFields(
                    { name: 'Nama Kanal (Sebelumnya)', value: `#${channelNameBackup}`, inline: true },
                    { name: 'Alasan', value: reason, inline: true },
                    { name: 'Dihapus Oleh', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: `✅ Kanal #${channelNameBackup} sukses dihapus.` });
            sendLog(interaction.guild, embed);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Gagal menghapus kanal: ${error.message}` });
        }
    }
});



// ==========================================
// 1. MANAGEMENT MESSAGES (PESAN)
// ==========================================

// Log Pesan Dihapus
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Pesan Dihapus')
        .setColor('#e74c3c')
        .setDescription(`Pesan dikirim oleh ${message.author || 'User Tidak Diketahui'} di channel ${message.channel} telah dihapus.`)
        .addFields({ name: 'Isi Pesan', value: message.content || '*Hanya berisi gambar/file/embed atau pesan terlalu lama sehingga tidak tersimpan di cache.*' })
        .setTimestamp();
    sendLog(message.guild, embed);
});

// Log Pesan Diedit
// Perbaikan Log Pesan Diedit (Bebas dari Bug Null / Kosong)
client.on('messageUpdate', async (oldMessage, newMessage) => {
    // Jika data pesan lama tidak ada di memori cache bot, suruh bot mengambilnya dari API Discord
    if (oldMessage.partial) {
        try {
            await oldMessage.fetch();
        } catch (error) {
            console.error('Gagal mengambil data pesan lama dari API:', error);
            return; // Berhenti jika pesan terlalu tua dan tidak bisa diambil lagi oleh sistem Discord
        }
    }

    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Mengabaikan jika hanya memicu preview link

    const penulis = oldMessage.author ? `${oldMessage.author} (${oldMessage.author.tag})` : 'User Tidak Diketahui';

    const embed = new EmbedBuilder()
        .setTitle('✏️ Pesan Diedit')
        .setColor('#f1c40f')
        .setDescription(`Pesan dikirim oleh ${penulis} di channel ${oldMessage.channel} telah diubah.`)
        .addFields(
            { name: 'Sebelum', value: oldMessage.content || '*Teks lama tidak dapat dimuat atau berupa file/embed*' },
            { name: 'Sesudah', value: newMessage.content || '*Kosong / Hanya File*' }
        )
        .setTimestamp();
        
    sendLog(newMessage.guild, embed);
});



// ==========================================
// 2. MANAGEMENT CHANNELS & KATEGORI (BERTAUTAN PERMISSION)
// ==========================================

// Log saat Channel / Kategori Dibuat
client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
    const logEntry = fetchedLogs.entries.first();
    const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';
    const tipe = channel.type === 4 ? 'Kategori' : 'Channel';

    const embed = new EmbedBuilder()
        .setTitle(`🆕 ${tipe} Dibuat`)
        .setColor('#2ecc71')
        .setDescription(`${tipe} bernama **${channel.name}** (<#${channel.id}>) telah dibuat oleh **${executor}**.`)
        .setTimestamp();
    sendLog(channel.guild, embed);
});

// Log saat Channel / Kategori Dihapus
client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const logEntry = fetchedLogs.entries.first();
    const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';
    const tipe = channel.type === 4 ? 'Kategori' : 'Channel';

    const embed = new EmbedBuilder()
        .setTitle(`🗑️ ${tipe} Dihapus`)
        .setColor('#e74c3c')
        .setDescription(`${tipe} bernama **${channel.name}** telah dihapus oleh **${executor}**.`)
        .setTimestamp();
    sendLog(channel.guild, embed);
});

// Log saat Channel / Kategori / Izin Diperbarui
client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!oldChannel.guild) return;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const embed = new EmbedBuilder().setTimestamp().setColor('#f1c40f');
    const tipeKonten = oldChannel.type === 4 ? 'Kategori' : 'Channel';

    // A. Deteksi Perubahan Izin (Permission Overwrites) Channel / Kategori
    if (!oldChannel.permissionOverwrites.cache.equals(newChannel.permissionOverwrites.cache)) {
        const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelOverwriteUpdate });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

        embed.setTitle(`🔒 Izin (Permission) ${tipeKonten} Diubah`)
            .setColor('#e67e22')
            .setDescription(`Hak akses pengaturan pada channel ${newChannel} telah dimodifikasi.`)
            .addFields(
                { name: 'Target Saluran', value: `**${newChannel.name}**` },
                { name: 'Diubah Oleh', value: `**${executor}**` },
                { name: 'Catatan', value: '*Periksa pengaturan channel secara langsung untuk melihat detail role/member yang diubah.*' }
            );
        sendLog(newChannel.guild, embed);
        return; 
    }

    // B. Deteksi Perubahan Nama
    if (oldChannel.name !== newChannel.name) {
        const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
        const updateLog = fetchedLogs.entries.first();
        const executor = updateLog ? updateLog.executor.tag : 'Tidak diketahui';

        embed.setTitle(`✏️ Nama ${tipeKonten} Diubah`)
            .setDescription(`Perubahan nama pada ${newChannel}`)
            .addFields(
                { name: 'Nama Lama', value: oldChannel.name, inline: true },
                { name: 'Nama Baru', value: newChannel.name, inline: true },
                { name: 'Pengubah', value: executor }
            );
        sendLog(newChannel.guild, embed);
    }

    // C. Deteksi Perpindahan Kategori Induk
    if (oldChannel.parentId !== newChannel.parentId) {
        const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
        const updateLog = fetchedLogs.entries.first();
        const executor = updateLog ? updateLog.executor.tag : 'Tidak diketahui';

        const katLama = oldChannel.parent ? oldChannel.parent.name : 'Tanpa Kategori';
        const katBaru = newChannel.parent ? newChannel.parent.name : 'Tanpa Kategori';

        embed.setTitle(`📂 Perpindahan Kategori ${tipeKonten}`)
            .setDescription(`Posisi kategori ${newChannel} telah bergeser.`)
            .addFields(
                { name: 'Kategori Lama', value: katLama, inline: true },
                { name: 'Kategori Baru', value: katBaru, inline: true },
                { name: 'Pengubah', value: executor }
            );
        sendLog(newChannel.guild, embed);
    }
});


// ==========================================
// 3. MANAGEMENT MEMBERS & MODERASI
// ==========================================

// Member Masuk Server
client.on('guildMemberAdd', (member) => {
    const embed = new EmbedBuilder()
        .setTitle('📥 Member Masuk')
        .setColor('#2ecc71')
        .setDescription(`${member} (${member.user.tag}) telah bergabung ke dalam server.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields({ name: 'ID Pengguna', value: member.id })
        .setTimestamp();
    sendLog(member.guild, embed);
});

// Member Keluar / Ditendang (Kick)
client.on('guildMemberRemove', async (member) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();
    
    let deskripsi = `${member.user.tag} telah meninggalkan server secara mandiri.`;
    let judul = '📤 Member Keluar';
    let warna = '#95a5a6';

    if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp < 5000)) {
        judul = '🥾 Member Ditendang (Kick)';
        warna = '#e67e22';
        deskripsi = `${member} (${member.user.tag}) telah ditendang oleh **${kickLog.executor.tag}**.\n**Alasan:** ${kickLog.reason || 'Tidak ada alasan'}`;
    }

    const embed = new EmbedBuilder().setTitle(judul).setColor(warna).setDescription(deskripsi).setTimestamp();
    sendLog(member.guild, embed);
});

// Member Banned
client.on('guildBanAdd', async (ban) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const banLog = fetchedLogs.entries.first();
    const executor = banLog ? banLog.executor.tag : 'Tidak diketahui';
    const alasan = banLog ? banLog.reason : 'Tidak ada alasan';

    const embed = new EmbedBuilder()
        .setTitle('🔨 Member Di-Ban')
        .setColor('#d32f2f')
        .setDescription(`${ban.user} (${ban.user.tag}) telah dibanned secara permanen.`)
        .addFields(
            { name: 'Eksekutor', value: executor, inline: true },
            { name: 'Alasan', value: alasan, inline: true }
        )
        .setTimestamp();
    sendLog(ban.guild, embed);
});

// Member Unbanned
client.on('guildBanRemove', async (ban) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
    const logEntry = fetchedLogs.entries.first();
    const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

    const embed = new EmbedBuilder()
        .setTitle('🔓 Blokir Dicabut (Unban)')
        .setColor('#2ecc71')
        .setDescription(`${ban.user.tag} telah di-unban oleh **${executor}**.`)
        .setTimestamp();
    sendLog(ban.guild, embed);
});

// Update Member (Nickname Lokal, Roles, Timeout)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.partial) await oldMember.fetch();

    const embed = new EmbedBuilder().setTimestamp().setColor('#3498db');
    let adaPerubahan = false;

    // Log Ganti Nickname Server
    if (oldMember.nickname !== newMember.nickname) {
        adaPerubahan = true;
        const namaLama = oldMember.nickname || oldMember.user.username;
        const namaBaru = newMember.nickname || newMember.user.username;

        embed.setTitle('🏷️ Perubahan Nama Panggilan Server')
            .setDescription(`Nama panggilan server ${newMember} telah diubah.`)
            .addFields(
                { name: 'Semula', value: `\`${namaLama}\``, inline: true },
                { name: 'Menjadi', value: `\`${namaBaru}\``, inline: true }
            );
    }

    // Log Timeout (Mute Sistem Discord)
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        if (newMember.communicationDisabledUntilTimestamp) {
            adaPerubahan = true;
            const waktuSelesai = new Date(newMember.communicationDisabledUntilTimestamp).toLocaleString('id-ID');
            embed.setTitle('🤫 Member Di-Timeout')
                .setColor('#e67e22')
                .setDescription(`${newMember} (${newMember.user.tag}) telah dibungkam (Timeout) sampai **${waktuSelesai}**.`);
        } else {
            adaPerubahan = true;
            embed.setTitle('🔊 Timeout Berakhir')
                .setColor('#2ecc71')
                .setDescription(`Masa hukuman Timeout ${newMember} telah dicabut atau selesai.`);
        }
    }

    // Log Pemberian / Pencabutan Role
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    if (oldRoles.size !== newRoles.size) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
        const roleLog = fetchedLogs.entries.first();
        const executor = roleLog ? roleLog.executor : 'Tidak diketahui';

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

        if (addedRoles.size > 0) {
            adaPerubahan = true;
            embed.setTitle('🛡️ Role Diberikan')
                .setColor('#2ecc71')
                .setDescription(`Role baru telah ditambahkan ke ${newMember}`)
                .addFields(
                    { name: 'Role yang Diberi', value: addedRoles.map(r => `${r}`).join(', ') },
                    { name: 'Diberikan Oleh', value: `${executor}` }
                );
        }

        if (removedRoles.size > 0) {
            adaPerubahan = true;
            embed.setTitle('❌ Role Dicabut')
                .setColor('#e74c3c')
                .setDescription(`Role telah dicabut dari ${newMember}`)
                .addFields(
                    { name: 'Role yang Dicabut', value: removedRoles.map(r => `${r}`).join(', ') },
                    { name: 'Dicabut Oleh', value: `${executor}` }
                );
        }
    }

    if (adaPerubahan) sendLog(newMember.guild, embed);
});

// Log Perubahan Nama Akun Global Utama Discord
client.on('userUpdate', async (oldUser, newUser) => {
    if (oldUser.username !== newUser.username || oldUser.displayName !== newUser.displayName) {
        const embed = new EmbedBuilder()
            .setTitle('🌍 Perubahan Profil Akun Global')
            .setColor('#9b59b6')
            .setDescription(`User ${newUser} telah memperbarui informasi akun globalnya.`)
            .setTimestamp();

        if (oldUser.username !== newUser.username) {
            embed.addFields(
                { name: 'Username Lama', value: `\`@${oldUser.username}\``, inline: true },
                { name: 'Username Baru', value: `\`@${newUser.username}\``, inline: true }
            );
        }

        if (oldUser.displayName !== newUser.displayName) {
            embed.addFields(
                { name: 'Display Name Lama', value: `\`${oldUser.displayName}\``, inline: true },
                { name: 'Display Name Baru', value: `\`${newUser.displayName}\``, inline: true }
            );
        }

        client.guilds.cache.forEach(guild => {
            if (guild.members.cache.has(newUser.id)) {
                sendLog(guild, embed);
            }
        });
    }
});


// ==========================================
// 4. MANAGEMENT ROLES (HAK AKSES / WARNA ROLE)
// ==========================================

client.on('roleCreate', async (role) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
    const logEntry = fetchedLogs.entries.first();
    const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

    const embed = new EmbedBuilder()
        .setTitle('➕ Role Baru Dibuat')
        .setColor('#2ecc71')
        .setDescription(`Role **${role.name}** telah dibuat oleh **${executor}**.`)
        .setTimestamp();
    sendLog(role.guild, embed);
});

client.on('roleDelete', async (role) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
    const logEntry = fetchedLogs.entries.first();
    const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

    const embed = new EmbedBuilder()
        .setTitle('🔥 Role Dihapus')
        .setColor('#e74c3c')
        .setDescription(`Role **${role.name}** telah dihapus oleh **${executor}**.`)
        .setTimestamp();
    sendLog(role.guild, embed);
});

// Log Perubahan Izin Global (Permissions) pada Role
client.on('roleUpdate', async (oldRole, newRole) => {
    if (!oldRole.guild) return;
    
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await oldRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

        const oldPerms = oldRole.permissions.toArray();
        const newPerms = newRole.permissions.toArray();
        
        const permsDitambahkan = newPerms.filter(p => !oldPerms.includes(p));
        const permsDihapus = oldPerms.filter(p => !oldPerms.includes(p));

        const embed = new EmbedBuilder()
            .setTitle('🛠️ Izin (Permission) Global Role Diubah')
            .setColor('#9b59b6')
            .setDescription(`Hak akses global untuk role ${newRole} telah diperbarui oleh **${executor}**.`)
            .setTimestamp();

        if (permsDitambahkan.length > 0) {
            embed.addFields({ name: '🟢 Izin Ditambahkan', value: `\`${permsDitambahkan.join(', ')}\`` });
        }
        if (permsDihapus.length > 0) {
            embed.addFields({ name: '🔴 Izin Dicabut/Dihapus', value: `\`${permsDihapus.join(', ')}\`` });
        }

        sendLog(newRole.guild, embed);
    }
});


// ==========================================
// 5. MANAGEMENT VOICE (AKTIVITAS SUARA)
// ==========================================

client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    const embed = new EmbedBuilder().setTimestamp();

    // 1. Join Room Voice
    if (!oldState.channelId && newState.channelId) {
        embed.setTitle('🎙️ Masuk Voice Channel')
            .setColor('#2ecc71')
            .setDescription(`${member} (${member.user.tag}) telah masuk ke voice channel <#${newState.channelId}>.`);
        sendLog(newState.guild, embed);
    }
    
    // 2. Keluar Room Voice (Leave)
    else if (oldState.channelId && !newState.channelId) {
        embed.setTitle('🔇 Keluar Voice Channel')
            .setColor('#e74c3c')
            .setDescription(`${member} (${member.user.tag}) telah meninggalkan voice channel <#${oldState.channelId}>.`);
        sendLog(oldState.guild, embed);
    }
    
    // 3. Pindah Room Voice (Move)
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        embed.setTitle('🔀 Pindah Voice Channel')
            .setColor('#34495e')
            .setDescription(`${member} (${member.user.tag}) berpindah ruangan voice.`)
            .addFields(
                { name: 'Dari Room', value: `<#${oldState.channelId}>`, inline: true },
                { name: 'Ke Room', value: `<#${newState.channelId}>`, inline: true }
            );
        sendLog(newState.guild, embed);
    }
});

// Login otomatis memanggil variabel process.env
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);
