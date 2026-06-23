const TARGET_CHANNEL_ID = '1515008339904434427';

// Fungsi bantuan untuk memberikan jeda waktu (delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleWarning(message) {
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;

    const content = message.content;

    // 1. Validasi utama teks log faction
    const hasFactionLogs = /Faction\s*Logs/i.test(content);
    if (!hasFactionLogs) return;

    // 2. Isolasi baris yang hanya berisi kata "Logs :" agar pencarian angka strike tidak salah fokus
    const lines = content.split('\n');
    const logLine = lines.find(line => line.toLowerCase().includes('logs\s*:') || line.toLowerCase().startsWith('logs'));
    if (!logLine) return;

    // 3. Ambil angka strike dari baris tersebut secara presisi
    const digitMatch = logLine.match(/\d+/);
    if (!digitMatch) return;
    const strikeAmount = parseInt(digitMatch[0], 10);

    // 4. Cek apakah ada tanda minus (-) di baris log tersebut untuk menentukan pengurangan
    const isDecrease = logLine.includes('-');

    // Ambil semua role yang di-tag dalam pesan
    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) return;

    // Proses setiap role secara bergantian
    for (const [roleId, role] of mentionedRoles) {
        try {
            // Mengambil nama asli role langsung dari server Discord (Aman dari teks chat)
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
            
            // 👈 BAGIAN YANG DIUBAH: Pesan sukses hapus otomatis dalam 5 detik
            await message.channel.send(`✅ Berhasil memperbarui role **${cleanName}** menjadi **${newRoleName}**.\n*(Pesan ini akan terhapus otomatis)*`)
                .then(msg => {
                    setTimeout(() => msg.delete().catch(err => console.error("Gagal menghapus pesan:", err)), 5000);
                });
            
            // JEDA AMAN: Memberikan jeda 1.5 detik per role jika mendeteksi banyak role sekaligus
            if (mentionedRoles.size > 1) {
                await sleep(1500); 
            }

        } catch (error) {
            console.error(`Gagal mengubah nama role ID ${roleId}:`, error);
            // Pesan error juga diatur hapus otomatis agar channel tetap bersih
            await message.channel.send(`❌ Gagal mengubah nama role <@&${roleId}>. Pastikan posisi Role Bot berada di atas role tersebut!`)
                .then(msg => {
                    setTimeout(() => msg.delete().catch(err => console.error("Gagal menghapus pesan error:", err)), 7000);
                });
        }
    }
}

module.exports = { handleWarning };
