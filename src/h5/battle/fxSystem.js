(function registerFxSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  /**
   * 粒子爆发
   */
  function burst(state, x, y, color, count) {
    state.shake = Math.max(state.shake || 0, Math.min(0.22, count / 260));
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 170 + 45;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1.5,
        color: color,
        life: Math.random() * 0.48 + 0.24
      });
    }
  }

  /**
   * 冲击波
   */
  function shockwave(state, x, y, color, life, speed) {
    state.shockwaves.push({
      x: x, y: y, color: color,
      life: life !== undefined ? life : 0.35,
      maxLife: life !== undefined ? life : 0.35,
      radius: 8,
      speed: speed || 170
    });
  }

  /**
   * 枪口闪光
   */
  function muzzleFlash(state, x, y, color, count) {
    for (var i = 0; i < count; i++) {
      state.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        radius: Math.random() * 3 + 2,
        color: color,
        life: 0.12 + Math.random() * 0.12
      });
    }
  }

  /**
   * 尾迹
   */
  function trail(state, x, y, color, count) {
    for (var i = 0; i < count; i++) {
      state.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        radius: Math.random() * 2 + 1,
        color: color,
        life: 0.22
      });
    }
  }

  var api = {
    burst: burst,
    shockwave: shockwave,
    muzzleFlash: muzzleFlash,
    trail: trail
  };

  scope.fxSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
