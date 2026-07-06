require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    REST, 
    Routes, 
    ChannelType, 
    OverwriteType,
    Partials // 1. TAMBAHKAN Partials di sini
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
        GatewayIntentBits.GuildMembers, // 2. TAMBAHKAN koma di sini (Perbaikan Error)
        GatewayIntentBits.DirectMessages // Wajib untuk fitur DM
    ],
    // 3. TAMBAHKAN PARTIALS INI: Tanpa ini, bot tidak akan merespon pesan di DM
    partials: [
        Partials.Channel, 
        Partials.Message
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
// --- REGISTER SLASH COMMANDS ---
// --- REGISTER SLASH COMMANDS ---
const commands = [

    {
        name: 'say',
        description: 'Kirim pesan manual (khusus role tertentu)',
        options: [
            { 
                name: 'message', 
                type: 3, // String
                description: 'gunakan \\n untuk membuat baris baru contoh baris pertama\\nbaris kedua', 
                required: false // Diubah ke false agar user bisa kirim file saja tanpa teks
            },
            { 
                name: 'channel', 
                type: 7, // Channel
                description: 'Pilih channel tujuan (kosongkan jika ingin di channel saat ini)', 
                required: false 
            },
            {
                name: 'file',
                type: 11, // 11 adalah tipe data untuk ATTACHMENT (File)
                description: 'Pilih file yang ingin dikirim (opsional)',
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
    {
        name: 'add-fng',
        description: 'Membuat FNG baru dengan role otomatis + 2 channel (about & activity)',
        options: [
            { name: 'name', type: 3, description: 'Nama FNG (misal: ❤ Titik Kumpul)', required: true },
            { name: 'category_about', type: 7, description: 'Pilih kategori untuk channel about', channel_types: [ChannelType.GuildCategory], required: true },
            { name: 'category_act', type: 7, description: 'Pilih kategori untuk channel activity', channel_types: [ChannelType.GuildCategory], required: true },
            
            // Opsi Tambahan Baru: Warna Role (Hex Code)
            { name: 'color', type: 3, description: 'Masukkan kode warna HEX untuk Role (Contoh: #ff0000 untuk merah, kosongkan = hijau)', required: false },

            // Role 1 & Permission 1
            { name: 'role1', type: 9, description: 'Role pertama yang diberi izin khusus', required: false },
            { name: 'permission1', type: 3, description: 'Izin untuk role pertama', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
            
            // Role 2 & Permission 2
            { name: 'role2', type: 9, description: 'Role kedua yang diberi izin khusus', required: false },
            { name: 'permission2', type: 3, description: 'Izin untuk role kedua', required: false, choices: [{ name: 'Lihat Kanal (View)', value: 'VIEW' }, { name: 'Kirim Pesan (Send)', value: 'SEND' }, { name: 'Kanal Privat (Private)', value: 'PRIVATE' }] },
        ],
    },

    {
        name: 'setmember',
        description: 'Mengubah nama pengguna dengan format otomatis dan memberikan role sekaligus.',
        options: [
            { 
                name: 'user', 
                type: 6, 
                description: 'User yang akan diubah', 
                required: true 
            },
            { 
                name: 'nama_depan', 
                type: 3, 
                description: 'Nama depan (Akan otomatis diformat menjadi Nama Depan | ...)', 
                required: true 
            },
            { 
                name: 'role_wajib', 
                type: 8, 
                description: 'Role utama yang wajib diberikan', 
                required: true 
            },
            { 
                name: 'nickname', 
                type: 3, 
                description: 'Nickname kelanjutan (Opsional, jika kosong akan mengikuti nama depan)', 
                required: false 
            },
            { 
                name: 'role_opsional_1', 
                type: 8, 
                description: 'Role opsional 1', 
                required: false 
            },
            { 
                name: 'role_opsional_2', 
                type: 8, 
                description: 'Role opsional 2', 
                required: false 
            },
            { 
                name: 'role_opsional_3', 
                type: 8, 
                description: 'Role opsional 3', 
                required: false 
            },
            { 
                name: 'role_opsional_4', 
                type: 8, 
                description: 'Role opsional 4', 
                required: false 
            }
        ]
    },

    // 📷 BARU: Pendaftaran Objek /fng-logs di dalam REST Array
    {
        name: 'fng-logs',
        description: 'Membuat Faction/FNG Log baru beserta bukti gambar.',
        options: [
            {
                name: 'fng-role',
                type: 8, // 8 adalah tipe data untuk ROLE
                description: 'Pilih Faction / Role FNG yang dikenakan tindakan',
                required: true
            },
            {
                name: 'strike',
                type: 3, // 3 adalah tipe data untuk STRING
                description: 'Pilih tingkatan Logs / Strike',
                required: true,
                choices: [
                    { name: 'Strike +1', value: 'Strike +1' },
                    { name: 'Strike +2', value: 'Strike +2' },
                    { name: 'Strike +3', value: 'Strike +3' },
                    { name: 'Strike -1', value: 'Strike -1' },
                    { name: 'Strike -2', value: 'Strike -2' },
                    { name: 'Strike -3', value: 'Strike -3' }
                ]
            },
            {
                name: 'reason',
                type: 3, // 3 adalah tipe data untuk STRING
                description: 'Masukkan alasan penjatuhan tindakan',
                required: true
            },
            {
                name: 'gambar',
                type: 11, // 11 adalah tipe data untuk ATTACHMENT (Mendukung Ctrl+V)
                description: 'Upload / Paste berkas bukti gambar di sini (Opsional)',
                required: false
            }
        ]
    },

    {
        name: 'disbanned',
        description: 'Melakukan pembubaran resmi (disbanned) pada faction beserta log dan karantina.',
        options: [
            {
                name: 'faction',
                type: 8, // 8 adalah tipe data untuk ROLE
                description: 'Pilih Faction / Role FNG yang akan di-disbanned',
                required: true
            },
            {
                name: 'reason',
                type: 3, // 3 adalah tipe data untuk STRING
                description: 'Masukkan alasan pembubaran/disbanned faction',
                required: true
            },
            {
                name: 'time',
                type: 3, // 3 adalah tipe data untuk STRING
                description: 'Masukkan waktu karantina (Contoh: [30 Days] atau [Karantina])',
                required: true
            },
            {
                name: 'gambar',
                type: 11, // 11 adalah tipe data untuk ATTACHMENT (Mendukung Ctrl+V)
                description: 'Upload / Paste berkas bukti gambar di sini (Opsional)',
                required: false
            }
        ]
    }


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
const { handleAddFng } = require('./handlers/add-fng');
const { handleSay } = require('./handlers/say'); 
const { handleReminder } = require('./handlers/reminder');
const { handleWarning } = require('./handlers/warning'); 
const { handleSetMember } = require('./handlers/set-member'); 
const { handleVerify, handleVerifyCommand } = require('./handlers/verify'); 
const { handleBotRespon } = require('./handlers/botrespon'); 

// 📷 IMPORT HANDLER BARU (Disamakan menjadi handleFngLogs)
const { handleFngLogs } = require('./handlers/fng-logs'); 
// 🚫 IMPORT HANDLER DISBANNED
const { handleDisbanned } = require('./handlers/disbanned');



// Event: Interaction (Slash Commands, Buttons, Menus, Modals)
client.on('interactionCreate', async (interaction) => {
    
    // ❌ FUNGSI TOMBOL/MODAL LAMA DI SINI SUDAH DIHAPUS 
    // karena alur fng-logs sudah berubah total menjadi Slash Command (/)

    if (!interaction.isChatInputCommand()) return;

    try {
        if (interaction.commandName === 'say') {
            return await handleSay(interaction);
        }

        if (interaction.commandName === 'add-fng') {
            return await handleAddFng(interaction);
        }

        if (interaction.commandName === 'setmember') {
            await interaction.deferReply({ ephemeral: true });
            return await handleSetMember(interaction);
        }

        // 📷 JALANKAN SLASH COMMAND FNG-LOGS DI SINI
        if (interaction.commandName === 'fng-logs') {
            return await handleFngLogs(interaction);
        }

        // 🚫 JALANKAN SLASH COMMAND DISBANNED DI SINI
        if (interaction.commandName === 'disbanned') {
            return await handleDisbanned(interaction);
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



// Event Ready
client.once('ready', (readyClient) => {
    console.log(`🤖 Bot siap! Login sebagai ${readyClient.user.tag}`);

    handleReminder(readyClient);
    handleVerify(readyClient); 
    handleBotRespon(readyClient); 
});


// Event Message Create
client.on('messageCreate', async (message) => {
    try {
        await handleWarning(message);
        await handleVerifyCommand(message); 
        
        // ❌ handleFngLogsSetup(message) DI SINI SUDAH DIHAPUS
        // karena sistem chat manual !setup-fng-logs sudah tidak digunakan lagi
    } catch (error) {
        console.error('❌ Error pada Event messageCreate:', error);
    }
});

client.login(CONFIG.TOKEN);

