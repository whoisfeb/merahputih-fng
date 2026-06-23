const TARGET_CHANNEL_ID = '1515008339904434427';

// Fungsi bantuan untuk memberikan jeda waktu (delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleWarning(message) {
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // 1. Validasi utama teks log faction
    const hasFactionLogs = /Faction\s*Logs/i.test(content);
    if (!hasFactionLogs) return;

    // 2. PERBAIKAN: Isolasi baris yang mengandung kata "Logs" secara akurat dengan regex .test()
    const lines = content.split('\n');
    const logLine = lines.find(line => /^logs\s*:/i.test(line.trim()));
    if (!logLine) return;

    // 3. Ambil angka murni dari baris log tersebut
    const digitMatch = logLine.match(/\d+/);
    if (!digitMatch) return;
    const strikeAmount = parseInt(digitMatch[0], 10);

    // 4. Cek tanda minus (-) untuk menentukan pengurangan strike
    const isDecrease = logLine.includes('-');

    // Ambil semua role yang di-tag dalam pesan
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Proses setiap role secara bergantian
    for (const [roleId, role] of mentionedRoles) {
        try {
            // Selalu ambil nama asli role dari server Discord
            let currentName = role.name;
            let cleanName = currentName;
            let currentWarning = 0;

            // Cari tahu apakah nama role saat ini sudah punya format (X/3)
            const warningRegex = /\((\d+)\/3\)/;
            const match = currentName.match(warningRegex);

            if (match) {
                currentWarning = parseInt(match, 10);
                cleanName = currentName.replace(warningRegex, '').trim();
            } else {
                cleanName = currentName.trim();
            }

            // Hitung nilai warning baru
            let nextWarning = currentWarning;
            if (isDecrease) {
                nextWarning = currentWarning - strikeAmount;
                if (nextWarning < 0) nextWarning = 0; // Minimal 0
            } else {
                nextWarning = currentWarning + strikeAmount;
                if (nextWarning > 3) nextWarning = 3; // Maksimal 3
            }

            const newRoleName = `${cleanName} (${nextWarning}/3)`;

            // Eksekusi perubahan nama role di Discord
            const actionReason = isDecrease ? `Strike -${strikeAmount}` : `Strike +${strikeAmount}`;
            await role.setName(newRoleName, `Otomatisasi Faction Logs - ${actionReason}`);
            
            // Pesan sukses hapus otomatis dalam 5 detik
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.\n*(Pesan ini akan terhapus otomatis)*`)
                .then(msg => {
                    setTimeout(() => msg.delete().catch(err => console.error("Gagal menghapus pesan:", err)), 5000);
                });
            
            // JEDA AMAN: Memberikan jeda 1.5 detik jika mengedit banyak role sekaligus
            if (mentionedRoles.size > 1) {
                await sleep(1500); 
            }

        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`)
                .then(msg => {
                    setTimeout(() => msg.delete().catch(err => console.error("Gagal menghapus pesan error:", err)), 7000);
                });
        }
    }
}

module.exports = { handleWarning };
