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

    // Cek permission role
    if (!interaction.member.roles.cache.has(allowedRoleId)) {
        return interaction.reply({
            content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
            ephemeral: true
        });
    }

    // Ambil channel pilihan sebelum membuka pop-up modal
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // 1. BUAT JENDELA POP-UP (MODAL)
    const modal = new ModalBuilder()
        .setCustomId(`say_modal_${targetChannel.id}`)
        .setTitle('Kirim Pesan Manual');

    // 2. BUAT KOLOM INPUT TEKS PARAGRAF (BISA ENTER KEBAWAH)
    const messageInput = new TextInputBuilder()
        .setCustomId('say_message_input')
        .setLabel('Tulis Pesan Anda')
        .setStyle(TextInputStyle.Paragraph) // Paragraph membuat kotak teks besar & mendukung enter
        .setPlaceholder('Tulis pesan di sini...\nBisa tekan enter langsung ke bawah tanpa \\n')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(firstActionRow);

    // 3. TAMPILKAN POP-UP KE LAYAR USER
    await interaction.showModal(modal);

    // 4. TUNGGU DAN PROSES RESPONS INPUT DARI POP-UP TERSEBUT
    try {
        const submitted = await interaction.awaitModalSubmit({
            time: 60000, // Batas waktu pengisian 1 menit
            filter: i => i.customId === `say_modal_${targetChannel.id}`
        });

        const message = submitted.fields.getTextInputValue('say_message_input');

        // Beri tanda pemrosesan sukses pada jendela pop-up
        await submitted.deferReply({ ephemeral: true });

        // Kirim teks murni hasil enter ke channel tujuan
        await targetChannel.send({ content: message });

        // Kirim Log ke Log Channel menggunakan Embed
        const logChannel = interaction.client.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📢 Command /say Digunakan')
                .setColor(0xffcc00)
                .addFields(
                    { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Target Channel', value: `<#${targetChannel.id}>`, inline: true },
                    { name: 'Pesan', value: message.substring(0, 1024) || '-' }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }

        return submitted.editReply({
            content: `✅ Pesan paragraf berhasil dikirim ke <#${targetChannel.id}>!`
        });

    } catch (err) {
        // Jika eror karena waktu habis atau kegagalan pengiriman
        console.error(err);
    }
}

module.exports = { handleSay };
