// --- CONFIG: tambahkan field baru ---
const KARANTINA_CONFIG = {
    KARANTINA_CHANNEL_ID: '1516163567739600927',
    FACTION_ROLE_IDS: [
        '1392382455914172492',
        // ...
    ],
    KARANTINA_ROLE_ID: '1392382455914172494',
    TEAM_ROLE_ID: '1499605520603025517',

    // Tambahan untuk FnG flow
    FNG_MEMBER_ROLE_ID: '1503361899629379654',
    FNG_LEAD_ROLE_ID: '1499605520603025515',
    VERIFY_ROLE_ID: '1499605520603025512',

    // default durasi karantina (hari)
    DEFAULT_KARANTINA_DAYS: 7
};

// --- Parser pesan yang diperluas untuk format baru ---
function parseKarantinaMessageV2(content) {
    const lines = content.split('\n').map(l => l.trim());
    const r = {
        isValid: false,
        icName: null,
        tagDC: null,      // raw text after 'Tag DC :'
        fngName: null,    // raw text after 'FnG Name :'
        ssStats: null,
        forTags: null
    };

    for (let line of lines) {
        const up = line.toUpperCase();
        if (up.startsWith('IC NAME')) {
            const idx = line.indexOf(':');
            if (idx !== -1) r.icName = line.substring(idx + 1).trim();
        } else if (up.startsWith('TAG DC')) {
            const idx = line.indexOf(':');
            if (idx !== -1) r.tagDC = line.substring(idx + 1).trim();
        } else if (up.startsWith('FNG NAME')) {
            const idx = line.indexOf(':');
            if (idx !== -1) r.fngName = line.substring(idx + 1).trim();
        } else if (up.startsWith('SS STATS')) {
            const idx = line.indexOf(':');
            if (idx !== -1) r.ssStats = line.substring(idx + 1).trim();
        } else if (up.includes('FOR TAGS')) {
            const idx = line.indexOf(':');
            if (idx !== -1) r.forTags = line.substring(idx + 1).trim();
        }
    }

    // valid minimal: ada Tag DC atau isi lain (sesuaikan jika perlu)
    r.isValid = !!(r.tagDC || r.fngName || r.icName);
    return r;
}

// --- Helper: format tanggal ke '01 Juli' (id) ---
function formatDateId(date) {
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' });
}

// --- Di dalam handler messageCreate: ganti pemrosesan users dengan flow FnG ---
// Asumsikan kamu sudah mem-parsed pesan menjadi parsed = parseKarantinaMessageV2(message.content);

async function processFnGMessage(message, parsed) {
    const guild = message.guild;
    const botMember = guild.members.me;
    const results = [];

    // 1) Tentukan target IDs: dari Tag DC (mention) atau fallback ke author
    const tagDcText = parsed.tagDC || '';
    const mentionRegex = /<@!?(\d{5,20})>/g;
    const tagMentions = [];
    let m;
    while ((m = mentionRegex.exec(tagDcText)) !== null) tagMentions.push(m[1]);

    const targets = tagMentions.length > 0 ? tagMentions : [message.author.id];

    // 2) Tentukan role mentions dari FnG Name (role mentions <@&id>) atau role names teks (split)
    const fngText = parsed.fngName || '';
    const roleMentionRegex = /<@&(\d{5,20})>/g;
    const roleMentions = [];
    while ((m = roleMentionRegex.exec(fngText)) !== null) roleMentions.push(m[1]);

    // Also try to resolve textual role names (comma separated) if no role mentions
    let roleNames = [];
    if (roleMentions.length === 0 && fngText) {
        roleNames = fngText.split(/[,\|]+/).map(s => s.trim()).filter(Boolean);
    }

    // 3) compute waktu karantina otomatis: hari ini -> + DEFAULT_KARANTINA_DAYS - 1
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + (KARANTINA_CONFIG.DEFAULT_KARANTINA_DAYS - 1));
    const waktuKarantinaStr = `${formatDateId(start)} - ${formatDateId(end)}`;

    // Pre-fetch members
    try { await guild.members.fetch({ limit: 1000 }); } catch (err) { /* ignore */ }

    for (const userId of targets) {
        const res = { identifier: userId, found: false, oldNickname: null, newNickname: null, rolesRemoved: [], karantinaRoleAdded: false, error: null };
        try {
            const member = await guild.members.fetch(userId).catch(() => guild.members.cache.get(userId) || null);
            if (!member) {
                res.error = 'Member tidak ditemukan';
                results.push(res);
                continue;
            }

            // Safety: role hierarchy
            if (member.roles.highest.position >= botMember.roles.highest.position) {
                res.error = 'Role member lebih tinggi dari bot';
                results.push(res);
                continue;
            }

            res.found = true;
            res.oldNickname = member.nickname || member.user.username;

            // Build new nickname: "01 Juli - 07 Juli | namaAwal"
            // extract original base name (seperti di kode awal)
            let baseName = (member.nickname || member.user.username).split('|').map(p => p.trim()).filter(Boolean);
            baseName = baseName.length ? baseName[baseName.length - 1] : member.user.username;
            let newNick = `${waktuKarantinaStr} | ${baseName}`;
            if (newNick.length > 32) {
                const allowed = 32 - (`${waktuKarantinaStr} | `).length;
                baseName = baseName.slice(0, allowed);
                newNick = `${waktuKarantinaStr} | ${baseName}`;
            }
            res.newNickname = newNick;

            try { if ((member.nickname || member.user.username) !== newNick) await member.setNickname(newNick); } catch (err) { /* tidak fatal */ }

            // Roles to remove: always FNG_MEMBER and FNG_LEAD if present
            const mandatoryRemove = [KARANTINA_CONFIG.FNG_MEMBER_ROLE_ID, KARANTINA_CONFIG.FNG_LEAD_ROLE_ID].filter(Boolean);

            // roles from FnG Name mention
            const rolesToRemoveSet = new Set(mandatoryRemove.concat(roleMentions));

            // if no roles mentioned in fngName, requirement: "hapus semua role dan sisakan hanya role verify member"
            let removeAllExceptVerify = false;
            if ((roleMentions.length === 0) && roleNames.length === 0) {
                removeAllExceptVerify = true;
            } else if (roleNames.length > 0) {
                // Try to resolve role names to IDs
                for (const rn of roleNames) {
                    const foundRole = guild.roles.cache.find(r => r.name.toLowerCase() === rn.toLowerCase());
                    if (foundRole) rolesToRemoveSet.add(foundRole.id);
                }
            }

            if (removeAllExceptVerify) {
                // remove every role except @everyone and verify role and roles higher than bot
                for (const [rid, role] of member.roles.cache) {
                    if (rid === guild.id) continue; // @everyone
                    if (rid === KARANTINA_CONFIG.VERIFY_ROLE_ID) continue;
                    // do not try to remove roles that are higher/equal than bot
                    const roleObj = guild.roles.cache.get(rid);
                    if (!roleObj) continue;
                    if (roleObj.position >= botMember.roles.highest.position) continue;
                    try {
                        await member.roles.remove(rid);
                        res.rolesRemoved.push(roleObj.name);
                    } catch (err) {
                        // ignore errors per-role
                    }
                }
            } else {
                // remove listed roles
                for (const rid of Array.from(rolesToRemoveSet)) {
                    if (!rid) continue;
                    const roleObj = guild.roles.cache.get(rid);
                    if (!roleObj) continue;
                    if (!member.roles.cache.has(rid)) continue;
                    if (roleObj.position >= botMember.roles.highest.position) continue;
                    try {
                        await member.roles.remove(rid);
                        res.rolesRemoved.push(roleObj.name || rid);
                    } catch (err) {
                        // ignore individual errors
                    }
                }
            }

            // add karantina role
            const karRole = guild.roles.cache.get(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
            if (karRole && karRole.position < botMember.roles.highest.position) {
                try {
                    await member.roles.add(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                    res.karantinaRoleAdded = true;
                } catch (err) { /* ignore */ }
            }

        } catch (err) {
            res.error = String(err.message || err);
        }
        results.push(res);
        await new Promise(r => setTimeout(r, 200)); // small delay
    }

    // kirim summary (seperti di kode-mu)
    return { results, waktuKarantinaStr };
}
