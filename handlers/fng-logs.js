const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    RoleSelectMenuBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType
} = require('discord.js');

// Tempat penyimpanan sementara data log per user agar tidak tertukar
const activeSessions = new Map();

// ID Channel tujuan LOG di sini
const LOG_CHANNEL_ID = '1515008339904434427'; 

// Fungsi 1: Menangani perintah teks !setup-fng-logs
async function handleFngLogsSetup(message) {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!setup-fng-logs') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_faction_log')
                .setLabel('Buat Faction Log')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await message.channel.send({
            content: 'Klik tombol di bawah ini untuk mulai mengisi **Faction Log**.',
            components: [row]
        });
    }
}

// Fungsi 2: Menangani tombol, dropdown, dan formulir akhir
async function handleFngLogsInteraction(interaction, client) {
    const userId = interaction.user.id;

    // --- LANGKAH 1: Klik Tombol "Buat Faction Log" -> Muncul Dropdown Role yang Bisa Diketik ---
    if (interaction.isButton() && interaction.customId === 'start_faction_log') {
        // Menggunakan RoleSelectMenuBuilder agar bisa melakukan pencarian dengan mengetik
        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId('select_faction_role')
            .setPlaceholder('Ketik atau pilih Faction / Role...');

        const row = new ActionRowBuilder().addComponents(roleMenu);
        activeSessions.set(userId, { faction: '', logs: '', reason: '', fileUrl: null });

        await interaction.reply({ content: 'Langkah 1: Silakan ketik atau pilih **Faction** Anda:', components: [row], ephemeral: true });
    }

    // --- LANGKAH 2: Pilih Faction -> Muncul Dropdown Strike ---
    if (interaction.isRoleSelectMenu() && interaction.customId === 'select_faction_role') {
        if (!activeSessions.has(userId)) return interaction.reply({ content: 'Sesi kedaluwarsa. Silakan klik tombol lagi.', ephemeral: true });

        // Menyimpan mention role faksi yang dipilih
        activeSessions.get(userId).faction = `<@&${interaction.values[0]}>`;

        const strikeMenu = new StringSelectMenuBuilder()
            .setCustomId('select_strike_level')
            .setPlaceholder('Pilih tingkatan Logs / Strike...')
            .addOptions([
                { label: 'Strike +1', value: 'Strike +1' },
                { label: 'Strike +2', value: 'Strike +2' },
                { label: 'Strike +3', value: 'Strike +3' },
                { label: 'Strike -1', value: 'Strike -1' },
                { label: 'Strike -2', value: 'Strike -2' },
                { label: 'Strike -3', value: 'Strike -3' }
            ]);

        const row = new ActionRowBuilder().addComponents(strikeMenu);
        await interaction.update({ content: 'Langkah 2: Tentukan nilai **Logs / Strike**:', components: [row], ephemeral: true });
    }

    // --- LANGKAH 3: Pilih Strike -> Muncul Formulir Input Teks Alasan ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_strike_level') {
        if (!activeSessions.has(userId)) return interaction.reply({ content: 'Sesi kedaluwarsa.', ephemeral: true });

        activeSessions.get(userId).logs = interaction.values[0];

        // Membuka modal khusus untuk alasan terlebih dahulu karena Discord memisahkan input teks besar dan lampiran file berkas
        const modal = new ModalBuilder()
            .setCustomId('faction_reason_modal')
            .setTitle('Detail Alasan Faction Log');

        const reasonInput = new TextInputBuilder()
            .setCustomId('modal_reason')
            .setLabel('Reason / Alasan')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Masukkan alasan penjatuhan tindakan di sini...');

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }

    // --- LANGKAH 4: Submit Alasan -> Tampilkan Tombol Unggah Berkas Gambar ---
    if (interaction.isModalSubmit() && interaction.customId === 'faction_reason_modal') {
        if (!activeSessions.has(userId)) return interaction.reply({ content: 'Sesi kedaluwarsa.', ephemeral: true });

        activeSessions.get(userId).reason = interaction.fields.getTextInputValue('modal_reason');

        // Mengirim instruksi akhir beserta tombol aksi untuk mengirim log
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('submit_final_log')
                .setLabel('Kirim Log Sekarang (Tanpa Gambar)')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ 
            content: '📌 **Langkah Terakhir (Opsional):**\nJika Anda ingin menyertakan gambar berkas bukti, silakan jalankan perintah `/say` atau upload gambar langsung di channel chat biasa, lalu tempel tautannya ke formulir sebelumnya.\n\nJika tidak ada gambar bukti yang ingin dilampirkan, silakan klik tombol di bawah ini untuk mengirim hasil akhir.', 
            components: [row], 
            ephemeral: true 
        });
    }

    // --- LANGKAH 5: Klik Tombol Kirim Final (Tanpa Gambar) ---
    if (interaction.isButton() && interaction.customId === 'submit_final_log') {
        const session = activeSessions.get(userId);
        if (!session) return interaction.reply({ content: 'Terjadi kesalahan sistem atau sesi Anda telah kedaluwarsa.', ephemeral: true });

        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Gagal mengirim log. Channel target tidak ditemukan atau dikonfigurasi salah.', ephemeral: true });
        }

        let outputMessage = `**Faction Logs**\n\n` +
                            `Faction : ${session.faction}\n\n` +
                            `Logs : ${session.logs}\n\n` +
                            `Reason : ${session.reason}\n\n` +
                            `@everyone`;

        try {
            await logChannel.send({ content: outputMessage });
            activeSessions.delete(userId);
            await interaction.update({ content: '✅ Faction Log berhasil dikirim ke channel tujuan!', components: [], ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat mengirim pesan log ke channel server.', ephemeral: true });
        }
    }
}

module.exports = { handleFngLogsSetup, handleFngLogsInteraction };
