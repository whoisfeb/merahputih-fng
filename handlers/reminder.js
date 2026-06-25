// handlers/reminder.js
const ANNOUNCE_CHANNEL_ID = '1518781754238832820'; // Konfigurasi channel di sini

const RANDOM_MESSAGES = [
    "📢 **Perhatian untuk Seluruh Badside / Illegal Faction Merah Putih**\n\nSekali lagi, untuk seluruh Badside atau Illegal Faction yang sudah menjadi bagian dari Merah Putih maupun yang baru mendaftar, pastikan kalian memahami dan saling mengingatkan mengenai behavior, culture, serta standar roleplay kelompok kalian masing-masing.\n\nJangan sampai karena kelalaian individu, dampaknya justru merugikan seluruh kelompok. Mulai dari pelanggaran rules roleplay, hingga pelanggaran rules server yang pada akhirnya dapat mempengaruhi nama baik kelompok secara keseluruhan.\n\nHargai juga anggota lain dalam kelompok kalian yang ingin menjalankan roleplay dengan baik dan sesuai culture. Jangan sampai usaha mereka ikut terdampak karena tindakan segelintir orang yang tidak memperhatikan aturan maupun standar roleplay yang berlaku.\n\nUntuk **taunting**, hanya diperbolehkan menggunakan bahasa **non Indonesia** demi menjaga kenyamanan roleplay dan menghindari hal-hal yang tidak diinginkan. Apabila masih ditemukan pelanggaran setelah diberikan arahan atau teguran, maka tanggung jawab pertama ada pada pihak internal kelompok, termasuk penanggung jawab maupun leader yang bersangkutan.\n\nJika pelanggaran terus berulang, maka konsekuensi yang diberikan tidak hanya mengarah kepada individu, tetapi dapat berdampak kepada kelompok (terkena warn/strike). Karena itu, mulai lebih bijak dalam bertindak, berpikir sebelum bertindak, dan pahami konsekuensi dari setiap tindakan roleplay yang dilakukan.\n\n**Utamakan RESPECT.**\nRespect kepada sesama player, lawan roleplay, kelompok lain, rules server, rules roleplay, dan storyline yang sedang dibangun bersama.\n\n@everyone",
    "Bacalah rules terlebih dahulu, untuk menghindari sebuah kesalahpahaman.\n\n@everyone",
    "Jadilah legenda di kota ini, bukan sekedar nama di papan skor.\n\n@everyone ",
    "Merah Putih Roleplay, menantang kreativitasmu dalan roleplay.\n\n@everyone ",
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

function handleReminder(client) { // Tidak perlu parameter CONFIG lagi
    console.log('[SYSTEM] Reminder Handler telah dimuat.');

    const sendReminder = () => {
        const announceChannel = client.channels.cache.get(ANNOUNCE_CHANNEL_ID);
        if (announceChannel) {
            const text = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
            announceChannel.send(text).catch(err => console.error('[REMINDER ERROR]', err));
        }
    };

    sendReminder();
    setInterval(sendReminder, 21600000); // 6 jam sekali
}

module.exports = { handleReminder };
