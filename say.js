const { EmbedBuilder } = require('discord.js');

async function handleSay(interaction) {
    const allowedRoleId = "1480248506655703101";
    const logChannelId = "1483432966163136584";

    // Cek permission role
    if (!interaction.member.roles.cache.has(allowedRoleId)) {
        return interaction.reply({
            content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
            ephemeral: true
        });
    }

    const message = interaction.options.getString('message');

    // Beri tahu Discord bahwa bot sedang memproses
    await interaction.deferReply({ ephemeral: true });

    // Kirim pesan teks polos ke channel tempat command diketik
    await interaction.channel.send({ content: message });

    // Kirim Log ke Log Channel menggunakan Embed
    const logChannel = interaction.client.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setTitle('📢 Command /say Digunakan')
            .setColor(0xffcc00)
            .addFields(
                { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                { name: 'Pesan', value: message }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }

    return interaction.editReply({
        content: '✅ Pesan berhasil dikirim!'
    });
}

// Export fungsi agar bisa di-require di index.js
module.exports = { handleSay };
