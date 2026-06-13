require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    REST, 
    Routes, 
    ChannelType, 
    OverwriteType 
} = require('discord.js');

// Konfigurasi Token & ID (Sesuaikan dengan setup Anda)
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID // Pastikan ini ada di .env Anda
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Fungsi pembantu kirim log agar kode tidak error saat dipanggil
function sendLog(guild, embed) {
    // Ganti ID_KANAL_LOG dengan ID kanal log asli di server Anda
    const logChannel = guild.channels.cache.get('ID_KANAL_LOG');
    if (logChannel) {
        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
}

// --- REGISTER SLASH COMMANDS ---
// --- REGISTER SLASH COMMANDS ---
const commands = [

                {
        name: 'say',
        description: 'Kirim pesan manual dengan banyak tag sekaligus',
        options: [
            { 
                name: 'channel', 
                type: 7, 
                description: 'Pilih channel tujuan (kosongkan jika ingin di channel saat ini)', 
                required: false 
            },
            { 
                name: 'tag-roles', 
                type: 3, // Type 3 adalah STRING teks biasa
                description: 'Ketik nama-nama role yang ingin ditag (Pisahkan dengan koma, contoh: Admin, Warga, Staf)', 
                required: false 
            },
            { 
                name: 'tag-users', 
                type: 3, // Type 3 adalah STRING teks biasa
                description: 'Ketik nama/username orang yang ingin ditag (Pisahkan dengan koma, contoh: bram, udin)', 
                required: false 
            }
        ],
    },








    {
        name: 'addrole',
        description: 'Memberikan role kepada seorang member',
        options: [
            { name: 'user', type: 6, description: 'Member yang akan diberi role', required: true },
            { name: 'role', type: 9, description: 'Role yang akan diberikan', required: true },
        ],
    },
    {
        name: 'removerole',
        description: 'Menghapus role dari seorang member',
        options: [
            { name: 'user', type: 6, description: 'Member yang akan dihapus rolenya', required: true },
            { name: 'role', type: 9, description: 'Role yang akan dihapus', required: true },
        ],
    },
    {
        name: 'createrole',
        description: 'Membuat role baru di server dengan kustomisasi warna',
        options: [
            { name: 'name', type: 3, description: 'Nama role baru yang ingin dibuat', required: true },
            { name: 'color', type: 3, description: 'Warna role dalam kode Hex (Contoh: #ff0000 untuk Merah)', required: false }
        ],
    },
    {
        name: 'deleterole',
        description: 'Menghapus sebuah role dari server',
        options: [
            { name: 'role', type: 9, description: 'Role yang ingin dihapus', required: true }
        ],
    },

    {
        name: 'addchannel',
        description: 'Membuat kanal baru dengan kustomisasi kategori dan izin role',
        options: [
            { name: 'name', type: 3, description: 'Nama kanal baru', required: true },
            { name: 'category', type: 7, description: 'Kategori tempat menyimpan kanal', channel_types: [ChannelType.GuildCategory], required: false },
            { name: 'role1', type: 9, description: 'Role pertama yang diberi izin khusus', required: false },
            { name: 'permission1', type: 3, description: 'Izin untuk role pertama', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
            { name: 'role2', type: 9, description: 'Role kedua yang diberi izin khusus', required: false },
            { name: 'permission2', type: 3, description: 'Izin untuk role kedua', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
            { name: 'role3', type: 9, description: 'Role ketiga yang diberi izin khusus', required: false },
            { name: 'permission3', type: 3, description: 'Izin untuk role ketiga', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
        ],
    },
    {
        name: 'editchannel',
        description: 'Mengubah nama atau kategori kanal yang sudah ada',
        options: [
            { name: 'channel', type: 7, description: 'Kanal yang ingin diubah', channel_types: [ChannelType.GuildText, ChannelType.GuildVoice], required: true },
            { name: 'new-name', type: 3, description: 'Nama baru untuk kanal', required: false },
            { name: 'new-category', type: 7, description: 'Pindahkan ke kategori baru', channel_types: [ChannelType.GuildCategory], required: false },
        ],
    },
    {
        name: 'deletechannel',
        description: 'Menghapus sebuah kanal dari server',
        options: [
            { name: 'channel', type: 7, description: 'Kanal yang ingin dihapus', channel_types: [ChannelType.GuildText, ChannelType.GuildVoice], required: true },
            { name: 'reason', type: 3, description: 'Alasan penghapusan kanal', required: false },
        ],
    },
    // Di dalam array commands = [ ... ] pada file index.js Anda:
    {
        name: 'add-fng',
        description: 'Membuat FNG baru dengan role otomatis + 2 channel (about & activity)',
        options: [
            { name: 'name', type: 3, description: 'Nama FNG (misal: ❤ Titik Kumpul)', required: true },
            { name: 'category_about', type: 7, description: 'Pilih kategori untuk channel about', channel_types: [ChannelType.GuildCategory], required: true },
            { name: 'category_act', type: 7, description: 'Pilih kategori untuk channel activity', channel_types: [ChannelType.GuildCategory], required: true },
            
            // Role 1 & Permission 1
            { name: 'role1', type: 9, description: 'Role pertama yang diberi izin khusus', required: false },
            { name: 'permission1', type: 3, description: 'Izin untuk role pertama', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
            
            // Role 2 & Permission 2
            { name: 'role2', type: 9, description: 'Role kedua yang diberi izin khusus', required: false },
            { name: 'permission2', type: 3, description: 'Izin untuk role kedua', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
        ],
    },

];

// Deploy slash commands ke Discord API
const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
(async () => {
    try {
        // PENTING: Pastikan CONFIG.CLIENT_ID tidak typo dan nilainya ada di config Anda!
        if (!CONFIG.CLIENT_ID) {
            console.error("❌ ERROR: CONFIG.CLIENT_ID tidak ditemukan / undefined!");
            return;
        }

        console.log('Memulai penyegaran aplikasi (/) commands...');
        await rest.put(
            Routes.applicationCommands(CONFIG.CLIENT_ID),
            { body: commands },
        );
        console.log('Berhasil memuat ulang aplikasi (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// --- IMPORT HANDLER FILE TERPISAH ---
const { handleAddFng } = require('./add-fng');
const { handleSay } = require('./say'); // 👈 BARU: Menghubungkan file say.js

// Event: Interaction (Slash Commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        // 👈 BARU: Memicu fungsi dari file say.js saat command dijalankan
        if (interaction.commandName === 'say') {
            return await handleSay(interaction);
        }

        if (interaction.commandName === 'add-fng') {
            return await handleAddFng(interaction);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: `❌ Error: ${error.message}` });
            } else {
                await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
            }
        } catch (e) {
            console.error('Gagal mengirim error reply:', e);
        }
    }
});

client.login(CONFIG.TOKEN);

// Mengubah 'ready' menjadi 'clientReady' untuk mengatasi Deprecation Warning
client.once('clientReady', (readyClient) => {
    console.log(`🤖 Bot siap! Login sebagai ${readyClient.user.tag}`);
});

client.login(CONFIG.TOKEN);
