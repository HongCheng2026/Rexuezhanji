type Json = Record<string, unknown>;
type Context = { userId: string; admin: any };
type ProfileLoader = (ctx: Context) => Promise<{ profile: any; revision: number; uid: number }>;

type Dependencies = {
  reply: (body: Json, status?: number) => Response;
  error: (message: string, status?: number) => Response;
  loadProfile: ProfileLoader;
  readHonorTier: (value: unknown) => number;
  pilotRankById: Record<string, "B" | "A" | "S">;
  shipRankById: Record<string, "B" | "A" | "S">;
};

export function createSocialService(deps: Dependencies) {
  async function touchLastSeen(ctx: Context) {
    await ctx.admin.from("player_profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", ctx.userId);
  }

  async function getPlayerName(ctx: Context) {
    const { data } = await ctx.admin.from("player_profiles").select("profile").eq("user_id", ctx.userId).maybeSingle();
    const profile = data?.profile as any;
    return (profile?.player?.name || "").slice(0, 20) || "指挥官";
  }

  async function resolvePublicUid(ctx: Context, publicUid: number) {
    const { data, error } = await ctx.admin.from("player_profiles")
      .select("user_id, profile, public_uid")
      .eq("public_uid", publicUid)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("玩家不存在。");
    return {
      userId: data.user_id,
      name: ((data.profile as any)?.player?.name || "").slice(0, 20) || "指挥官",
      publicUid: data.public_uid
    };
  }

  function getLeaderboardScores(profile: any) {
    const pilotPower = { B: 2500, A: 4200, S: 6500 } as const;
    const shipPower = { B: 3600, A: 6200, S: 9200 } as const;
    const pilots = Array.isArray(profile.owned?.pilots) ? profile.owned.pilots : [];
    const ships = Array.isArray(profile.owned?.ships) ? profile.owned.ships : [];
    const upgrades = profile.fighterUpgrades || {};
    const upgradePower = Math.max(0, Number(upgrades.attack || 1) - 1) * 10
      + Math.max(0, Number(upgrades.hp || 1) - 1) * 20
      + Math.max(0, Number(upgrades.armorPenetration || 1) - 1) * 1.8;
    const power = Math.round(
      pilots.reduce((sum: number, id: string) => sum + pilotPower[deps.pilotRankById[id] || "B"], 0)
      + ships.reduce((sum: number, id: string) => sum + shipPower[deps.shipRankById[id] || "B"], 0)
      + upgradePower
    );
    const clear = Math.max(Number(profile.progress?.clearCount) || 0, Array.isArray(profile.completed) ? profile.completed.length : 0);
    const honors = Object.values(profile.progress?.stageHonors || {}).map(deps.readHonorTier);
    return { power, clear: Math.floor(clear), honor: Math.floor(honors.length ? Math.max(...honors) : 0) };
  }

  async function refreshLeaderboard(ctx: Context, profile: any) {
    const scores = getLeaderboardScores(profile);
    const rows = (["power", "clear", "honor"] as const).map((category) => ({
      player_id: ctx.userId,
      public_uid: Number(profile.player?.uid || 0),
      player_name: String(profile.player?.name || "指挥官").slice(0, 20) || "指挥官",
      category,
      score: scores[category],
      season: 1,
      updated_at: new Date().toISOString()
    }));
    const { error } = await ctx.admin.from("leaderboard_entries").upsert(rows, { onConflict: "player_id,category,season" });
    if (error) throw error;
    return scores;
  }

  async function leaderboardSubmit(ctx: Context, body: Json) {
    const category = String(body.category || "power");
    if (!["power", "clear", "honor"].includes(category)) return deps.error("无效的排行榜分类。", 400);
    const { profile } = await deps.loadProfile(ctx);
    const scores = await refreshLeaderboard(ctx, profile);
    await touchLastSeen(ctx);
    return deps.reply({ ok: true, category, score: scores[category as keyof typeof scores] });
  }

  function assignCompetitionRanks<T extends { score: number }>(entries: T[]) {
    let previousScore: number | null = null;
    let currentRank = 0;
    return entries.map((entry, index) => {
      const score = Math.max(0, Math.floor(Number(entry.score) || 0));
      if (previousScore === null || score !== previousScore) currentRank = index + 1;
      previousScore = score;
      return { ...entry, score, rank: currentRank };
    });
  }

  async function endlessLeaderboardFetch(ctx: Context, identity: { profile: any; uid: number }) {
    const { data: records, error: recordsError } = await ctx.admin.from("endless_records")
      .select("player_id, best_kills, best_survival_seconds")
      .order("best_kills", { ascending: false })
      .order("best_survival_seconds", { ascending: false })
      .limit(100);
    if (recordsError) throw recordsError;
    const playerIds = [...new Set((records || []).map((record: any) => String(record.player_id)))];
    const profileResult = playerIds.length
      ? await ctx.admin.from("player_profiles").select("user_id, public_uid, profile").in("user_id", playerIds)
      : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;
    const profilesById = new Map<string, any>((profileResult.data || []).map((row: any) => [String(row.user_id), row]));
    const rows = assignCompetitionRanks((records || []).map((record: any) => {
      const player = profilesById.get(String(record.player_id));
      const kills = Math.max(0, Math.floor(Number(record.best_kills) || 0));
      const survivalSeconds = Math.max(0, Math.floor(Number(record.best_survival_seconds) || 0));
      return {
        publicUid: Math.max(0, Math.floor(Number(player?.public_uid) || 0)),
        name: String(player?.profile?.player?.name || "指挥官").slice(0, 20),
        score: kills * 1000000 + survivalSeconds,
        kills,
        survivalSeconds
      };
    }));
    const { data: selfRecord, error: selfError } = await ctx.admin.from("endless_records")
      .select("best_kills, best_survival_seconds")
      .eq("player_id", ctx.userId)
      .maybeSingle();
    if (selfError) throw selfError;
    let self = null;
    if (selfRecord) {
      const kills = Math.max(0, Math.floor(Number(selfRecord.best_kills) || 0));
      const survivalSeconds = Math.max(0, Math.floor(Number(selfRecord.best_survival_seconds) || 0));
      const listed = rows.find((row: any) => Number(row.publicUid) === Number(identity.uid));
      let rank = listed ? listed.rank : -1;
      if (!listed) {
        const [higherKills, longerSurvival] = await Promise.all([
          ctx.admin.from("endless_records").select("*", { count: "exact", head: true }).gt("best_kills", kills),
          ctx.admin.from("endless_records").select("*", { count: "exact", head: true }).eq("best_kills", kills).gt("best_survival_seconds", survivalSeconds)
        ]);
        if (higherKills.error) throw higherKills.error;
        if (longerSurvival.error) throw longerSurvival.error;
        rank = (higherKills.count || 0) + (longerSurvival.count || 0) + 1;
      }
      self = {
        publicUid: identity.uid,
        name: String(identity.profile?.player?.name || "指挥官").slice(0, 20),
        score: kills * 1000000 + survivalSeconds,
        rank,
        kills,
        survivalSeconds
      };
    }
    return deps.reply({ rows, self, season: 1 });
  }

  async function leaderboardFetch(ctx: Context, body: Json) {
    const category = String(body.category || "power");
    const season = Math.max(1, Math.floor(Number(body.season) || 1));
    if (!["power", "endless", "clear", "honor"].includes(category)) return deps.error("无效的排行榜分类。", 400);
    const identity = await deps.loadProfile(ctx);
    if (category === "endless") {
      const response = await endlessLeaderboardFetch(ctx, identity);
      await touchLastSeen(ctx);
      return response;
    }
    const { data: entries, error } = await ctx.admin.from("leaderboard_entries")
      .select("public_uid, player_name, score")
      .eq("category", category)
      .eq("season", season)
      .order("score", { ascending: false })
      .limit(100);
    if (error) throw error;
    const { data: selfEntry, error: selfError } = await ctx.admin.from("leaderboard_entries")
      .select("score")
      .eq("player_id", ctx.userId)
      .eq("category", category)
      .eq("season", season)
      .maybeSingle();
    if (selfError) throw selfError;
    const rows = assignCompetitionRanks((entries || []).map((entry: any) => ({ publicUid: entry.public_uid, name: entry.player_name, score: entry.score })));
    let selfRank = -1;
    if (selfEntry) {
      const { count, error: countError } = await ctx.admin.from("leaderboard_entries")
        .select("*", { count: "exact", head: true })
        .eq("category", category)
        .eq("season", season)
        .gt("score", selfEntry.score);
      if (countError) throw countError;
      selfRank = (count || 0) + 1;
    }
    await touchLastSeen(ctx);
    return deps.reply({
      rows,
      self: selfEntry ? {
        publicUid: identity.uid,
        name: String(identity.profile?.player?.name || "指挥官").slice(0, 20),
        score: selfEntry.score,
        rank: selfRank
      } : null,
      season
    });
  }

  async function findFriendRelation(ctx: Context, otherUserId: string) {
    const columns = "id, status, from_player, to_player";
    const [{ data: outgoing, error: outgoingError }, { data: incoming, error: incomingError }] = await Promise.all([
      ctx.admin.from("friend_relations").select(columns).eq("from_player", ctx.userId).eq("to_player", otherUserId).maybeSingle(),
      ctx.admin.from("friend_relations").select(columns).eq("from_player", otherUserId).eq("to_player", ctx.userId).maybeSingle()
    ]);
    if (outgoingError) throw outgoingError;
    if (incomingError) throw incomingError;
    return outgoing || incoming || null;
  }

  async function friendSearch(ctx: Context, body: Json) {
    const publicUid = Math.floor(Number(body.publicUid));
    if (!publicUid || publicUid < 100000001) return deps.error("请输入有效的玩家 ID。", 400);
    const { uid } = await deps.loadProfile(ctx);
    if (publicUid === Number(uid)) return deps.error("不能搜索自己。", 400);
    const target = await resolvePublicUid(ctx, publicUid);
    const relation = await findFriendRelation(ctx, target.userId);
    await touchLastSeen(ctx);
    return deps.reply({
      publicUid: target.publicUid,
      name: target.name,
      relation: relation ? { id: relation.id, status: relation.status, direction: relation.from_player === ctx.userId ? "sent" : "received" } : null
    });
  }

  async function friendRequest(ctx: Context, body: Json) {
    const publicUid = Math.floor(Number(body.toPublicUid));
    if (!publicUid || publicUid < 100000001) return deps.error("请输入有效的玩家 ID。", 400);
    const { uid } = await deps.loadProfile(ctx);
    if (publicUid === Number(uid)) return deps.error("不能添加自己为好友。", 400);
    const target = await resolvePublicUid(ctx, publicUid);
    const relation = await findFriendRelation(ctx, target.userId);
    if (relation) {
      if (relation.status === "accepted") return deps.error("你们已经是好友了。", 409);
      if (relation.status === "pending" && relation.from_player === ctx.userId) return deps.error("已发送过好友请求，请等待对方回应。", 409);
      if (relation.status === "pending" && relation.to_player === ctx.userId) return deps.error("对方已向你发送好友请求，请先回应。", 409);
      if (relation.status === "rejected") await ctx.admin.from("friend_relations").delete().eq("id", relation.id);
    }
    const { error } = await ctx.admin.from("friend_relations").insert({ from_player: ctx.userId, to_player: target.userId, status: "pending" });
    if (error) throw error;
    await touchLastSeen(ctx);
    return deps.reply({ ok: true, toPublicUid: target.publicUid, toName: target.name });
  }

  async function friendRespond(ctx: Context, body: Json) {
    const requestId = Math.floor(Number(body.requestId));
    const action = String(body.action || "");
    if (!requestId || !["accept", "reject"].includes(action)) return deps.error("无效的操作。", 400);
    const { data: relation, error } = await ctx.admin.from("friend_relations")
      .select("id, from_player, to_player, status")
      .eq("id", requestId)
      .single();
    if (error || !relation) return deps.error("请求不存在。", 404);
    if (relation.to_player !== ctx.userId) return deps.error("无权操作此请求。", 403);
    if (relation.status !== "pending") return deps.error("此请求已处理。", 409);
    const { error: updateError } = await ctx.admin.from("friend_relations").update({ status: action === "accept" ? "accepted" : "rejected" }).eq("id", requestId);
    if (updateError) throw updateError;
    await touchLastSeen(ctx);
    return deps.reply({ ok: true, requestId, action });
  }

  async function friendList(ctx: Context) {
    await deps.loadProfile(ctx);
    const [{ data: outgoing, error: outgoingError }, { data: incoming, error: incomingError }, { data: pending, error: pendingError }] = await Promise.all([
      ctx.admin.from("friend_relations").select("id, from_player, to_player, status").eq("from_player", ctx.userId).eq("status", "accepted"),
      ctx.admin.from("friend_relations").select("id, from_player, to_player, status").eq("to_player", ctx.userId).eq("status", "accepted"),
      ctx.admin.from("friend_relations").select("id, from_player").eq("to_player", ctx.userId).eq("status", "pending")
    ]);
    if (outgoingError) throw outgoingError;
    if (incomingError) throw incomingError;
    if (pendingError) throw pendingError;
    const relations = [...(outgoing || []), ...(incoming || [])];
    const friendIds = relations.map((relation: any) => relation.from_player === ctx.userId ? relation.to_player : relation.from_player);
    const profileResult = friendIds.length
      ? await ctx.admin.from("player_profiles").select("user_id, public_uid, profile, last_seen_at").in("user_id", friendIds)
      : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;
    const friends = (profileResult.data || []).map((row: any) => ({
      publicUid: row.public_uid,
      name: ((row.profile as any)?.player?.name || "").slice(0, 20) || "指挥官",
      level: Number((row.profile as any)?.player?.level || 1),
      isOnline: new Date(row.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000
    }));
    const pendingRequests: Array<{ id: number; publicUid: number; name: string }> = [];
    if (pending?.length) {
      const ids = pending.map((row: any) => row.from_player);
      const { data: profiles, error } = await ctx.admin.from("player_profiles").select("user_id, public_uid, profile").in("user_id", ids);
      if (error) throw error;
      const profileMap = new Map((profiles || []).map((row: any) => [row.user_id, row]));
      for (const request of pending) {
        const row: any = profileMap.get(request.from_player);
        pendingRequests.push({ id: request.id, publicUid: row?.public_uid || 0, name: (row?.profile?.player?.name || "指挥官").slice(0, 20) });
      }
    }
    await touchLastSeen(ctx);
    return deps.reply({ friends, pendingRequests: pendingRequests.slice(0, 20) });
  }

  async function friendRemove(ctx: Context, body: Json) {
    const publicUid = Math.floor(Number(body.friendPublicUid));
    if (!publicUid || publicUid < 100000001) return deps.error("无效的玩家 ID。", 400);
    const target = await resolvePublicUid(ctx, publicUid);
    const relation = await findFriendRelation(ctx, target.userId);
    if (relation) {
      const { error } = await ctx.admin.from("friend_relations").delete().eq("id", relation.id);
      if (error) throw error;
    }
    await touchLastSeen(ctx);
    return deps.reply({ ok: true });
  }

  async function chatSend(ctx: Context, body: Json) {
    const message = String(body.message || "").trim();
    if (!message || message.length > 200) return deps.error("消息长度需在 1-200 字符之间。", 400);
    const { data: latest, error: readError } = await ctx.admin.from("chat_messages")
      .select("created_at")
      .eq("player_id", ctx.userId)
      .eq("channel", "world")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;
    if (latest && Date.now() - new Date(latest.created_at).getTime() < 3000) return deps.error("发送太快了，请 3 秒后再试。", 429);
    const { uid } = await deps.loadProfile(ctx);
    const { error } = await ctx.admin.from("chat_messages").insert({
      player_id: ctx.userId,
      public_uid: Number(uid),
      player_name: await getPlayerName(ctx),
      channel: "world",
      message
    });
    if (error) throw error;
    await touchLastSeen(ctx);
    return deps.reply({ ok: true });
  }

  async function chatPoll(ctx: Context, body: Json) {
    let query = ctx.admin.from("chat_messages")
      .select("id, player_id, public_uid, player_name, message, created_at, channel")
      .eq("channel", "world")
      .order("created_at", { ascending: false })
      .limit(50);
    const since = String(body.since || "");
    const sinceDate = since ? new Date(since) : null;
    if (sinceDate && !isNaN(sinceDate.getTime())) query = query.gt("created_at", sinceDate.toISOString());
    const { data, error } = await query;
    if (error) throw error;
    await touchLastSeen(ctx);
    return deps.reply({ messages: (data || []).reverse() });
  }

  return {
    refreshLeaderboard,
    leaderboardSubmit,
    leaderboardFetch,
    friendSearch,
    friendRequest,
    friendRespond,
    friendList,
    friendRemove,
    chatSend,
    chatPoll
  };
}
