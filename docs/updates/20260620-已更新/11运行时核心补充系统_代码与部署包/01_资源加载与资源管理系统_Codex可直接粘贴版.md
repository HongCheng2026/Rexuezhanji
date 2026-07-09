# 01_资源加载与资源管理系统_Codex可直接粘贴版

```js
// src/systems/resourceManager.js

export const RESOURCE_TYPE = {
  IMAGE: "image",
  AUDIO: "audio",
  JSON: "json"
};

export const RESOURCE_GROUP = {
  MAIN_UI: "main_ui",
  BATTLE: "battle",
  PILOT: "pilot",
  FIGHTER: "fighter",
  SUB_UI: "sub_ui",
  AUDIO: "audio"
};

export const RESOURCE_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  LOADED: "loaded",
  FAILED: "failed"
};

export const RESOURCE_MANAGER_CONFIG = {
  imageTimeoutMs: 12000,
  audioTimeoutMs: 12000,
  jsonTimeoutMs: 8000,

  retryTimes: 1,

  enableCache: true,
  enableLazyLoad: true,

  lowEndDeviceMaxParallel: 3,
  normalDeviceMaxParallel: 6,

  preferWebp: true,
  fallbackImage: "/assets/fallback/fallback_image.png",
  fallbackAudio: "/assets/fallback/fallback_audio.mp3"
};

export const CORE_RESOURCE_MANIFEST = [
  {
    id: "ui_main_bg",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.MAIN_UI,
    url: "/assets/ui/main/ui_main_bg.webp",
    fallbackUrl: "/assets/ui/main/ui_main_bg.png",
    preload: true
  },
  {
    id: "ui_task_reference",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.SUB_UI,
    url: "/assets/ui_reference/sub_ui/task_reference.png",
    preload: false
  },
  {
    id: "ui_achievement_reference",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.SUB_UI,
    url: "/assets/ui_reference/sub_ui/achievement_reference.png",
    preload: false
  },
  {
    id: "icon_gold",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.MAIN_UI,
    url: "/assets/ui_runtime/icons/gold.png",
    preload: true
  },
  {
    id: "icon_diamond",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.MAIN_UI,
    url: "/assets/ui_runtime/icons/diamond.png",
    preload: true
  },
  {
    id: "icon_stamina",
    type: RESOURCE_TYPE.IMAGE,
    group: RESOURCE_GROUP.MAIN_UI,
    url: "/assets/ui_runtime/icons/stamina.png",
    preload: true
  },
  {
    id: "audio_button_click",
    type: RESOURCE_TYPE.AUDIO,
    group: RESOURCE_GROUP.AUDIO,
    url: "/assets/audio/ui/button_click.mp3",
    preload: true
  },
  {
    id: "audio_reward_claim",
    type: RESOURCE_TYPE.AUDIO,
    group: RESOURCE_GROUP.AUDIO,
    url: "/assets/audio/ui/reward_claim.mp3",
    preload: true
  }
];

export function createResourceManager({
  manifest = CORE_RESOURCE_MANIFEST,
  config = RESOURCE_MANAGER_CONFIG,
  isLowEndDevice = false
} = {}) {
  const resourceMap = new Map();
  const cache = new Map();

  manifest.forEach((resource) => {
    resourceMap.set(resource.id, {
      ...resource,
      status: RESOURCE_STATUS.IDLE,
      error: null,
      loadedAt: 0
    });
  });

  return {
    config,
    resourceMap,
    cache,
    maxParallel: isLowEndDevice
      ? config.lowEndDeviceMaxParallel
      : config.normalDeviceMaxParallel,

    getResource(id) {
      return resourceMap.get(id) || null;
    },

    getLoadedAsset(id) {
      return cache.get(id) || null;
    },

    async preloadCore() {
      const preloadList = Array.from(resourceMap.values()).filter(
        (resource) => resource.preload
      );

      return loadResourceList({
        resourceList: preloadList,
        resourceMap,
        cache,
        config,
        maxParallel: this.maxParallel
      });
    },

    async loadGroup(group) {
      const groupList = Array.from(resourceMap.values()).filter(
        (resource) => resource.group === group
      );

      return loadResourceList({
        resourceList: groupList,
        resourceMap,
        cache,
        config,
        maxParallel: this.maxParallel
      });
    },

    async loadResource(id) {
      const resource = resourceMap.get(id);

      if (!resource) {
        return {
          success: false,
          id,
          reason: "RESOURCE_NOT_FOUND"
        };
      }

      return loadSingleResource({
        resource,
        resourceMap,
        cache,
        config
      });
    },

    releaseGroup(group) {
      for (const [id, resource] of resourceMap.entries()) {
        if (resource.group === group && !resource.preload) {
          cache.delete(id);
          resourceMap.set(id, {
            ...resource,
            status: RESOURCE_STATUS.IDLE,
            loadedAt: 0
          });
        }
      }
    },

    getLoadProgress(group = null) {
      const list = Array.from(resourceMap.values()).filter((resource) => {
        if (!group) return true;
        return resource.group === group;
      });

      if (list.length <= 0) {
        return {
          loaded: 0,
          total: 0,
          progress: 1
        };
      }

      const loaded = list.filter(
        (resource) => resource.status === RESOURCE_STATUS.LOADED
      ).length;

      return {
        loaded,
        total: list.length,
        progress: loaded / list.length
      };
    }
  };
}

export async function loadResourceList({
  resourceList,
  resourceMap,
  cache,
  config,
  maxParallel
}) {
  const results = [];
  const queue = [...resourceList];

  async function worker() {
    while (queue.length > 0) {
      const resource = queue.shift();

      const result = await loadSingleResource({
        resource,
        resourceMap,
        cache,
        config
      });

      results.push(result);
    }
  }

  const workerCount = Math.min(maxParallel, queue.length);
  const workers = [];

  for (let i = 0; i < workerCount; i += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results;
}

export async function loadSingleResource({
  resource,
  resourceMap,
  cache,
  config
}) {
  if (config.enableCache && cache.has(resource.id)) {
    return {
      success: true,
      id: resource.id,
      fromCache: true
    };
  }

  resourceMap.set(resource.id, {
    ...resource,
    status: RESOURCE_STATUS.LOADING,
    error: null
  });

  let lastError = null;

  for (let attempt = 0; attempt <= config.retryTimes; attempt += 1) {
    try {
      const asset = await loadByType(resource, config);

      cache.set(resource.id, asset);

      resourceMap.set(resource.id, {
        ...resource,
        status: RESOURCE_STATUS.LOADED,
        error: null,
        loadedAt: Date.now()
      });

      return {
        success: true,
        id: resource.id,
        fromCache: false
      };
    } catch (error) {
      lastError = error;

      if (resource.fallbackUrl && attempt === config.retryTimes) {
        try {
          const fallbackAsset = await loadByType(
            {
              ...resource,
              url: resource.fallbackUrl
            },
            config
          );

          cache.set(resource.id, fallbackAsset);

          resourceMap.set(resource.id, {
            ...resource,
            status: RESOURCE_STATUS.LOADED,
            error: null,
            loadedAt: Date.now()
          });

          return {
            success: true,
            id: resource.id,
            fromFallback: true
          };
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }
    }
  }

  resourceMap.set(resource.id, {
    ...resource,
    status: RESOURCE_STATUS.FAILED,
    error: String(lastError)
  });

  return {
    success: false,
    id: resource.id,
    reason: "RESOURCE_LOAD_FAILED",
    error: String(lastError)
  };
}

export function loadByType(resource, config) {
  if (resource.type === RESOURCE_TYPE.IMAGE) {
    return loadImage(resource.url, config.imageTimeoutMs);
  }

  if (resource.type === RESOURCE_TYPE.AUDIO) {
    return loadAudio(resource.url, config.audioTimeoutMs);
  }

  if (resource.type === RESOURCE_TYPE.JSON) {
    return loadJson(resource.url, config.jsonTimeoutMs);
  }

  return Promise.reject(new Error(`Unsupported resource type: ${resource.type}`));
}

export function loadImage(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(`Image load timeout: ${url}`));
    }, timeoutMs);

    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };

    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Image load failed: ${url}`));
    };

    image.src = url;
  });
}

export function loadAudio(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const timer = setTimeout(() => {
      audio.oncanplaythrough = null;
      audio.onerror = null;
      reject(new Error(`Audio load timeout: ${url}`));
    }, timeoutMs);

    audio.oncanplaythrough = () => {
      clearTimeout(timer);
      resolve(audio);
    };

    audio.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Audio load failed: ${url}`));
    };

    audio.src = url;
    audio.load();
  });
}

export async function loadJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Json load failed: ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function detectLowEndDevice() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;

  return memory <= 2 || cores <= 4;
}
```
