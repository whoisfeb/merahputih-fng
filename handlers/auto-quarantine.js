const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ============================================
// CONFIG - SESUAIKAN DENGAN SERVER ANDA
// (FACTION_ROLE_IDS telah dihapus)
// ============================================
const KARANTINA_CONFIG = {
  KARANTINA_CHANNEL_ID: '1516163567739600927',
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
// Legacy parser (untuk format "LOGS KARANTINA")
// ============================================
function parseKarantinaMessage(content) {
  try {
    const lines = (content || '').split('\n').map(line => line.trim());
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
        const mentionRegex = /<@!?\s*(\d{5,20})\s*>/g;
        const mentionMatches = [];
        let m;
        while ((m = mentionRegex.exec(userPart)) !== null) mentionMatches.push(m[1]);

        if (mentionMatches.length > 0) {
          result.users = mentionMatches;
        } else {
          const parts = userPart.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
          const ids = parts.filter(p => /^\d{5,20}$/.test(p));
          result.users = ids.length > 0 ? ids : parts;
        }
      } else if (line.toUpperCase().startsWith('FACTION :')) {
        result.faction = line.substring(9).trim();
      } else if (line.toUpperCase().includes('WAKTU KARANTINA')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) result.waktuKarantina = line.substring(colonIndex + 1).trim();
      } else if (line.toUpperCase().startsWith('REASON :')) {
        result.reason = line.substring(8).trim();
      }
    }

    if (result.users.length > 0 && result.faction && result.waktuKarantina && result.reason) {
      result.isValid = true;
    }
    return result;
  } catch (error) {
    console.error('[AUTO-KARANTINA] Error parsing message (legacy):', error);
    return { isValid: false, users: [], faction: null, waktuKarantina: null, reason: null };
  }
}

// ============================================
// TOLERANT PARSER untuk format FnG (lebih tahan bullet/markdown/embed)
// - menerima raw text (string) yang sudah normalisasi
// ============================================
function normalizeRawText(raw) {
  if (!raw) return '';
  return raw.replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function extractField(raw, fieldNames) {
  for (const name of fieldNames) {
    // matches "NAME : value" or "NAME - value", case-insensitive
    const re = new RegExp(name + '\\s*[:\\-]\\s*(.+)', 'i');
    const m = raw.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function parseKarantinaMessageV2(content) {
  let raw = normalizeRawText(content || '');
  // remove common leading bullets/markers from each line to make matching robust
  raw = raw.split('\n').map(l => l.replace(/^[\s\-\•\*\#\>\»\›]+/, '').trim()).join('\n');

  const r = {
    isValid: false,
    icName: null,
    tagDC: null,
    fngName: null,
    ssStats: null,
    forTags: null,
    raw
  };

  r.icName  = extractField(raw, ['IC NAME', 'IC']);
  r.tagDC   = extractField(raw, ['TAG DC', 'TAG', 'TAGDC']);
  r.fngName = extractField(raw, ['FNG NAME', 'FNG']);
  r.ssStats = extractField(raw, ['SS STATS', 'SS']);
  r.forTags = extractField(raw, ['FOR TAGS', 'FOR TAG', 'FOR']);

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
          const roleObj = guild.roles.cache.get(rid);
          if (!roleObj) continue;
          if (roleObj.position >= botMember.roles.highest.position) continue;
          try {
            await member.roles.remove(rid);
            res.rolesRemoved.push(roleObj.name);
          } catch (err) {
            // ignore per-role errors
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

      // --- Build raw text: prefer message.content, fallback to embed description/fields
      let raw = (message.content || '').trim();
      if ((!raw || raw.length === 0) && message.embeds && message.embeds.length > 0) {
        const e = message.embeds[0];
        raw = (e.title ? e.title + '\n' : '') + (e.description ? e.description + '\n' : '');
        if (e.fields && e.fields.length) raw += e.fields.map(f => `${f.name}: ${f.value}`).join('\n');
        raw = raw.trim();
      }

      // DEBUG: tampilkan apa yang diterima parser (hapus setelah ok)
      console.log('[AUTO-KARANTINA DEBUG] incoming message:', {
        channelId: message.channelId,
        author: message.author.tag,
        isBot: message.author.bot,
        contentLen: (message.content || '').length,
        rawPreview: raw ? raw.slice(0, 800).replace(/\n/g, '\\n') : '(empty)',
        embeds: message.embeds?.length || 0
      });

      // 1) coba parse format lama (LOGS KARANTINA) menggunakan raw
      const karantinaData = parseKarantinaMessage(raw);
      if (karantinaData.isValid) {
        console.log('[AUTO-KARANTINA] Format lama ditemukan, memproses (legacy flow)...');
        const guild = message.guild;
        const results = [];

        try { await guild.members.fetch({ limit: 1000 }); } catch (err) { console.warn('[AUTO-KARANTINA] ⚠️  Gagal pre-fetch members:', err.message); }

        for (const userIdentifier of karantinaData.users) {
          console.log(`\n[AUTO-KARANTINA] ========== Processing (legacy): ${userIdentifier} ==========`);
          const res = { identifier: userIdentifier, found: false, tag: null, oldNickname: null, newNickname: null, rolesRemoved: [], karantinaRoleAdded: false, error: null };

          let member = null;
          try {
            if (/^\d+$/.test(userIdentifier)) {
              try {
                const fetchPromise = guild.members.fetch(userIdentifier);
                member = await Promise.race([ fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 5000)) ]);
              } catch (err) {
                member = null;
              }
            }

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

            if (member.roles.highest.position >= botMember.roles.highest.position) {
              res.error = 'Role member lebih tinggi dari bot';
              results.push(res);
              continue;
            }

            res.found = true;
            res.tag = member.user.tag;
            const currentDisplayName = member.nickname || member.user.username;
            res.oldNickname = currentDisplayName;

            let parts = currentDisplayName.split('|').map(p => p.trim()).filter(Boolean);
            let baseName;
            if (parts.length > 1) {
              if (parts[0].toUpperCase() === 'KARANTINA') baseName = parts.slice(1).join(' | ');
              else baseName = parts[parts.length - 1];
            } else baseName = parts[0];
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

            if (currentDisplayName !== newNick) {
              try { await member.setNickname(newNick); } catch (err) { /* ignore */ }
            }

            // NOTE: Removal of FACTION_ROLE_IDS removed per request.
            // add karantina role
            const karRole = guild.roles.cache.get(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
            if (karRole) {
              try { await member.roles.add(KARANTINA_CONFIG.KARANTINA_ROLE_ID); res.karantinaRoleAdded = true; } catch (err) { /* ignore */ }
            }
          } catch (err) {
            res.error = String(err.message || err);
          }

          results.push(res);
          await new Promise(r => setTimeout(r, 200));
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

          await message.channel.send({ content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`, embeds: [summaryEmbed] });
        } catch (err) {
          console.error('[AUTO-KARANTINA] ❌ gagal mengirim summary embed (legacy):', err?.message || err);
        }

        return;
      }

      // 2) coba parse format FnG (IC NAME / Tag DC / FnG Name)
      const parsedV2 = parseKarantinaMessageV2(raw);
      console.log('[AUTO-KARANTINA DEBUG] parsed FnG format:', parsedV2);
      if (parsedV2.isValid) {
        console.log('[AUTO-KARANTINA] Format FnG ditemukan, memproses (FnG flow)...');
        try {
          const { results, waktuKarantinaStr } = await processFnGMessage(message, parsedV2);

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

          await message.channel.send({ content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`, embeds: [summaryEmbed] });
        } catch (err) {
          console.error('[AUTO-KARANTINA] ❌ gagal memproses FnG flow:', err);
        }

        return;
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
