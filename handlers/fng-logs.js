const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType
} = require('discord.js');

// Tempat penyimpanan sementara data log per user agar tidak tertukar
const activeSessions = new Map();

// ID Channel tujuan LOG di sini (Ganti dengan ID channel asli Anda)
const LOG_CHANNEL_ID = '1515008339904434427'; 

// Fungsi 1: Menangani perintah teks !setup-png-logs
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

// Fungsi 2: Menangani tombol, dropdown, dan modal submit
async function handleFngLogsInteraction(interaction, client) {
    // --- LANGKAH 1: Klik Tombol "Buat Faction Log" -> Muncul Dropdown Role ---
    if (interaction.isButton() && interaction.customId === 'start_faction_log') {
        const roles = interaction.guild.roles.cache
            .filter(r => r.name !== '@everyone' && !r.managed)
            .first(25); 

        if (roles.length === 0) {
            return interaction.reply({ content: 'Tidak ada role faksi yang ditemukan di server ini.', ephemeral: true });
        }

        const roleMenu = new StringSelectMenuBuilder()
            .setCustomId('select_faction_role')
            .setPlaceholder('Pilih Faction / Role...')
            .addOptions(roles.map(role => ({
                label: role.name,
                value: role.id
            })));

        const row = new ActionRowBuilder().addComponents(roleMenu);
        activeSessions.set(interaction.user.id, { faction: '', logs: '', reason: '', file: '' });

        await interaction.reply({ content: 'Langkah 1: Silakan pilih **Faction** Anda:', components: [row], ephemeral: true });
    }

    // --- LANGKAH 2: Pilih Faction -> Muncul Dropdown Strike ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_faction_role') {
        const userId = interaction.user.id;
        if (!activeSessions.has(userId)) return interaction.reply({ content: 'Sesi kedaluwarsa. Silakan klik tombol lagi.', ephemeral: true });

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

    // --- LANGKAH 3: Pilih Strike -> Muncul Formulir Teks (Modal) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_strike_level') {
        const userId = interaction.user.id;
        if (!activeSessions.has(userId)) return interaction.reply({ content: 'Sesi kedaluwarsa.', ephemeral: true });

        activeSessions.get(userId).logs = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId('faction_log_modal')
            .setTitle('Detail Faction Log');

        const reasonInput = new TextInputBuilder()
            .setCustomId('modal_reason')
            .setLabel('Reason / Alasan')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Masukkan alasan di sini...');

        const fileInput = new TextInputBuilder()
            .setCustomId('modal_file')
            .setLabel('Link File / Gambar (Opsional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Paste (Ctrl+V) link gambar di sini jika ada...');

        modal.addComponents(
            new ActionRowBuilder().addComponents(reasonInput),
            new ActionRowBuilder().addComponents(fileInput)
        );

        await interaction.showModal(modal);
    }

    // --- LANGKAH 4: Submit Modal -> Kirim Hasil Akhir ke Channel Target ---
    if (interaction.isModalSubmit() && interaction.customId === 'faction_log_modal') {
        const userId = interaction.user.id;
        const session = activeSessions.get(userId);

        if (!session) return interaction.reply({ content: 'Terjadi kesalahan sistem, silakan coba lagi.', ephemeral: true });

        session.reason = interaction.fields.getTextInputValue('modal_reason');
        session.file = interaction.fields.getTextInputValue('modal_file') || 'Tidak ada file';

        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Gagal mengirim log. Channel target tidak ditemukan atau bukan channel teks.', ephemeral: true });
        }

        let outputMessage = `**Faction Logs**\n\n` +
                            `Faction : ${session.faction}\n\n` +
                            `Logs : ${session.logs}\n\n` +
                            `Reason : ${session.reason}\n\n`;
        
        if (session.file !== 'Tidak ada file') {
            outputMessage += `File : ${session.file}\n\n`;
        }

        outputMessage += `@everyone`;

        try {
            await logChannel.send({ content: outputMessage });
            activeSessions.delete(userId);
            await interaction.reply({ content: '✅ Faction Log berhasil dikirim ke channel log!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat mengirim log ke channel.', ephemeral: true });
        }
    }
}

// Ekspor kedua fungsi agar bisa digunakan di index.js
module.exports = { handleFngLogsSetup, handleFngLogsInteraction };
