-- 热血战姬 云存档数据库迁移
-- 部署方式：在 Supabase SQL Editor 中执行，或通过 supabase db push

-- ============================================================
-- 1. 玩家存档表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version       int NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 更新时自动刷新 updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. 战斗票据表（服务端校验战斗，防作弊）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.battle_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id    int NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','abandoned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  used_at     timestamptz
);

CREATE INDEX idx_battle_tickets_user ON public.battle_tickets(user_id, status);

-- ============================================================
-- 3. 兑换码表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.redeem_codes (
  code              text PRIMARY KEY,
  min_commander_level int NOT NULL DEFAULT 1,
  rewards           jsonb NOT NULL,
  max_uses          int DEFAULT NULL,  -- NULL = 不限
  current_uses      int NOT NULL DEFAULT 0,
  expires_at        timestamptz DEFAULT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. 兑换记录表
CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL REFERENCES public.redeem_codes(code),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- ============================================================
-- 5. RLS 安全策略：用户只能读/写自己的数据
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能操作自己的存档
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- battle_tickets: 用户只能操作自己的票据
DROP POLICY IF EXISTS "Users can read own tickets" ON public.battle_tickets;
CREATE POLICY "Users can read own tickets" ON public.battle_tickets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.battle_tickets;
CREATE POLICY "Users can insert own tickets" ON public.battle_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tickets" ON public.battle_tickets;
CREATE POLICY "Users can update own tickets" ON public.battle_tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- redeem_codes: 所有人可读（用于验证码有效性），但不可直接改
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read codes" ON public.redeem_codes;
CREATE POLICY "Anyone can read codes" ON public.redeem_codes
  FOR SELECT USING (true);

-- code_redemptions: 用户只能读自己的兑换记录
DROP POLICY IF EXISTS "Users can read own redemptions" ON public.code_redemptions;
CREATE POLICY "Users can read own redemptions" ON public.code_redemptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own redemptions" ON public.code_redemptions;
CREATE POLICY "Users can insert own redemptions" ON public.code_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. 初始化兑换码数据
-- ============================================================
INSERT INTO public.redeem_codes (code, min_commander_level, rewards, max_uses) VALUES
  ('RXZJ666',     1,  '[{"type":"gold","amount":30000},{"type":"stamina","amount":50}]'::jsonb,  NULL),
  ('SKY2026',     1,  '[{"type":"gold","amount":50000}]'::jsonb,                               NULL),
  ('FIGHTER888',  5,  '[{"type":"gold","amount":80000},{"type":"item","itemId":"fighter_upgrade_ticket","amount":1}]'::jsonb, NULL),
  ('PILOT888',    3,  '[{"type":"gold","amount":60000},{"type":"item","itemId":"pilot_training_chip","amount":3}]'::jsonb, NULL),
  ('ACE2026',    10,  '[{"type":"gold","amount":100000},{"type":"stamina","amount":100}]'::jsonb, NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. 服务端 Postgres 函数（供 Edge Function 调用，保证原子性）
-- ============================================================

-- 7a. bootstrap：获取或创建玩家存档
CREATE OR REPLACE FUNCTION public.bootstrap_profile()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
BEGIN
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    v_profile := '{"saveVersion":5,"coins":0,"completed":[],"unlockedLevel":1,"upgrades":{"fire":0,"armor":0,"engine":0,"bounty":0},"fighterUpgrades":{"attack":1,"armorPenetration":1,"hp":1},"player":{"name":"王牌飞行员","level":1,"exp":0,"expMax":130,"totalExp":0,"badge":"I"},"resources":{"energy":305,"maxEnergy":305,"gold":0,"diamonds":0,"lastEnergyAt":0},"scene":{"pilotId":"pilot-s-lingyan","shipId":"ship-a-06","backgroundId":"bg-hangar-01"},"owned":{"pilots":["pilot-s-lingyan"],"ships":["ship-a-06"],"backgrounds":["bg-hangar-01"]},"ratings":{},"localEarned":{"gold":0,"diamonds":0},"usedRedeemCodes":[],"progress":{"clearedStageIds":[],"clearedChapterIds":[],"stageStars":{},"perfectClearCount":0,"noDamageBossClearCount":0,"clearCount":0}}'::jsonb;
    INSERT INTO public.profiles (user_id, profile_data) VALUES (v_user_id, v_profile);
  END IF;
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7b. 开始战斗：扣除体力，创建票据
CREATE OR REPLACE FUNCTION public.start_battle(p_level_id int)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_energy int;
  v_ticket_id uuid;
  v_energy_cost int := 5;
BEGIN
  -- 获取存档
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 体力恢复计算
  v_energy := COALESCE((v_profile->'resources'->>'energy')::int, 0);
  IF v_energy < v_energy_cost THEN
    RETURN jsonb_build_object('error', 'NOT_ENOUGH_ENERGY', 'current', v_energy, 'required', v_energy_cost);
  END IF;

  -- 扣除体力
  v_profile := jsonb_set(v_profile, '{resources,energy}', to_jsonb(v_energy - v_energy_cost));
  v_profile := jsonb_set(v_profile, '{resources,lastEnergyAt}', to_jsonb(floor(extract(epoch FROM now()) * 1000)::bigint));
  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  -- 创建战斗票据
  INSERT INTO public.battle_tickets (user_id, level_id) VALUES (v_user_id, p_level_id) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ticket', v_ticket_id,
    'energy', v_energy - v_energy_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7c. 结束战斗：校验票据，发放奖励
CREATE OR REPLACE FUNCTION public.finish_battle(
  p_ticket_id uuid,
  p_level_id int,
  p_killed_enemies int,
  p_total_enemies int,
  p_powerups_collected int DEFAULT 0,
  p_powerups_spawned int DEFAULT 0,
  p_boss_clear_time float DEFAULT 60
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ticket record;
  v_profile jsonb;
  v_clear_rate float;
  v_gold_reward int;
  v_exp_reward int;
  v_level_data jsonb;
  v_old_level int;
  v_new_level int;
  v_stars int;
  v_total_exp bigint;
  v_player jsonb;
  v_resources jsonb;
  v_progress jsonb;
BEGIN
  -- 验证票据
  SELECT * INTO v_ticket FROM public.battle_tickets
    WHERE id = p_ticket_id AND user_id = v_user_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_TICKET');
  END IF;

  -- 获取存档
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 计算击杀率
  v_clear_rate := CASE WHEN p_total_enemies > 0
    THEN LEAST(1.0, GREATEST(0.0, p_killed_enemies::float / p_total_enemies::float))
    ELSE 0.0 END;

  -- 服务端计算奖励（公式与 shared/battleRules.js 一致）
  v_gold_reward := floor(1000 * v_clear_rate)::int;
  v_exp_reward  := GREATEST(5, floor(v_gold_reward * 0.28 + (p_level_id * 12))::int);

  -- 满分额外奖励
  IF v_clear_rate >= 1.0 THEN
    v_gold_reward := 1000;
    v_exp_reward  := 100;
  END IF;

  -- 星级评定
  v_stars := 1;
  IF p_powerups_spawned > 0 AND p_powerups_collected = p_powerups_spawned THEN v_stars := v_stars + 1; END IF;
  IF p_killed_enemies >= p_total_enemies THEN v_stars := v_stars + 1; END IF;

  -- 更新玩家经验
  v_player := v_profile->'player';
  v_old_level := COALESCE((v_player->>'level')::int, 1);
  v_total_exp := GREATEST(0, COALESCE((v_player->>'totalExp')::bigint, 0)) + v_exp_reward;
  v_new_level := v_old_level;

  -- 简单升级计算（完整版在 shared/profile.js，这里做服务端校验用）
  -- 使用 commander exp 表的前几级做校验
  WHILE v_new_level < 60 AND v_total_exp >= CASE v_new_level
    WHEN 1 THEN 130 WHEN 2 THEN 320 WHEN 3 THEN 544 WHEN 4 THEN 790 WHEN 5 THEN 1056
    WHEN 6 THEN 1338 WHEN 7 THEN 1636 WHEN 8 THEN 1946 WHEN 9 THEN 2268 WHEN 10 THEN 2602
    ELSE v_total_exp + 1 END
  LOOP
    v_new_level := v_new_level + 1;
  END LOOP;

  v_player := jsonb_set(v_player, '{level}', to_jsonb(v_new_level));
  v_player := jsonb_set(v_player, '{totalExp}', to_jsonb(v_total_exp));
  v_player := jsonb_set(v_player, '{exp}', to_jsonb(0));
  v_player := jsonb_set(v_player, '{badge}', to_jsonb(
    CASE WHEN v_new_level >= 30 THEN 'V'
         WHEN v_new_level >= 20 THEN 'IV'
         WHEN v_new_level >= 12 THEN 'III'
         WHEN v_new_level >= 6 THEN 'II'
         ELSE 'I' END
  ));

  -- 更新资源
  v_resources := v_profile->'resources';
  v_resources := jsonb_set(v_resources, '{gold}', to_jsonb(
    GREATEST(0, COALESCE((v_resources->>'gold')::int, 0)) + v_gold_reward
  ));
  -- 体力上限随等级提升
  v_resources := jsonb_set(v_resources, '{maxEnergy}', to_jsonb(300 + v_new_level * 5));

  -- 更新进度
  v_progress := COALESCE(v_profile->'progress', '{}'::jsonb);
  v_progress := jsonb_set(v_progress, '{clearCount}',
    to_jsonb(COALESCE((v_progress->>'clearCount')::int, 0) + 1));
  IF v_clear_rate >= 1.0 THEN
    v_progress := jsonb_set(v_progress, '{perfectClearCount}',
      to_jsonb(COALESCE((v_progress->>'perfectClearCount')::int, 0) + 1));
  END IF;

  -- 组装存档
  v_profile := jsonb_set(v_profile, '{player}', v_player);
  v_profile := jsonb_set(v_profile, '{resources}', v_resources);
  v_profile := jsonb_set(v_profile, '{progress}', v_progress);
  v_profile := jsonb_set(v_profile, '{coins}', v_resources->'gold');
  v_profile := jsonb_set(v_profile, '{completed}',
    COALESCE(v_profile->'completed', '[]'::jsonb) || to_jsonb(p_level_id));

  -- 评级
  v_profile := jsonb_set(v_profile, '{ratings}',
    jsonb_set(COALESCE(v_profile->'ratings', '{}'::jsonb),
      ARRAY[p_level_id::text],
      to_jsonb(GREATEST(v_stars, COALESCE((v_profile->'ratings'->>(p_level_id::text))::int, 0)))
    )
  );

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  -- 标记票据已使用
  UPDATE public.battle_tickets SET status = 'used', used_at = now() WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'ok', true,
    'goldEarned', v_gold_reward,
    'expEarned', v_exp_reward,
    'newLevel', v_new_level,
    'leveled', GREATEST(0, v_new_level - v_old_level),
    'stars', v_stars,
    'clearRate', round(v_clear_rate * 100)::int
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7d. 放弃战斗：退款部分体力
CREATE OR REPLACE FUNCTION public.abandon_battle(p_ticket_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ticket record;
BEGIN
  SELECT * INTO v_ticket FROM public.battle_tickets
    WHERE id = p_ticket_id AND user_id = v_user_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true); -- 幂等
  END IF;

  UPDATE public.battle_tickets SET status = 'abandoned' WHERE id = p_ticket_id;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7e. 扫荡：扣除体力，发放扫荡奖励
CREATE OR REPLACE FUNCTION public.sweep_level(p_level_id int)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_energy int;
  v_energy_cost int := 5;
  v_completed jsonb;
  v_gold int;
  v_exp int;
  v_player jsonb;
  v_resources jsonb;
BEGIN
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 验证关卡已完成
  v_completed := v_profile->'completed';
  IF v_completed IS NULL OR NOT v_completed @> to_jsonb(p_level_id) THEN
    RETURN jsonb_build_object('error', 'LEVEL_NOT_COMPLETED');
  END IF;

  -- 体力检查
  v_energy := COALESCE((v_profile->'resources'->>'energy')::int, 0);
  IF v_energy < v_energy_cost THEN
    RETURN jsonb_build_object('error', 'NOT_ENOUGH_ENERGY');
  END IF;

  -- 扫荡奖励（72% 正常奖励 + 55% 经验）
  v_gold := floor(260 * 0.72)::int;  -- 基础扫荡金币（实际由关卡 reward 决定，这里用最低档）
  v_exp  := floor(100 * 0.55)::int;

  -- 扣除体力
  v_resources := v_profile->'resources';
  v_resources := jsonb_set(v_resources, '{energy}', to_jsonb(v_energy - v_energy_cost));
  v_resources := jsonb_set(v_resources, '{gold}', to_jsonb(
    GREATEST(0, COALESCE((v_resources->>'gold')::int, 0)) + v_gold
  ));

  -- 加经验
  v_player := v_profile->'player';
  v_player := jsonb_set(v_player, '{totalExp}', to_jsonb(
    GREATEST(0, COALESCE((v_player->>'totalExp')::bigint, 0)) + v_exp
  ));

  v_profile := jsonb_set(v_profile, '{resources}', v_resources);
  v_profile := jsonb_set(v_profile, '{player}', v_player);
  v_profile := jsonb_set(v_profile, '{coins}', v_resources->'gold');

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'goldEarned', v_gold, 'expEarned', v_exp);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7f. 升级属性
CREATE OR REPLACE FUNCTION public.upgrade_stat(p_upgrade_key text)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_upgrades jsonb;
  v_current int;
  v_cost int;
  v_base_cost int;
  v_max_level int;
  v_gold int;
BEGIN
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 升级配置（与 shared/levels.js 一致）
  v_base_cost := CASE p_upgrade_key
    WHEN 'fire'   THEN 90
    WHEN 'armor'  THEN 130
    WHEN 'engine' THEN 110
    WHEN 'bounty' THEN 100
    ELSE 0 END;
  v_max_level := CASE p_upgrade_key
    WHEN 'fire'   THEN 10
    WHEN 'armor'  THEN 6
    WHEN 'engine' THEN 6
    WHEN 'bounty' THEN 8
    ELSE 0 END;

  IF v_base_cost = 0 THEN
    RETURN jsonb_build_object('error', 'INVALID_UPGRADE_KEY');
  END IF;

  v_upgrades := COALESCE(v_profile->'upgrades', '{}'::jsonb);
  v_current := COALESCE((v_upgrades->>p_upgrade_key)::int, 0);

  IF v_current >= v_max_level THEN
    RETURN jsonb_build_object('error', 'MAX_LEVEL');
  END IF;

  v_cost := v_base_cost * (v_current + 1);
  v_gold := COALESCE((v_profile->'resources'->>'gold')::int, 0);

  IF v_gold < v_cost THEN
    RETURN jsonb_build_object('error', 'NOT_ENOUGH_GOLD', 'required', v_cost, 'current', v_gold);
  END IF;

  -- 扣除金币，升级
  v_profile := jsonb_set(v_profile, '{resources,gold}', to_jsonb(v_gold - v_cost));
  v_profile := jsonb_set(v_profile, '{coins}', to_jsonb(v_gold - v_cost));
  v_profile := jsonb_set(v_profile, ARRAY['upgrades', p_upgrade_key], to_jsonb(v_current + 1));

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'newLevel', v_current + 1, 'goldSpent', v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7g. 兑换码
CREATE OR REPLACE FUNCTION public.redeem_code_fn(p_code text)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_code_record record;
  v_player_level int;
  v_used_codes jsonb;
  v_rewards jsonb;
  v_reward record;
  v_resources jsonb;
BEGIN
  -- 规范化 code
  p_code := upper(regexp_replace(trim(p_code), '\s+', '', 'g'));

  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 检查是否已兑换
  v_used_codes := COALESCE(v_profile->'usedRedeemCodes', '[]'::jsonb);
  IF v_used_codes @> to_jsonb(p_code) THEN
    RETURN jsonb_build_object('error', 'CODE_ALREADY_USED');
  END IF;

  -- 查找兑换码
  SELECT * INTO v_code_record FROM public.redeem_codes WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'CODE_NOT_FOUND');
  END IF;

  -- 检查过期
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'CODE_EXPIRED');
  END IF;

  -- 检查使用次数限制
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object('error', 'CODE_EXHAUSTED');
  END IF;

  -- 检查等级要求
  v_player_level := COALESCE((v_profile->'player'->>'level')::int, 1);
  IF v_player_level < v_code_record.min_commander_level THEN
    RETURN jsonb_build_object('error', 'PLAYER_LEVEL_NOT_ENOUGH',
      'required', v_code_record.min_commander_level);
  END IF;

  -- 发放奖励
  v_resources := v_profile->'resources';
  v_rewards := v_code_record.rewards;

  FOR v_reward IN SELECT * FROM jsonb_array_elements(v_rewards) AS r
  LOOP
    IF v_reward.r->>'type' = 'gold' THEN
      v_resources := jsonb_set(v_resources, '{gold}', to_jsonb(
        GREATEST(0, COALESCE((v_resources->>'gold')::int, 0)) +
        COALESCE((v_reward.r->>'amount')::int, 0)
      ));
    ELSIF v_reward.r->>'type' = 'stamina' THEN
      v_resources := jsonb_set(v_resources, '{energy}', to_jsonb(
        LEAST(
          COALESCE((v_resources->>'maxEnergy')::int, 305),
          GREATEST(0, COALESCE((v_resources->>'energy')::int, 0)) +
          COALESCE((v_reward.r->>'amount')::int, 0)
        )
      ));
    END IF;
  END LOOP;

  -- 更新存档
  v_profile := jsonb_set(v_profile, '{resources}', v_resources);
  v_profile := jsonb_set(v_profile, '{coins}', v_resources->'gold');
  v_profile := jsonb_set(v_profile, '{usedRedeemCodes}',
    v_used_codes || to_jsonb(p_code));

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  -- 记录兑换
  INSERT INTO public.code_redemptions (user_id, code) VALUES (v_user_id, p_code)
    ON CONFLICT DO NOTHING;
  UPDATE public.redeem_codes SET current_uses = current_uses + 1 WHERE code = p_code;

  RETURN jsonb_build_object('ok', true, 'code', p_code, 'rewards', v_rewards);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7h. 保存外观
CREATE OR REPLACE FUNCTION public.save_cosmetics(p_scene jsonb, p_owned jsonb)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
BEGIN
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  IF p_scene IS NOT NULL THEN
    v_profile := jsonb_set(v_profile, '{scene}', p_scene);
  END IF;
  IF p_owned IS NOT NULL THEN
    v_profile := jsonb_set(v_profile, '{owned}', p_owned);
  END IF;

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7i. 商店购买
CREATE OR REPLACE FUNCTION public.buy_shop_item(p_item_id text)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_price int;
  v_gold int;
  v_diamonds int;
  v_rewards jsonb;
BEGIN
  SELECT profile_data INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- 商店物品配置
  IF p_item_id = 'gold_200' THEN
    v_price := 1; -- 钻石
    v_diamonds := COALESCE((v_profile->'resources'->>'diamonds')::int, 0);
    IF v_diamonds < v_price THEN
      RETURN jsonb_build_object('error', 'NOT_ENOUGH_DIAMONDS', 'required', v_price, 'current', v_diamonds);
    END IF;
    v_profile := jsonb_set(v_profile, '{resources,diamonds}', to_jsonb(v_diamonds - v_price));
    v_profile := jsonb_set(v_profile, '{resources,gold}', to_jsonb(
      GREATEST(0, COALESCE((v_profile->'resources'->>'gold')::int, 0)) + 200
    ));
    v_profile := jsonb_set(v_profile, '{coins}', v_profile->'resources'->'gold');
  ELSE
    RETURN jsonb_build_object('error', 'ITEM_NOT_FOUND');
  END IF;

  UPDATE public.profiles SET profile_data = v_profile, version = version + 1 WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7j. 匿名迁移
CREATE OR REPLACE FUNCTION public.migrate_anonymous(p_source_token text)
RETURNS jsonb AS $$
DECLARE
  v_target_user_id uuid := auth.uid();
  v_source_user_id uuid;
  v_source_profile jsonb;
  v_target_profile jsonb;
BEGIN
  -- 从 source token 解析用户 ID（通过 Supabase Auth）
  -- 注意：实际实现中需要调用 auth API 验证 token
  -- 这里简化处理，由 Edge Function 层完成 token 验证后传入 user_id
  -- 如果 Edge Function 已经验证，这里直接合并

  -- 获取目标存档
  SELECT profile_data INTO v_target_profile FROM public.profiles WHERE user_id = v_target_user_id;
  IF NOT FOUND THEN
    PERFORM public.bootstrap_profile();
    SELECT profile_data INTO v_target_profile FROM public.profiles WHERE user_id = v_target_user_id;
  END IF;

  -- 合并逻辑由 Edge Function 处理，这里只做记录
  RETURN jsonb_build_object('ok', true, 'merged', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
