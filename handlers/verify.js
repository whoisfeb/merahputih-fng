const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    EmbedBuilder,      // Ditambahkan untuk membuat tampilan pesan
    ButtonBuilder,     // Ditambahkan untuk membuat komponen tombol
    ButtonStyle,       // Ditambahkan untuk mewarnai tombol
    PermissionFlagsBits // Ditambahkan untuk validasi izin Admin
} = require('discord.js');

module.exports = (client) => {
    // KONFIGURASI: Menggunakan ID Role Citizen Anda
    const CITIZEN_ROLE_ID = '1499605520603025512'; 
    const PREFIX = '!'; // Prefix untuk perintah teks

    // 1. HANDLER PERINTAH TEKS (!setup-verify)
    client.on('messageCreate', async (message) => {
        // Abaikan jika pesan dari bot atau tidak diawali dengan prefix
        if (message.author.bot || !message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/+/);
        const command = args.shift().toLowerCase();

        if (command === 'setup-verify') {
            // Validasi apakah pengguna adalah Administrator
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Anda tidak memiliki izin untuk menggunakan perintah ini.')
                    .then(msg => setTimeout(() => msg.delete().catch(() => null), 5000));
            }

            // Hapus pesan pemicu !setup-verify agar channel tetap rapi
            await message.delete().catch(() => null);

            // Membuat pesan Embed verifikasi
            const embed = new EmbedBuilder()
                .setTitle('🔐 Verifikasi Server')
                .setDescription('Silakan klik tombol di bawah untuk mengisi formulir nama dan masuk ke server.')
                .setColor('#2f3136')
                .setFooter({ text: 'Pastikan mengisi dengan nama asli Anda.' });

            // Membuat tombol "Verify Me"
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_verify')
                    .setLabel('Verify Me')
                    .setStyle(ButtonStyle.Success)
            );

            // Kirim pesan ke channel tempat perintah diketik
            await message.channel.send({ embeds: [embed], components: [row] });
        }
    });

    // 2. HANDLER INTERAKSI (Klik Tombol & Kirim Form)
    client.on('interactionCreate', async (interaction) => {
        
        // JIKA USER KLIK TOMBOL VERIFY (Memunculkan Popup Form)
        if (interaction.isButton() && interaction.customId === 'btn_verify') {
            
            const modal = new ModalBuilder()
                .setCustomId('modal_verify')
                .setTitle('Formulir Verifikasi Warga');

            const firstNameInput = new TextInputBuilder()
                .setCustomId('first_name')
                .setLabel('Nama Depan')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Masukkan nama depan Anda...')
                .setMinLength(2)
                .setMaxLength(20)
                .setRequired(true);

            const lastNameInput = new TextInputBuilder()
                .setCustomId('last_name')
                .setLabel('Nama Belakang')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Masukkan nama belakang Anda...')
                .setMinLength(2)
                .setMaxLength(20)
                .setRequired(true);

            // Setiap komponen teks input wajib dibungkus ActionRow terpisah
            const firstRow = new ActionRowBuilder().addComponents(firstNameInput);
            const secondRow = new ActionRowBuilder().addComponents(lastNameInput);

            modal.addComponents(firstRow, secondRow);

            // Munculkan popup ke layar user
            return await interaction.showModal(modal);
        }

        // JIKA USER SUBMIT FORMULIR (Memproses Hasil Form)
        if (interaction.isModalSubmit() && interaction.customId === 'modal_verify') {
            
            // Ambil dan bersihkan spasi dari input user
            const firstName = interaction.fields.getTextInputValue('first_name').trim();
            const lastName = interaction.fields.getTextInputValue('last_name').trim();
            const fullName = `${firstName} ${lastName}`;

            const member = interaction.member;
            const guild = interaction.guild;

            // Validasi keberadaan role di dalam server
            const role = guild.roles.cache.get(CITIZEN_ROLE_ID);
            if (!role) {
                return interaction.reply({ 
                    content: '❌ Gagal verifikasi: Role Citizen tidak ditemukan di server ini. Hubungi Admin.', 
                    ephemeral: true 
                });
            }

            try {
                // Beri balasan penahan agar interaksi tidak kedaluwarsa (timeout)
                await interaction.deferReply({ ephemeral: true });

                // Mengubah nama panggilan pengguna di server
                await member.setNickname(fullName);

                // Memberikan role citizen
                await member.roles.add(role);

                // Berikan pesan sukses yang hanya bisa dilihat oleh user tersebut
                await interaction.editReply({ 
                    content: `✅ Verifikasi sukses! Nama Anda diubah menjadi **${fullName}** dan mendapatkan role **${role.name}**.` 
                });

            } catch (error) {
                console.error('Error saat verifikasi:', error);
                
                // Pesan error jika bot tidak punya kuasa merubah nama (ex: ke Owner server) atau hirarki role salah
                await interaction.editReply({ 
                    content: '❌ Terjadi kesalahan. Pastikan posisi pangkat Role Bot berada di paling atas daripada Role Citizen pada pengaturan server, dan Anda bukan Pemilik Server (Owner).', 
                    ephemeral: true 
                });
            }
        }
    });
};
