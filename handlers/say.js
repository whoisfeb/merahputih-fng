const { EmbedBuilder } = require('discord.js');

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

    // 1. Ambil input string mentah dari Discord
    const rawMessage = interaction.options.getString('message');
    
    // 2. Mengonversi ketikan \n manual menjadi enter ke bawah
    const message = rawMessage ? rawMessage.split('\\n').join('\n') : '';

    // 3. BARU: Mengambil file pilihan (opsional)
    const attachment = interaction.options.getAttachment('file');

    // Mengambil channel pilihan jika diisi, jika kosong gunakan channel saat ini
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // Beri tahu Discord bahwa bot sedang memproses
    await interaction.deferReply({ ephemeral: true });

    try {
        // Siapkan payload data yang akan dikirim
        const payload = {};
        if (message) payload.content = message;
        if (attachment) payload.files = [attachment]; // Memasukkan file ke dalam array files

        // Validasi: Harus ada teks atau file yang dikirim
        if (!message && !attachment) {
            return interaction.editReply({
                content: '❌ Kamu harus memasukkan teks atau mengunggah file!'
            });
        }

        // Kirim pesan dan file ke target channel yang dipilih
        await targetChannel.send(payload);

        // Kirim Log ke Log Channel menggunakan Embed
        const logChannel = interaction.client.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📢 Command /say Digunakan')
                .setColor(0xffcc00)
                .addFields(
                    { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Target Channel', value: `<#${targetChannel.id}>`, inline: true },
                    { name: 'Pesan', value: message.substring(0, 1024) || '(Hanya File)' },
                    // BARU: Menampilkan nama file di log jika ada
                    { name: 'File Lampiran', value: attachment ? `[${attachment.name}](${attachment.url})` : '-' }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }

        return interaction.editReply({
            content: `✅ Pesan berhasil dikirim ke <#${targetChannel.id}>!`
        });

    } catch (err) {
        console.error(err);
        return interaction.editReply({
            content: '❌ Gagal mengirim pesan. Pastikan bot memiliki izin melihat & mengirim pesan di channel tersebut.'
        });
    }
}

module.exports = { handleSay };
