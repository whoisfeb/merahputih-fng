const TARGET_CHANNEL_ID = '1515008339904434427';

// Menggunakan named export agar sesuai style Anda
async function handleWarning(message) {
    // Abaikan pesan dari bot atau pesan di luar channel target
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // Validasi apakah format pesan mengandung kata kunci utama
    if (!content.includes('**Faction Logs**') || !content.includes('Logs : Strike +1')) return;

    // Ambil semua role yang di-tag di dalam isi pesan (mentions)
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Memproses setiap role yang terdeteksi
    for (const [roleId, role] of mentionedRoles) {
        try {
            let currentName = role.name;
            let cleanName = currentName;
            let currentWarning = 0;

            const warningRegex = /\((\d)\/3\)/;
            const match = currentName.match(warningRegex);

            if (match) {
                currentWarning = parseInt(match, 10);
                cleanName = currentName.replace(warningRegex, '').trim();
            } else {
                cleanName = currentName.trim();
            }

            let nextWarning = currentWarning + 1;
            if (nextWarning > 3) nextWarning = 3; 

            const newRoleName = `${cleanName} (${nextWarning}/3)`;

            await role.setName(newRoleName, 'Otomatisasi Faction Logs - Strike +1');
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.`);
            
        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`);
        }
    }
}

// Ekspor fungsinya di sini
module.exports = { handleWarning };
