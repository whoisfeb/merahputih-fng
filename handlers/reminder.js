// handlers/reminder.js
const ANNOUNCE_CHANNEL_ID = '1518781754238832820'; // Konfigurasi channel di sini

const RANDOM_MESSAGES = [
    "📢 **Perhatian untuk Seluruh Badside / Illegal Faction Merah Putih**\n\nSekali lagi, untuk seluruh Badside atau Illegal Faction yang sudah menjadi bagian dari Merah Putih maupun yang baru mendaftar, pastikan kalian memahami dan saling mengingatkan mengenai behavior, culture, serta standar roleplay kelompok kalian masing-masing.\n\nJangan sampai karena kelalaian individu, dampaknya justru merugikan seluruh kelompok. Mulai dari pelanggaran rules roleplay, hingga pelanggaran rules server yang pada akhirnya dapat mempengaruhi nama baik kelompok secara keseluruhan.\n\nHargai juga anggota lain dalam kelompok kalian yang ingin menjalankan roleplay dengan baik dan sesuai culture. Jangan sampai usaha mereka ikut terdampak karena tindakan segelintir orang yang tidak memperhatikan aturan maupun standar roleplay yang berlaku.\n\nUntuk **taunting**, hanya diperbolehkan menggunakan bahasa **non Indonesia** demi menjaga kenyamanan roleplay dan menghindari hal-hal yang tidak diinginkan. Apabila masih ditemukan pelanggaran setelah diberikan arahan atau teguran, maka tanggung jawab pertama ada pada pihak internal kelompok, termasuk penanggung jawab maupun leader yang bersangkutan.\n\nJika pelanggaran terus berulang, maka konsekuensi yang diberikan tidak hanya mengarah kepada individu, tetapi dapat berdampak kepada kelompok (terkena warn/strike). Karena itu, mulai lebih bijak dalam bertindak, berpikir sebelum bertindak, dan pahami konsekuensi dari setiap tindakan roleplay yang dilakukan.\n\n**Utamakan RESPECT.**\nRespect kepada sesama player, lawan roleplay, kelompok lain, rules server, rules roleplay, dan storyline yang sedang dibangun bersama.\n\n@everyone",
    "Bacalah rules terlebih dahulu, untuk menghindari sebuah kesalahpahaman.\n\n@everyone",
    "📢 **Reminder untuk Seluruh Player**\n\nMulai sekarang **tidak ada lagi evaluasi, perdebatan, atau pembahasan mengenai roleplay di dalam game**.\n\nApabila saya masih mendengar adanya evaluasi atau perdebatan OOC saat roleplay berlangsung, **akan dikenakan warn** karena termasuk kebiasaan yang mengarah pada **mixing**.\n\nJika merasa ada **miss RP** atau dugaan **break rules**, prosedurnya sudah jelas:\n\n1. Selesaikan roleplay sampai selesai.\n2. Kumpulkan bukti yang diperlukan.\n3. Buat tiket report melalui jalur yang telah disediakan server.\n4. Biarkan staff yang melakukan peninjauan dan mengambil keputusan.\n\nJangan biasakan membawa permasalahan OOC ke dalam roleplay. Kebiasaan seperti ini hanya merusak suasana, mengganggu immersion, dan mengurangi kualitas roleplay.\n\nMari ubah pola bermain kita. **Selesaikan RP terlebih dahulu, baru selesaikan masalahnya melalui prosedur yang benar.** Utamakan **RESPECT** dan hindari **mixing**.\n\n<@&1503361899629379654> <@&1499605520603025515> <@&1499605520603025512>",
    "📢 **Untuk Seluruh Calon Faction yang Baru Mendaftar**\n\nBagi seluruh faction yang baru mendaftar, tetap gunakan **referensi real life** sebagai dasar dalam membangun faction kalian. Referensi tersebut digunakan untuk memahami **dasar culture, behavior, dan identitas** faction yang ingin kalian bawa, **bukan untuk menyalinnya 100% ke dalam roleplay**.\n\nUntuk pembuatan **logo atau insignia**, usahakan menyesuaikan **konsep dan color palette** agar memiliki kemiripan dengan referensi yang digunakan. Tujuannya bukan untuk menjiplak, melainkan agar identitas visual faction tetap selaras dengan culture yang dibawa.\n\nKalian juga **tidak perlu mendalami referensi secara berlebihan**. Cukup pahami hal-hal mendasar, seperti:\n\n* Dasar culture faction.\n* Behavior karakter.\n* Cara organisasi tersebut berinteraksi.\n* Struktur atau hierarchy secara umum.\n* Nilai atau identitas yang mereka pegang.\n\nSetelah memahami dasar tersebut, silakan kembangkan **versi faction kalian sendiri** dengan cerita, tradisi, dan identitas yang unik sesuai lore server.\n\n**Gunakan referensi sebagai fondasi, lalu bangun identitas faction kalian sendiri.**\n\n<@&1499605520603025512>",
    "Satu peluru bisa mengakhiri hidu, tapi satu pengkhianat mengakhiri segalanya.\n\n@everyone",
    "Dihimbau kepada seluruh <@&1392382455876550799> untuk **tidak sembarangan bergabung (join) ke link Discord yang tidak jelas atau tidak resmi**.\n\nKami menemukan adanya beberapa link mencurigakan yang berpotensi:\n- Mengandung scam / penipuan\n- Phishing (pencurian akun)\n- Malware / virus\n\n🔒 **Keamanan akun adalah tanggung jawab masing-masing.**\nSegala bentuk kerugian akibat join link di luar server resmi bukan tanggung jawab pihak kami.\n\n📌 **Harap diperhatikan:**\n* Hanya join link yang dibagikan oleh admin resmi\n* Jangan mudah percaya dengan DM/link dari orang tidak dikenal\n\n**Tetap waspada dan jaga keamanan akun kalian.**\n\n@everyone",
    "Halo @everyone 👋\nKami menegaskan bahwa server ini memiliki kebijakan **ZERO TOLERANCE** terhadap segala bentuk pelecehan, baik secara verbal, tulisan, maupun tindakan dalam roleplay maupun di luar roleplay.\n\n⚠️ Termasuk:\n• Pelecehan seksual\n• Catcalling / komentar tidak pantas\n• DM tidak sopan / mengganggu\n• Body shaming\n• Candaan berlebihan yang bersifat merendahkan\n• Pelecehan OOC maupun IC \n\nTidak ada alasan \"bercanda\". Tidak ada alasan \"hanya RP\". Jika melewati batas, tindakan akan diambil.\n\n📩 Jika kalian mengalami atau melihat tindakan pelecehan: Segera laporkan ke admin disertai bukti yang valid. Sanksi tegas menanti dari warning hingga **BANNED PERMANENT**.\n\n@everyone",
    "Hargai lawan roleplaymu, karena tanpa mereka ceritanmu akan hampa.\n\n@everyone",
    "Bukannya takut sama kepolisian, tapi cuman takut dipenjara terlalu lama.\n\n@everyone ",
    "Daftarkan Faction terbaik kamu, dan jadilah legenda di Merah putih roleplay.\n\n@everyone ",
    "Jangan biarkan emosi OOC merusak indahnya skenario IC yang sudah di bangun.\n\n@everyone ",
    "Tangan kanan menegang Handgun, tangan kiri memegang harga diri.\n\n@everyone ",
    "Dihimbau untuk seluruh Civilian/Faction, untuk membaca <#1514716381176795266> ,<#1501619904992907346> , dan <#1499605521416847519> sebelum melakukan sebuah aktivitas di dalam kota.\n\n @everyone"
];

async function handleReminder(client) {
    console.log('[SYSTEM] Checking reminder schedule (WIB)...');

    // 1. Dapatkan waktu saat ini di Jakarta
    const waktuJkt = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const jamSekarang = waktuJkt.getHours();
    const menitSekarang = waktuJkt.getMinutes();

    // Jadwal target jam pengiriman: 01, 07, 13, atau 19 WIB (Sudah diisi lengkap)
    const jadwalJam = "1,7,13,19";

    // 2. Beri toleransi menit karena GitHub Actions sering delay 1-10 menit dari jadwal aslinya
    // Jika jam sesuai DAN menit berada di kisaran 0 sampai 25, maka kirim pesan.
    if (jadwalJam.includes(jamSekarang) && menitSekarang >= 0 && menitSekarang <= 25) {
        console.log(`[SYSTEM] Cocok! Jam: ${jamSekarang}:${menitSekarang}. Mengirim reminder...`);
        
        try {
            const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
            if (announceChannel) {
                const text = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
                await announceChannel.send(text);
                console.log('[SYSTEM] Reminder otomatis berhasil dikirim ke Discord.');
            }
        } catch (err) {
            console.error('[REMINDER ERROR]', err);
        }
    } else {
        console.log(`[SYSTEM] Belum waktunya mengirim reminder. Jam sekarang (WIB): ${jamSekarang}:${menitSekarang}`);
    }
}

module.exports = { handleReminder };
