type Json = Record<string, unknown>;
type Context = { userId: string; admin: any };

type Dependencies = {
  reply: (body: Json, status?: number) => Response;
  error: (message: string, status?: number) => Response;
  sha256: (value: string) => Promise<string>;
};

export function createEndlessService(deps: Dependencies) {
  async function getRecord(ctx: Context) {
    const { data, error } = await ctx.admin.from("endless_records")
      .select("best_kills, best_survival_seconds")
      .eq("player_id", ctx.userId)
      .maybeSingle();
    if (error) throw error;
    return deps.reply({ record: {
      bestKills: Math.max(0, Number(data?.best_kills) || 0),
      bestSurvivalSeconds: Math.max(0, Number(data?.best_survival_seconds) || 0)
    } });
  }

  async function start(ctx: Context) {
    const ticket = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const ticketHash = await deps.sha256(ticket);
    const { data: session, error } = await ctx.admin.from("endless_sessions")
      .insert({ player_id: ctx.userId, ticket_hash: ticketHash, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .select("id, started_at")
      .single();
    if (error) throw error;
    const { data: record, error: recordError } = await ctx.admin.from("endless_records")
      .select("best_kills, best_survival_seconds")
      .eq("player_id", ctx.userId)
      .maybeSingle();
    if (recordError) throw recordError;
    return deps.reply({
      ticket,
      startedAt: session.started_at,
      record: {
        bestKills: Math.max(0, Number(record?.best_kills) || 0),
        bestSurvivalSeconds: Math.max(0, Number(record?.best_survival_seconds) || 0)
      }
    });
  }

  async function finish(ctx: Context, body: Json) {
    const ticketHash = await deps.sha256(String(body.ticket || ""));
    const { data: session, error } = await ctx.admin.from("endless_sessions")
      .select("id, state, started_at, expires_at")
      .eq("player_id", ctx.userId)
      .eq("ticket_hash", ticketHash)
      .maybeSingle();
    if (error) throw error;
    if (!session || session.state !== "started") return deps.error("无尽模式票据无效或已经结算。", 409);
    if (Date.now() > new Date(session.expires_at).getTime()) return deps.error("无尽模式票据已过期。", 409);
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000));
    const survivalSeconds = Math.max(0, Math.floor(Number(body.survivalSeconds) || 0));
    const kills = Math.max(0, Math.floor(Number(body.kills) || 0));
    if (survivalSeconds > elapsedSeconds + 5) return deps.error("生存时长校验未通过。", 409);
    const theoreticalMaximum = Math.floor(elapsedSeconds / 30) + 1;
    if (kills > theoreticalMaximum) return deps.error("击杀数量超过理论最大出怪数。", 409);
    const { data, error: commitError } = await ctx.admin.rpc("commit_endless_result", {
      p_user_id: ctx.userId,
      p_session_id: session.id,
      p_kills: kills,
      p_survival_seconds: survivalSeconds
    });
    if (commitError) throw commitError;
    const record = Array.isArray(data) ? data[0] : data;
    return deps.reply({
      record: {
        bestKills: Math.max(0, Number(record?.best_kills) || 0),
        bestSurvivalSeconds: Math.max(0, Number(record?.best_survival_seconds) || 0)
      },
      kills,
      survivalSeconds
    });
  }

  return { getRecord, start, finish };
}
