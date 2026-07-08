const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ============================================
// CONFIG - SESUAIKAN DENGAN SERVER ANDA
// ============================================
const KARANTINA_CONFIG = {
    KARANTINA_CHANNEL_ID: '1516163567739600927',
    FACTION_ROLE_IDS: [
        '1392382455914172492',
        '1392382455914172491',
        '1392382455876550804',
        '1392382455914172490',
        '1392382455876550800',
        '1392382455876550802',
        '1392382455876550801',
        '1392382455876550803',
    ],
    KARANTINA_ROLE_ID: '1392382455914172494',
    TEAM_ROLE_ID: '1392382455947989066',

    // Tambahan untuk FnG flow
    FNG_MEMBER_ROLE_ID: '1503361899629379654',
    FNG_LEAD_ROLE_ID: '1499605520603025515',
    VERIFY_ROLE_ID: '1499605520603025512',

    // default durasi karantina (hari) untuk FnG
    DEFAULT_KARANTINA_DAYS: 7
};

// ============================================
// FUNCTION PARSE MESSAGE (support multiple users)
// existing format: "LOGS KARANTINA" (keperluan lama)
// ============================================
function parseKarantinaMessage(content) {
    try {
        const lines = content.split('\n').map(line => line.trim());

        const result = {
            isValid: false,
            users: [],
            faction: null,
            waktuKarantina: null,
            reason: null
        };

        if (!lines[0] || !lines[0].toUpperCase().includes('LOGS KARANTINA')) {
            return result;
        }

        for (let line of lines) {
            if (line.toUpperCase().startsWith('USER :')) {
                const userPart = line.substring(6).trim();

                // 1) Cari semua mention <@123> atau <@!123>
                const mentionRegex = /<@!?\s*(\d{5,20})\s*>/g;
                const mentionMatches = [];
                let m;
                while ((m = mentionRegex.exec(userPart)) !== null) {
                    mentionMatches.push(m[1]);
                }

                if (mentionMatches.length > 0) {
                    result.users = mentionMatches;
                } else {
                    // 2) fallback: split by whitespace/comma; ambil token yang berupa angka (ID) atau username/tag
                    const parts = userPart.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
                    // prefer numeric parts as IDs
                    const ids = parts.filter(p => /^\d{5,20}$/.test(p));
                    if (ids.length > 0) {
                        result.users = ids;
                    } else {
                        // treat remaining parts as textual identifiers
                        result.users = parts;
                    }
                }
            }
            else if (line.toUpperCase().startsWith('FACTION :')) {
                result.faction = line.substring(9).trim();
            }
            else if (line.toUpperCase().includes('WAKTU KARANTINA')) {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    result.waktuKarantina = line.substring(colonIndex + 1).trim();
                }
            }
            else if (line.toUpperCase().startsWith('REASON :')) {
                result.reason = line.substring(8).trim();
            }
        }

        if (result.users.length > 0 && result.faction && result.waktuKarantina && result.reason) {
            result.isValid = true;
        }

        return result;
    } catch (error) {
        console.error('[AUTO-KARANTINA] Error parsing message:', error);
        return { isValid: false, users: [], faction: null, waktuKarantina: null, reason: null };
    }
}

// ============================================
// Parser pesan yang diperluas untuk format baru (FnG)
// supports lines: IC NAME:, Tag DC :, FnG Name :, SS Stats:, For Tags:
// ============================================
function parseKarantinaMessageV2(content) {
    const lines = content.split('\n').map(l => l.trim());
    const r = {
        isValid: false,
        icName: null,
        tagDC: null,
        fngName: null,
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

    // valid minimal: ada Tag DC atau isi lain
    r.isValid = !!(r.tagDC || r.fngName || r.icName);
    return r;
}

// ============================================
// Helper: format tanggal ke '01 Juli' (id)
// ============================================
function formatDateId(date) {
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' });
}

// ============================================
// PROCESS FnG flow
// menerima message dan parsed (output parseKarantinaMessageV2)
// mengembalikan { results, waktuKarantinaStr }
// ============================================
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

    // return summary
    return { results, waktuKarantinaStr };
}

// ============================================
// SETUP AUTO KARANTINA HANDLER (gabungan kedua flow)
// ============================================
function setupAutoKarantinaHandler(client) {
    client.on('messageCreate', async (message) => {
        try {
            // SAFETY CHECK 1: Guild & Channel
            if (!message.guild) return;
            if (message.channelId !== KARANTINA_CONFIG.KARANTINA_CHANNEL_ID) return;
            if (message.author.bot) return;

            // SAFETY CHECK 2: Bot Permissions
            const botMember = message.guild.members.me;
            if (!botMember) {
                console.error('[AUTO-KARANTINA] ❌ Bot member not found in guild');
                return;
            }

            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                console.error('[AUTO-KARANTINA] ❌ Bot tidak punya permission: MANAGE_ROLES');
                await message.reply('❌ Bot tidak punya permission untuk manage roles!');
                return;
            }

            if (!botMember.permissions.has(PermissionFlagsBits.ChangeNickname)) {
                console.error('[AUTO-KARANTINA] ❌ Bot tidak punya permission: CHANGE_NICKNAME');
                await message.reply('❌ Bot tidak punya permission untuk change nickname!');
                return;
            }

            // 1) coba parse format lama (LOGS KARANTINA)
            const karantinaData = parseKarantinaMessage(message.content);
            if (karantinaData.isValid) {
                console.log('[AUTO-KARANTINA] Format lama ditemukan, memproses (legacy flow)...');
                // existing legacy flow (tidak berubah)
                const guild = message.guild;
                const results = [];

                // Pre-fetch all members to ensure cache is populated
                try { await guild.members.fetch({ limit: 1000 }); } catch (err) { console.warn('[AUTO-KARANTINA] ⚠️  Gagal pre-fetch members:', err.message); }

                for (const userIdentifier of karantinaData.users) {
                    console.log(`\n[AUTO-KARANTINA] ========== Processing (legacy): ${userIdentifier} ==========`);

                    const res = {
                        identifier: userIdentifier,
                        found: false,
                        tag: null,
                        oldNickname: null,
                        newNickname: null,
                        rolesRemoved: [],
                        karantinaRoleAdded: false,
                        error: null
                    };

                    let member = null;
                    try {
                        // Try fetch by ID with TIMEOUT (if numeric)
                        if (/^\d+$/.test(userIdentifier)) {
                            try {
                                const fetchPromise = guild.members.fetch(userIdentifier);
                                member = await Promise.race([ fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 5000)) ]);
                            } catch (err) {
                                member = null;
                            }
                        }

                        // fallback: search cache by username, tag, or nickname (case-insensitive)
                        if (!member) {
                            const lower = userIdentifier.toLowerCase();
                            member = guild.members.cache.find(m => {
                                const username = m.user.username.toLowerCase();
                                const tag = `${m.user.username}#${m.user.discriminator}`.toLowerCase();
                                const nick = (m.nickname || '').toLowerCase();
                                return username === lower || tag === lower || nick === lower;
                            }) || null;
                        }

                        if (!member) {
                            res.error = 'Member tidak ditemukan di guild';
                            results.push(res);
                            continue;
                        }

                        // SAFETY CHECK: User is not higher than bot
                        if (member.roles.highest.position >= botMember.roles.highest.position) {
                            res.error = 'Role member lebih tinggi dari bot';
                            results.push(res);
                            continue;
                        }

                        res.found = true;
                        res.tag = member.user.tag;

                        // old nickname
                        const currentDisplayName = member.nickname || member.user.username;
                        res.oldNickname = currentDisplayName;

                        // compute baseName and newNickname (legacy uses "KARANTINA | base")
                        let parts = currentDisplayName.split('|').map(p => p.trim()).filter(Boolean);
                        let baseName;
                        if (parts.length > 1) {
                            if (parts[0].toUpperCase() === 'KARANTINA') {
                                baseName = parts.slice(1).join(' | ');
                            } else {
                                baseName = parts[parts.length - 1];
                            }
                        } else {
                            baseName = parts[0];
                        }
                        if (!baseName) baseName = member.user.username;
                        baseName = baseName.trim();
                        const prefix = 'KARANTINA | ';
                        let newNick = `${prefix}${baseName}`;
                        if (newNick.length > 32) {
                            const allowed = 32 - prefix.length;
                            baseName = baseName.slice(0, allowed);
                            newNick = `${prefix}${baseName}`;
                        }
                        res.newNickname = newNick;

                        // set nickname if different
                        if (currentDisplayName !== newNick) {
                            try {
                                await member.setNickname(newNick);
                            } catch (err) {
                                // ignore
                            }
                        }

                        // remove faction roles
                        for (const roleId of KARANTINA_CONFIG.FACTION_ROLE_IDS) {
                            if (member.roles.cache.has(roleId)) {
                                try {
                                    const role = guild.roles.cache.get(roleId);
                                    const roleName = role ? role.name : roleId;
                                    await member.roles.remove(roleId);
                                    res.rolesRemoved.push(roleName);
                                } catch (err) { /* ignore per-role */ }
                            }
                        }

                        // add karantina role
                        const karRole = guild.roles.cache.get(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                        if (karRole) {
                            try {
                                await member.roles.add(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                                res.karantinaRoleAdded = true;
                            } catch (err) { /* ignore */ }
                        }

                    } catch (err) {
                        res.error = String(err.message || err);
                    }

                    results.push(res);
                    await new Promise(r => setTimeout(r, 200)); // Delay safety
                }

                // Send summary embed (legacy)
                try {
                    const lines = results.map(r => {
                        if (!r.found) return `• ${r.identifier} — ❌ ${r.error || 'tidak ditemukan'}`;
                        const removed = r.rolesRemoved.length ? r.rolesRemoved.join(', ') : 'Tidak ada';
                        return `• ${r.tag} — ✅\n    - Nama Lama: ${r.oldNickname}\n    - Nama Baru: ${r.newNickname}\n    - Roles Dihapus: ${removed}\n    - Karantina Role: ${r.karantinaRoleAdded ? 'Ya' : 'Tidak'}`;
                    }).join('\n\n');

                    const description = lines.length > 4096 ? lines.substring(0, 4093) + '...' : lines;

                    const summaryEmbed = new EmbedBuilder()
                        .setTitle('Auto Karantina - Summary')
                        .setColor(0xFF6B6B)
                        .setDescription(description)
                        .setTimestamp()
                        .setFooter({ text: 'Auto Karantina System' });

                    await message.channel.send({
                        content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`,
                        embeds: [summaryEmbed]
                    });
                } catch (err) {
                    console.error('[AUTO-KARANTINA] ❌ gagal mengirim summary embed (legacy):', err.message);
                }

                return; // handled legacy case
            }

            // 2) coba parse format FnG (IC NAME / Tag DC / FnG Name)
            const parsedV2 = parseKarantinaMessageV2(message.content);
            if (parsedV2.isValid) {
                console.log('[AUTO-KARANTINA] Format FnG ditemukan, memproses (FnG flow)...');
                try {
                    const { results, waktuKarantinaStr } = await processFnGMessage(message, parsedV2);

                    // build summary similar to legacy but include waktuKarantinaStr
                    const lines = results.map(r => {
                        if (!r.found) return `• ${r.identifier} — ❌ ${r.error || 'tidak ditemukan'}`;
                        const removed = r.rolesRemoved.length ? r.rolesRemoved.join(', ') : 'Tidak ada';
                        return `• ${r.identifier} (${r.oldNickname}) — ✅\n    - Nama Baru: ${r.newNickname}\n    - Roles Dihapus: ${removed}\n    - Karantina Role: ${r.karantinaRoleAdded ? 'Ya' : 'Tidak'}`;
                    }).join('\n\n');

                    const description = (lines + `\n\nPeriode: ${waktuKarantinaStr}`).length > 4096
                        ? (lines.substring(0, 4093) + '...')
                        : (lines + `\n\nPeriode: ${waktuKarantinaStr}`);

                    const summaryEmbed = new EmbedBuilder()
                        .setTitle('Auto Karantina FnG - Summary')
                        .setColor(0xFF6B6B)
                        .setDescription(description)
                        .setTimestamp()
                        .setFooter({ text: 'Auto Karantina System (FnG)' });

                    await message.channel.send({
                        content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`,
                        embeds: [summaryEmbed]
                    });
                } catch (err) {
                    console.error('[AUTO-KARANTINA] ❌ gagal memproses FnG flow:', err);
                }

                return; // handled FnG case
            }

            // jika tidak ada format valid
            console.log('[AUTO-KARANTINA] ⚠️  Tidak ada format yang cocok, ignore pesan.');
            return;

        } catch (error) {
            console.error('[AUTO-KARANTINA] ❌ Error di handler:', error);
        }
    });

    console.log('[AUTO-KARANTINA] Handler berhasil di-setup!');
}

module.exports = { setupAutoKarantinaHandler, KARANTINA_CONFIG };
