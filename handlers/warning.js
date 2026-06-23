const TARGET_CHANNEL_ID = '1515008339904434427';

async function handleWarning(message) {
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // 1. Validasi utama teks log faction
    const hasFactionLogs = /Faction\s*Logs/i.test(content);
    if (!hasFactionLogs) return;

    // 2. Deteksi jumlah Strike secara dinamis menggunakan Regex (bisa Strike +1, Strike +2, dst)
    const strikeRegex = /Logs\s*:\s*Strike\s*\+(\d+)/i;
    const strikeMatch = content.match(strikeRegex);
    if (!strikeMatch) return; // Jika tidak ada teks "Strike +X", hentikan proses

    // Ambil angka strike dari pesan (misal: "1" dari "+1")
    const strikeAmount = parseInt(strikeMatch[1], 10);

    // Ambil semua role yang di-tag dalam pesan
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Proses setiap role secara bergantian
    for (const [roleId, role] of mentionedRoles) {
        try {
            // Selalu ambil nama asli role langsung dari server Discord (bukan dari teks chat)
            let currentName = role.name;
            let cleanName = currentName;
            let currentWarning = 0;

            // Cari tahu apakah nama role di server saat ini sudah punya format (X/3)
            const warningRegex = /\((\d+)\/3\)/;
            const match = currentName.match(warningRegex);

            if (match) {
                currentWarning = parseInt(match[1], 10);
                cleanName = currentName.replace(warningRegex, '').trim();
            } else {
                cleanName = currentName.trim();
            }

            // Hitung warning baru: Warning Lama + Angka Strike dari Pesan Log
            let nextWarning = currentWarning + strikeAmount;
            if (nextWarning > 3) nextWarning = 3; // Batasi maksimal di 3

            const newRoleName = `${cleanName} (${nextWarning}/3)`;

            // Eksekusi perubahan nama role di Discord
            await role.setName(newRoleName, `Otomatisasi Faction Logs - Strike +${strikeAmount}`);
            
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.`);
            
        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`);
        }
    }
}

module.exports = { handleWarning };
