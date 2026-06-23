const TARGET_CHANNEL_ID = '1515008339904434427';

// Menggunakan named export agar sesuai style index.js Anda
async function handleWarning(message) {
    // Abaikan pesan dari bot kita sendiri atau jika di luar channel target
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // 1. PENGECEKAN BARU: Menggunakan Regex agar kebal dari spasi tambahan / baris baru
    const hasFactionLogs = /Faction\s*Logs/i.test(content);
    const hasStrikePlusOne = /Logs\s*:\s*Strike\s*\+1/i.test(content);

    // Jika salah satu indikator teks utama tidak lolos, hentikan proses
    if (!hasFactionLogs || !hasStrikePlusOne) return;

    // Ambil semua role yang di-tag di dalam isi pesan (mentions)
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Memproses setiap role yang terdeteksi
    for (const [roleId, role] of mentionedRoles) {
        try {
            let currentName = role.name;
            let cleanName = currentName;
            let currentWarning = 0;

            // Regex untuk mendeteksi format (0/3), (1/3), (2/3), atau (3/3)
            const warningRegex = /\((\d)\/3\)/;
            const match = currentName.match(warningRegex);

            if (match) {
                currentWarning = parseInt(match, 10);
                cleanName = currentName.replace(warningRegex, '').trim();
            } else {
                cleanName = currentName.trim();
            }

            // Naikkan status strike/warning +1
            let nextWarning = currentWarning + 1;
            if (nextWarning > 3) nextWarning = 3; 

            // Format nama role yang baru
            const newRoleName = `${cleanName} (${nextWarning}/3)`;

            // Eksekusi perubahan nama role di server Discord
            await role.setName(newRoleName, 'Otomatisasi Faction Logs - Strike +1');
            
            // Kirim log konfirmasi ringkas di channel
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.`);
            
        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`);
        }
    }
}

module.exports = { handleWarning };
