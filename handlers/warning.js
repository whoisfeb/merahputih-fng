const TARGET_CHANNEL_ID = '1515008339904434427';

// Fungsi bantuan untuk memberikan jeda waktu (delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleWarning(message) {
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // 1. Validasi utama teks log faction
    const hasFactionLogs = /Faction\s*Logs/i.test(content);
    if (!hasFactionLogs) return;

    // 2. REGEX ULTRA FLEKSIBEL: Mendeteksi penambahan (+) atau pengurangan (-) strike beserta angkanya
    // Pola ini mencari kata "Strike" dan mendeteksi apakah ada simbol minus (-) atau plus (+) di sekitar angka
    const strikeRegex = /(?:([+-])\s*Strike\s*|Strike\s*([+-]?)\s*)(\d+)/i;
    const strikeMatch = content.match(strikeRegex);
    if (!strikeMatch) return;

    // Tentukan apakah ini operasi pengurangan atau penambahan
    // Memeriksa simbol dari grup penangkap regex [+-]
    const isDecrease = (strikeMatch[1] === '-' || strikeMatch[2] === '-');
    const strikeAmount = parseInt(strikeMatch[3], 10);

    // Ambil semua role yang di-tag dalam pesan
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Proses setiap role secara bergantian
    for (const [roleId, role] of mentionedRoles) {
        try {
            let currentName = role.name;
            let cleanName = currentName;
            let currentWarning = 0;

            // Cari tahu apakah nama role di server saat ini sudah punya format (X/3)
            const warningRegex = /\((\d+)\/3\)/;
            const match = currentName.match(warningRegex);

            if (match) {
                currentWarning = parseInt(match, 10);
                cleanName = currentName.replace(warningRegex, '').trim();
            } else {
                cleanName = currentName.trim();
            }

            // Hitung warning baru berdasarkan jenis operasi (tambah atau kurang)
            let nextWarning = currentWarning;
            if (isDecrease) {
                nextWarning = currentWarning - strikeAmount;
                if (nextWarning < 0) nextWarning = 0; // Batasi minimal di 0
            } else {
                nextWarning = currentWarning + strikeAmount;
                if (nextWarning > 3) nextWarning = 3; // Batasi maksimal di 3
            }

            const newRoleName = `${cleanName} (${nextWarning}/3)`;

            // Eksekusi perubahan nama role di Discord
            const actionReason = isDecrease ? `Strike -${strikeAmount}` : `Strike +${strikeAmount}`;
            await role.setName(newRoleName, `Otomatisasi Faction Logs - ${actionReason}`);
            
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.`);
            
            // JEDA AMAN: Memberikan jeda 1.5 detik per role jika mendeteksi banyak role sekaligus
            if (mentionedRoles.size > 1) {
                await sleep(1500); 
            }

        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`);
        }
    }
}

module.exports = { handleWarning };
