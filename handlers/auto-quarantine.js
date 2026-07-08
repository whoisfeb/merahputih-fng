const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ============================================
// CONFIG - SESUAIKAN DENGAN SERVER ANDA
// ============================================
const KARANTINA_CONFIG = {
  KARANTINA_CHANNEL_ID: '1516163567739600927',

  // gunakan array kalau ada beberapa role staff/admin yang harus disimpan
  TEAM_ROLE_IDS: [
    '1499605520661876856',
    '1499605520603025518',
    '1499605520603025517'
  ],

  // Tambahan untuk FnG flow
  FNG_MEMBER_ROLE_ID: '1503361899629379654',
  FNG_LEAD_ROLE_ID: '1499605520603025515',
  VERIFY_ROLE_ID: '1499605520603025512',

  // default durasi karantina (hari) untuk FnG
  DEFAULT_KARANTINA_DAYS: 7,

  // Optional: daftar thread IDs yang diizinkan. Kosong = semua thread di channel diperbolehkan.
  ALLOWED_THREAD_IDS: ['1519223852868173944']
};

// helper untuk mention semua team roles di summary
function teamMentions() {
  if (!Array.isArray(KARANTINA_CONFIG.TEAM_ROLE_IDS) || KARANTINA_CONFIG.TEAM_ROLE_IDS.length === 0) return '';
  return KARANTINA_CONFIG.TEAM_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
}

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
// ============================================
function normalizeRawText(raw) {
  if (!raw) return '';
  return raw.replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function extractField(raw, fieldNames) {
  for (const name of fieldNames) {
    const re = new RegExp(name + '\\s*[:\\-]\\s*(.+)', 'i');
    const m = raw.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function parseKarantinaMessageV2(content) {
  let raw = normalizeRawText(content || '');
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
// PROCESS FnG flow (OUT flow)
// - remove roles except VERIFY_ROLE_ID and TEAM_ROLE_IDS
// - also remove FNG_MEMBER & FNG_LEAD
// - update nickname to periode | baseName
// - logs reasons for skipped roles (managed/position/etc.)
// ============================================
async function processFnGMessage(message, parsed) {
  const guild = message.guild;
  const botMember = guild.members.me;
  const results = [];

  const tagDcText = parsed.tagDC || '';
  const mentionRegex = /<@!?(\d{5,20})>/g;
  const tagMentions = [];
  let m;
  while ((m = mentionRegex.exec(tagDcText)) !== null) tagMentions.push(m[1]);
  const targets = tagMentions.length > 0 ? tagMentions : [message.author.id];

  const fngText = parsed.fngName || '';
  const roleMentionRegex = /<@&(\d{5,20})>/g;
  const roleMentions = [];
  while ((m = roleMentionRegex.exec(fngText)) !== null) roleMentions.push(m[1]);
  let roleNames = [];
  if (roleMentions.length === 0 && fngText) {
    roleNames = fngText.split(/[,\|]+/).map(s => s.trim()).filter(Boolean);
  }

  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + (KARANTINA_CONFIG.DEFAULT_KARANTINA_DAYS - 1));
  const waktuKarantinaStr = `${formatDateId(start)} - ${formatDateId(end)}`;

  try { await guild.members.fetch({ limit: 1000 }); } catch (err) { /* ignore */ }

  for (const userId of targets) {
    const res = {
      identifier: userId,
      found: false,
      oldNickname: null,
      newNickname: null,
      rolesRemoved: [],
      error: null
    };

    try {
      const member = await guild.members.fetch(userId).catch(() => guild.members.cache.get(userId) || null);
      if (!member) {
        res.error = 'Member tidak ditemukan';
        results.push(res);
        continue;
      }

      if (member.roles.highest.position >= botMember.roles.highest.position) {
        res.error = 'Role member lebih tinggi dari bot (tidak bisa diubah)';
        results.push(res);
        continue;
      }

      res.found = true;
      res.oldNickname = member.nickname || member.user.username;

      let baseName = (member.nickname || member.user.username).split('|').map(p => p.trim()).filter(Boolean);
      baseName = baseName.length ? baseName[baseName.length - 1] : member.user.username;
      let newNick = `${waktuKarantinaStr} | ${baseName}`;
      if (newNick.length > 32) {
        const allowed = 32 - (`${waktuKarantinaStr} | `).length;
        baseName = baseName.slice(0, allowed);
        newNick = `${waktuKarantinaStr} | ${baseName}`;
      }
      res.newNickname = newNick;

      try {
        if ((member.nickname || member.user.username) !== newNick) await member.setNickname(newNick);
      } catch (err) { /* ignore */ }

      const mandatoryRemove = [KARANTINA_CONFIG.FNG_MEMBER_ROLE_ID, KARANTINA_CONFIG.FNG_LEAD_ROLE_ID].filter(Boolean);
      const rolesToRemoveSet = new Set(mandatoryRemove.concat(roleMentions));

      if (roleNames.length > 0) {
        for (const rn of roleNames) {
          const foundRole = guild.roles.cache.find(r => r.name.toLowerCase() === rn.toLowerCase());
          if (foundRole) rolesToRemoveSet.add(foundRole.id);
        }
      }

      // If no specific roles listed, remove ALL roles except verify and team roles
      const removeAllExceptKeep = (roleMentions.length === 0 && roleNames.length === 0);

      // debug: print member roles before removal
      console.log('[AUTO-KARANTINA DEBUG] member roles BEFORE removal for', member.user.tag, ':',
        member.roles.cache.map(r => ({ id: r.id, name: r.name, position: r.position, managed: r.managed })));

      if (removeAllExceptKeep) {
        for (const [rid, role] of member.roles.cache) {
          if (rid === guild.id) continue; // @everyone
          if (rid === KARANTINA_CONFIG.VERIFY_ROLE_ID) {
            console.log(`[AUTO-KARANTINA] keep role ${role.name} (${rid}) — verify role`);
            continue;
          }
          const isTeamRole = Array.isArray(KARANTINA_CONFIG.TEAM_ROLE_IDS) && KARANTINA_CONFIG.TEAM_ROLE_IDS.includes(rid);
          if (isTeamRole) {
            console.log(`[AUTO-KARANTINA] keep role ${role.name} (${rid}) — listed in TEAM_ROLE_IDS`);
            continue;
          }

          const roleObj = guild.roles.cache.get(rid);
          if (!roleObj) { console.log(`[AUTO-KARANTINA] skip unknown role id ${rid}`); continue; }
          if (roleObj.managed) {
            console.log(`[AUTO-KARANTINA] skip role ${roleObj.name} (${rid}) — managed role (cannot remove)`);
            continue;
          }
          if (roleObj.position >= botMember.roles.highest.position) {
            console.log(`[AUTO-KARANTINA] skip role ${roleObj.name} (${rid}) — position (${roleObj.position}) >= bot role position (${botMember.roles.highest.position})`);
            continue;
          }

          try {
            await member.roles.remove(rid);
            res.rolesRemoved.push(roleObj.name);
            console.log(`[AUTO-KARANTINA] removed role ${roleObj.name} (${rid}) from ${member.user.tag}`);
          } catch (err) {
            console.warn(`[AUTO-KARANTINA] failed to remove role ${roleObj.name} (${rid}):`, err?.message || err);
          }
        }
      } else {
        for (const rid of Array.from(rolesToRemoveSet)) {
          if (!rid) continue;
          if (!member.roles.cache.has(rid)) continue;
          const roleObj = guild.roles.cache.get(rid);
          if (!roleObj) continue;
          // keep verify/team even if listed (safety)
          if (rid === KARANTINA_CONFIG.VERIFY_ROLE_ID) {
            console.log(`[AUTO-KARANTINA] not removing ${roleObj.name} (${rid}) — it's VERIFY_ROLE_ID`);
            continue;
          }
          const isTeamRole = Array.isArray(KARANTINA_CONFIG.TEAM_ROLE_IDS) && KARANTINA_CONFIG.TEAM_ROLE_IDS.includes(rid);
          if (isTeamRole) {
            console.log(`[AUTO-KARANTINA] not removing ${roleObj.name} (${rid}) — it's listed in TEAM_ROLE_IDS`);
            continue;
          }
          if (roleObj.managed) {
            console.log(`[AUTO-KARANTINA] skip ${roleObj.name} (${rid}) — managed`);
            continue;
          }
          if (roleObj.position >= botMember.roles.highest.position) {
            console.log(`[AUTO-KARANTINA] skip ${roleObj.name} (${rid}) — position >= bot`);
            continue;
          }
          try {
            await member.roles.remove(rid);
            res.rolesRemoved.push(roleObj.name || rid);
            console.log(`[AUTO-KARANTINA] removed listed role ${roleObj.name} (${rid}) from ${member.user.tag}`);
          } catch (err) {
            console.warn(`[AUTO-KARANTINA] failed to remove listed role ${roleObj.name}:`, err?.message || err);
          }
        }
      }

      // Ensure mandatory FNG roles removed (try again after bulk removal)
      for (const mustRid of mandatoryRemove) {
        if (!mustRid) continue;
        if (!member.roles.cache.has(mustRid)) continue;
        const roleObj = guild.roles.cache.get(mustRid);
        if (!roleObj) continue;
        if (roleObj.managed) {
          console.log(`[AUTO-KARANTINA] could not remove mandatory role ${roleObj.name} (${mustRid}) — managed`);
          continue;
        }
        if (roleObj.position >= botMember.roles.highest.position) {
          console.log(`[AUTO-KARANTINA] could not remove mandatory role ${roleObj.name} (${mustRid}) — position >= bot`);
          continue;
        }
        try {
          await member.roles.remove(mustRid);
          if (!res.rolesRemoved.includes(roleObj.name)) res.rolesRemoved.push(roleObj.name);
          console.log(`[AUTO-KARANTINA] removed mandatory role ${roleObj.name} (${mustRid})`);
        } catch (err) {
          console.warn(`[AUTO-KARANTINA] failed to remove mandatory role ${roleObj.name} (${mustRid}):`, err?.message || err);
        }
      }

    } catch (err) {
      res.error = String(err.message || err);
    }

    results.push(res);
    await new Promise(r => setTimeout(r, 200));
  }

  return { results, waktuKarantinaStr };
}

// ============================================
// SETUP AUTO KARANTINA HANDLER
// ============================================
function setupAutoKarantinaHandler(client) {
  client.on('messageCreate', async (message) => {
    try {
      if (!message.guild) return;

      const ch = message.channel;
      let channelValid = false;
      if (message.channelId === KARANTINA_CONFIG.KARANTINA_CHANNEL_ID) {
        channelValid = true;
      } else if (ch && ch.parentId === KARANTINA_CONFIG.KARANTINA_CHANNEL_ID) {
        if (Array.isArray(KARANTINA_CONFIG.ALLOWED_THREAD_IDS) && KARANTINA_CONFIG.ALLOWED_THREAD_IDS.length > 0) {
          channelValid = KARANTINA_CONFIG.ALLOWED_THREAD_IDS.includes(message.channelId);
        } else {
          channelValid = true;
        }
      }

      if (!channelValid) return;
      if (message.author.bot) return;

      const botMember = message.guild.members.me;
      if (!botMember) { console.error('[AUTO-KARANTINA] ❌ Bot member not found in guild'); return; }
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

      let raw = (message.content || '').trim();
      if ((!raw || raw.length === 0) && message.embeds && message.embeds.length > 0) {
        const e = message.embeds[0];
        raw = (e.title ? e.title + '\n' : '') + (e.description ? e.description + '\n' : '');
        if (e.fields && e.fields.length) raw += e.fields.map(f => `${f.name}: ${f.value}`).join('\n');
        raw = raw.trim();
      }

      console.log('[AUTO-KARANTINA DEBUG] incoming message:', {
        channelId: message.channelId,
        parentId: message.channel.parentId || null,
        author: message.author.tag,
        contentLen: (message.content || '').length,
        rawPreview: raw ? raw.slice(0, 800).replace(/\n/g, '\\n') : '(empty)',
        embeds: message.embeds?.length || 0
      });

      // Legacy flow
      const karantinaData = parseKarantinaMessage(raw);
      if (karantinaData.isValid) {
        console.log('[AUTO-KARANTINA] Legacy format detected; processing legacy flow...');
        const guild = message.guild;
        const results = [];
        try { await guild.members.fetch({ limit: 1000 }); } catch (err) { console.warn('[AUTO-KARANTINA] ⚠️  Failed to pre-fetch members:', err?.message || err); }

        for (const userIdentifier of karantinaData.users) {
          const res = { identifier: userIdentifier, found: false, tag: null, oldNickname: null, newNickname: null, rolesRemoved: [], error: null };
          let member = null;
          try {
            if (/^\d+$/.test(userIdentifier)) {
              try {
                const fetchPromise = guild.members.fetch(userIdentifier);
                member = await Promise.race([ fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 5000)) ]);
              } catch (err) { member = null; }
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
            if (!member) { res.error = 'Member tidak ditemukan di guild'; results.push(res); continue; }
            if (member.roles.highest.position >= botMember.roles.highest.position) { res.error = 'Role member lebih tinggi dari bot'; results.push(res); continue; }

            res.found = true;
            res.tag = member.user.tag;
            const currentDisplayName = member.nickname || member.user.username;
            res.oldNickname = currentDisplayName;

            let parts = currentDisplayName.split('|').map(p => p.trim()).filter(Boolean);
            let baseName;
            if (parts.length > 1) {
              if (parts[0].toUpperCase() === 'KARANTINA') baseName = parts.slice(1).join(' | ');
              else baseName = parts[parts.length - 1];
            } else baseName = parts[0] || member.user.username;
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

          } catch (err) {
            res.error = String(err.message || err);
          }
          results.push(res);
          await new Promise(r => setTimeout(r, 200));
        }

        try {
          const lines = results.map(r => {
            if (!r.found) return `• ${r.identifier} — ❌ ${r.error || 'tidak ditemukan'}`;
            const removed = r.rolesRemoved.length ? r.rolesRemoved.join(', ') : 'Tidak ada';
            return `• ${r.tag} — ✅\n    - Nama Lama: ${r.oldNickname}\n    - Nama Baru: ${r.newNickname}\n    - Roles Dihapus: ${removed}`;
          }).join('\n\n');

          const description = lines.length > 4096 ? lines.substring(0, 4093) + '...' : lines;
          const summaryEmbed = new EmbedBuilder()
            .setTitle('Auto Karantina - Summary')
            .setColor(0xFF6B6B)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Auto Karantina System' });

          await message.channel.send({ content: teamMentions(), embeds: [summaryEmbed] });
        } catch (err) {
          console.error('[AUTO-KARANTINA] ❌ gagal mengirim summary embed (legacy):', err?.message || err);
        }
        return;
      }

      // FnG flow
      const parsedV2 = parseKarantinaMessageV2(raw);
      console.log('[AUTO-KARANTINA DEBUG] parsedFnG:', parsedV2);
      if (parsedV2.isValid) {
        console.log('[AUTO-KARANTINA] FnG format detected; processing FnG OUT flow...');
        try {
          const { results, waktuKarantinaStr } = await processFnGMessage(message, parsedV2);

          const lines = results.map(r => {
            if (!r.found) return `• ${r.identifier} — ❌ ${r.error || 'tidak ditemukan'}`;
            const removed = r.rolesRemoved.length ? r.rolesRemoved.join(', ') : 'Tidak ada';
            return `• ${r.identifier} (${r.oldNickname}) — ✅\n    - Nama Baru: ${r.newNickname}\n    - Roles Dihapus: ${removed}`;
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

          await message.channel.send({ content: teamMentions(), embeds: [summaryEmbed] });
        } catch (err) {
          console.error('[AUTO-KARANTINA] ❌ gagal memproses FnG flow:', err);
        }
        return;
      }

      console.log('[AUTO-KARANTINA] ⚠️  Tidak ada format yang cocok, ignore pesan.');
      return;

    } catch (error) {
      console.error('[AUTO-KARANTINA] ❌ Error di handler:', error);
    }
  });

  console.log('[AUTO-KARANTINA] Handler berhasil di-setup!');
}

module.exports = { setupAutoKarantinaHandler, KARANTINA_CONFIG };
