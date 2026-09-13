import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { supabase } from "./supabaseClient";

const VIDEO_SRC = "/ad.mp4";
const BG_VIDEO_SRC = "/BG.mp4";

const RETURN_FLAG = "pandora:replay-ad-on-return";

const TYPE_LABELS = {
  new_launch: "NEW LAUNCH",
  coming_soon: "COMING SOON",
  anticipated: "ANTICIPATED",
  trending: "TRENDING",
  deal: "EXCLUSIVE DEAL",
  try_it: "TRY IT",
};

function drawCampaign(ctx, campaign, transparent = false, onImageLoaded) {
  if (!transparent) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1024, 576);

    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 2;

    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64, 576);
      ctx.stroke();
    }

    for (let i = 0; i <= 9; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 64);
      ctx.lineTo(1024, i * 64);
      ctx.stroke();
    }
  }

  if (!campaign) return;

  if (transparent) {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0.28)");
    gradient.addColorStop(0.58, "rgba(0,0,0,0.04)");
    gradient.addColorStop(1, "rgba(0,0,0,0.08)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 576);
  }

  const typeLabel =
    TYPE_LABELS[campaign.campaign_type] || "FEATURED";

  const title = String(
    campaign.product_title ||
      campaign.brand_name ||
      "YOUR PRODUCT"
  );

  const description = String(
    campaign.description ||
      campaign.brand_motto ||
      ""
  ).trim();

  const discount = Number(campaign.discount_percent || 0);

  ctx.fillStyle = transparent
    ? "rgba(255,255,255,.70)"
    : "#666";

  ctx.font = "800 14px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(typeLabel, 75, 92);

  ctx.fillStyle = transparent ? "#fff" : "#111";
  ctx.font = "700 54px Arial, sans-serif";
  ctx.shadowColor = transparent
    ? "rgba(0,0,0,.45)"
    : "transparent";
  ctx.shadowBlur = transparent ? 12 : 0;

  ctx.fillText(
    String(campaign.brand_name || "YOUR BRAND").toUpperCase(),
    75,
    175
  );

  ctx.fillStyle = transparent ? "#fff" : "#222";
  ctx.font = "700 32px Arial, sans-serif";

  ctx.fillText(title.slice(0, 34), 75, 225);

  if (description) {
    ctx.fillStyle = transparent
      ? "rgba(255,255,255,.84)"
      : "#555";

    ctx.font = "400 20px Arial, sans-serif";

    const shortDescription =
      description.length > 62
        ? `${description.slice(0, 59)}…`
        : description;

    ctx.fillText(shortDescription, 78, 270);
  }

  if (discount > 0) {
    ctx.fillStyle = transparent ? "#fff" : "#111";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText(`${discount}% OFF`, 78, 335);

    if (campaign.discount_code) {
      ctx.font = "600 16px Arial, sans-serif";

      ctx.fillStyle = transparent
        ? "rgba(255,255,255,.78)"
        : "#555";

      ctx.fillText(
        `CODE ${String(campaign.discount_code).toUpperCase()}`,
        78,
        365
      );
    }

    ctx.fillStyle = transparent ? "#fff" : "#111";
    ctx.font = "800 17px Arial, sans-serif";
    ctx.fillText("CLICK TO DISCOVER", 78, 410);
  } else {
    ctx.fillStyle = transparent ? "#fff" : "#111";
    ctx.font = "800 18px Arial, sans-serif";
    ctx.fillText("CLICK TO DISCOVER", 78, 355);
  }

  if (campaign.launch_date) {
    const date = new Date(
      `${campaign.launch_date}T00:00:00`
    );

    if (!Number.isNaN(date.getTime())) {
      ctx.fillStyle = transparent
        ? "rgba(255,255,255,.72)"
        : "#666";

      ctx.font = "400 15px Arial, sans-serif";

      ctx.fillText(
        `${
          campaign.campaign_type === "new_launch"
            ? "Launched"
            : "Launching"
        } ${date.toLocaleDateString()}`,
        78,
        440
      );
    }
  }

  if (campaign.logo_url) {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      const ratio = Math.min(
        165 / image.width,
        165 / image.height
      );

      const w = image.width * ratio;
      const h = image.height * ratio;

      ctx.save();

      ctx.shadowColor = transparent
        ? "rgba(0,0,0,0.5)"
        : "rgba(0,0,0,0.12)";

      ctx.shadowBlur = transparent ? 24 : 20;

      ctx.drawImage(
        image,
        765 - w / 2,
        320 - h / 2,
        w,
        h
      );

      ctx.restore();

      onImageLoaded?.();
    };

    image.onerror = () => onImageLoaded?.();

    image.src = campaign.logo_url;
  }

  if (typeof Image !== "undefined") {
    const pandoraLogo = new Image();

    pandoraLogo.onload = () => {
      const maxW = 128;
      const maxH = 30;

      const ratio = Math.min(
        maxW / pandoraLogo.width,
        maxH / pandoraLogo.height
      );

      const w = pandoraLogo.width * ratio;
      const h = pandoraLogo.height * ratio;

      ctx.save();

      ctx.globalAlpha = transparent
        ? 0.96
        : 0.82;

      ctx.shadowColor = transparent
        ? "rgba(0,0,0,0.42)"
        : "rgba(0,0,0,0.10)";

      ctx.shadowBlur = transparent ? 10 : 4;

      ctx.drawImage(
        pandoraLogo,
        34,
        531 - h,
        w,
        h
      );

      ctx.restore();

      onImageLoaded?.();
    };

    pandoraLogo.onerror = () => onImageLoaded?.();

    pandoraLogo.src = "/logo.png";
  }
}

function createAdCanvas(campaign, onImageLoaded) {
  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 576;

  const ctx = canvas.getContext("2d");

  if (!ctx) return canvas;

  drawCampaign(
    ctx,
    campaign,
    false,
    onImageLoaded
  );

  return canvas;
}

function createTransparentCampaignCanvas(
  campaign,
  onImageLoaded
) {
  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 576;

  const ctx = canvas.getContext("2d");

  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 1024, 576);

  drawCampaign(
    ctx,
    campaign,
    true,
    onImageLoaded
  );

  return canvas;
}

function createLedTexture(campaign) {
  let texture;

  const canvas = createAdCanvas(
    campaign,
    () => {
      if (texture) {
        texture.needsUpdate = true;
      }
    }
  );

  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function createOverlayTexture(campaign) {
  let texture;

  const canvas = createTransparentCampaignCanvas(
    campaign,
    () => {
      if (texture) {
        texture.needsUpdate = true;
      }
    }
  );

  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function makeVideoTexture(video) {
  const texture = new THREE.VideoTexture(video);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return texture;
}

function addTopFloodlights(group) {
  const fixturePositions = [
    -6.4,
    -3.2,
    0,
    3.2,
    6.4,
  ];

  const fixtureMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x15181a,
      roughness: 0.34,
      metalness: 0.72,
    });

  const lampGlowMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
    });

  fixturePositions.forEach((x) => {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.055,
        0.075,
        0.72,
        12
      ),
      fixtureMaterial
    );

    stem.position.set(
      x,
      5.15,
      0.02
    );

    stem.rotation.z =
      THREE.MathUtils.degToRad(
        x === 0
          ? 0
          : x > 0
          ? -5
          : 5
      );

    group.add(stem);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.62,
        0.38,
        0.30
      ),
      fixtureMaterial
    );

    housing.position.set(
      x,
      5.55,
      0.12
    );

    housing.rotation.x =
      THREE.MathUtils.degToRad(-12);

    group.add(housing);

    const lampFace = new THREE.Mesh(
      new THREE.PlaneGeometry(
        0.46,
        0.20
      ),
      lampGlowMaterial
    );

    lampFace.position.set(
      x,
      5.47,
      0.285
    );

    lampFace.rotation.x =
      THREE.MathUtils.degToRad(-12);

    group.add(lampFace);

    const spot = new THREE.SpotLight(
      0xffffff,
      5.5,
      15,
      Math.PI / 6,
      0.82,
      2
    );

    spot.position.set(
      x,
      5.38,
      0.32
    );

    spot.target.position.set(
      x,
      0.8,
      0.7
    );

    group.add(spot);
    group.add(spot.target);

    const point = new THREE.PointLight(
      0xffffff,
      0.7,
      3.5,
      2
    );

    point.position.set(
      x,
      5.42,
      0.35
    );

    group.add(point);
  });
}

function addBillboardEnvironment(scene, group) {
  scene.fog = new THREE.FogExp2(
    0x030303,
    0.012
  );

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(
      58,
      58,
      44,
      96,
      1,
      true
    ),
    new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.96,
      metalness: 0.04,
      side: THREE.BackSide,
    })
  );

  shell.position.y = 13.5;
  shell.position.z = 0;

  scene.add(shell);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.42,
      metalness: 0.62,
    })
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -8.5;

  scene.add(floor);

  const ringMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x242424,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

  [7, 13, 21, 31, 43].forEach(
    (radius) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          radius - 0.035,
          radius,
          128
        ),
        ringMaterial
      );

      ring.rotation.x = -Math.PI / 2;

      ring.position.set(
        0,
        -8.47,
        -3
      );

      scene.add(ring);
    }
  );

  const stripMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x191919,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });

  [-30, -20, -10, 10, 20, 30].forEach(
    (x) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(
          0.035,
          90
        ),
        stripMaterial
      );

      strip.rotation.x = -Math.PI / 2;

      strip.position.set(
        x,
        -8.465,
        -3
      );

      scene.add(strip);
    }
  );

  const ribMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.72,
      metalness: 0.25,
    });

  [-24, -16, 16, 24].forEach(
    (x) => {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.22,
          27,
          0.5
        ),
        ribMaterial
      );

      rib.position.set(
        x,
        5,
        -17
      );

      scene.add(rib);
    }
  );

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(
      7.8,
      8.2,
      0.28,
      96
    ),
    new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: 0.3,
      metalness: 0.68,
    })
  );

  platform.position.set(
    0,
    -8.33,
    0
  );

  scene.add(platform);

  const glow = new THREE.PointLight(
    0xffffff,
    18,
    34,
    2
  );

  glow.position.set(
    0,
    -1.2,
    1.2
  );

  scene.add(glow);

  const leftFill = new THREE.PointLight(
    0x6f777c,
    5,
    28,
    2
  );

  leftFill.position.set(
    -13,
    0,
    2
  );

  scene.add(leftFill);

  const rightFill = new THREE.PointLight(
    0x45494d,
    4,
    28,
    2
  );

  rightFill.position.set(
    13,
    1,
    1
  );

  scene.add(rightFill);

  const topLight = new THREE.PointLight(
    0xffffff,
    5,
    30,
    2
  );

  topLight.position.set(
    0,
    11,
    3
  );

  scene.add(topLight);

  group.renderOrder = 2;
}

export default function DigitalBillboard({ onCampaignChange }) {
  const mountRef = useRef(null);

  const screenMaterialRef = useRef(null);
  const bgMaterialRef = useRef(null);
  const overlayMaterialRef = useRef(null);

  const screenMeshRef = useRef(null);
  const bgScreenMeshRef = useRef(null);
  const overlayScreenMeshRef =
    useRef(null);

  const bgReadyRef = useRef(false);

  const adVideoRef = useRef(null);
  const adTextureRef = useRef(null);

  const bgVideoRef = useRef(null);
  const bgTextureRef = useRef(null);

  const normalTextureRef = useRef(null);
  const overlayTextureRef = useRef(null);

  const playingAdRef = useRef(false);

  const [campaign, setCampaign] =
    useState(null);

  const campaignRef = useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [adPlaying, setAdPlaying] =
    useState(false);

  useEffect(() => {
    campaignRef.current = campaign || null;
    onCampaignChange?.(campaign || null);

    return () => onCampaignChange?.(null);
  }, [campaign, onCampaignChange]);

  const loadCampaign = useCallback(
    async (rotate = false, markImpression = false) => {
      try {
        let data = null;

        if (rotate) {
          const { data: nextCampaign, error: rpcError } =
            await supabase.rpc("get_next_campaign", {
              p_current_campaign_id:
                campaignRef.current?.id || null,
              p_mark_impression: markImpression,
            });

          if (rpcError) throw rpcError;

          data = Array.isArray(nextCampaign)
            ? nextCampaign[0] || null
            : nextCampaign || null;
        } else if (campaignRef.current?.id) {
          const { data: currentCampaign, error: dbError } =
            await supabase
              .from("campaigns")
              .select(
                "id,brand_name,brand_motto,logo_url,destination_url,clicks_target,current_click_count,slot,campaign_type,product_title,description,launch_date,discount_percent,discount_code,offer_expires_at,video_url,started_at,expires_at"
              )
              .eq("id", campaignRef.current.id)
              .eq("status", "live")
              .maybeSingle();

          if (dbError) throw dbError;

          data = currentCampaign;

          if (!data) {
            const { data: nextCampaign, error: rpcError } =
              await supabase.rpc("get_next_campaign", {
                p_current_campaign_id:
                  campaignRef.current?.id || null,
                p_mark_impression: markImpression,
              });

            if (rpcError) throw rpcError;

            data = Array.isArray(nextCampaign)
              ? nextCampaign[0] || null
              : nextCampaign || null;
          }
        } else {
          const { data: nextCampaign, error: rpcError } =
            await supabase.rpc("get_next_campaign", {
              p_current_campaign_id: null,
              p_mark_impression: markImpression,
            });

          if (rpcError) throw rpcError;

          data = Array.isArray(nextCampaign)
            ? nextCampaign[0] || null
            : nextCampaign || null;
        }

        campaignRef.current = data || null;
        setCampaign(data || null);
        setError(null);

        return data || null;
      } catch (e) {
        console.error(e);

        setError(
          "Could not load the current campaign."
        );

        campaignRef.current = null;
        setCampaign(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCampaign(false);

    const channel = supabase
      .channel(
        "billboard-live-campaign"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
        },
        () => loadCampaign(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCampaign]);

  /*
   * Per-visitor auto-rotation: every live campaign in this slot gets shown
   * in turn (campaign 1 -> 2 -> ... -> N -> 1...), independent of anyone
   * else's browser. Nobody waits for another advertiser's campaign to
   * finish — get_next_campaign already only returns campaigns with status
   * 'live', so a completed one simply stops being selected.
   *
   * Advances every 18s, but never while the ad-takeover video is actively
   * playing (that has its own lifecycle) and never while the tab is hidden
   * (no point burning through the rotation for a tab nobody's looking at).
   */
  useEffect(() => {
    if (loading) return;
    if (adPlaying) return;

    const ROTATION_INTERVAL_MS = 18000;

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (playingAdRef.current) return;

      loadCampaign(true, true);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loading, adPlaying, loadCampaign]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) return;

    mount.innerHTML = "";

    const scene = new THREE.Scene();

    scene.background =
      new THREE.Color(0x000000);

    const w =
      mount.clientWidth ||
      window.innerWidth;

    const h =
      mount.clientHeight ||
      window.innerHeight;

    const camera =
      new THREE.PerspectiveCamera(
        40,
        w / h,
        0.1,
        100
      );

    camera.position.set(
      0,
      1.5,
      22
    );

    camera.lookAt(
      0,
      0,
      0
    );

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference:
          "high-performance",
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        2
      )
    );

    renderer.setSize(w, h);

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1;

    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";

    mount.appendChild(
      renderer.domElement
    );

    const group = new THREE.Group();

    scene.add(group);

    addBillboardEnvironment(
      scene,
      group
    );

    addTopFloodlights(group);

    scene.add(
      new THREE.AmbientLight(
        0xffffff,
        0.10
      )
    );

    const normalTexture =
      createLedTexture(campaign);

    normalTextureRef.current =
      normalTexture;

    const screenMaterial =
      new THREE.MeshBasicMaterial({
        map: normalTexture,
        toneMapped: false,
      });

    screenMaterialRef.current =
      screenMaterial;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 9),
      screenMaterial
    );

    screen.position.z = 0.26;

    screenMeshRef.current =
      screen;

    group.add(screen);

    const bgVideo =
      document.createElement("video");

    bgVideo.src = BG_VIDEO_SRC;
    bgVideo.preload = "auto";
    bgVideo.muted = true;
    bgVideo.defaultMuted = true;
    bgVideo.volume = 0;
    bgVideo.playsInline = true;
    bgVideo.loop = true;
    bgVideo.crossOrigin = "anonymous";

    bgVideo.setAttribute(
      "playsinline",
      ""
    );

    bgVideoRef.current =
      bgVideo;

    const bgTexture =
      makeVideoTexture(bgVideo);

    bgTextureRef.current =
      bgTexture;

    const bgMaterial =
      new THREE.MeshBasicMaterial({
        map: bgTexture,
        toneMapped: false,
      });

    bgMaterialRef.current =
      bgMaterial;

    const bgScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 9),
      bgMaterial
    );

    bgScreen.position.z =
      0.255;

    bgScreen.visible = false;

    bgScreenMeshRef.current =
      bgScreen;

    group.add(bgScreen);

    const overlayTexture =
      createOverlayTexture(campaign);

    overlayTextureRef.current =
      overlayTexture;

    const overlayMaterial =
      new THREE.MeshBasicMaterial({
        map: overlayTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });

    overlayMaterialRef.current =
      overlayMaterial;

    const overlayScreen =
      new THREE.Mesh(
        new THREE.PlaneGeometry(16, 9),
        overlayMaterial
      );

    overlayScreen.position.z =
      0.27;

    overlayScreen.visible = false;

    overlayScreenMeshRef.current =
      overlayScreen;

    group.add(
      overlayScreen
    );

    const startBackground =
      async () => {
        try {
          await bgVideo.play();

          bgReadyRef.current =
            true;

          bgScreen.visible = true;

          overlayScreen.visible =
            Boolean(campaign);

          screen.visible = false;
        } catch (e) {
          console.warn(
            "BG.mp4 could not autoplay; keeping normal billboard.",
            e
          );

          bgReadyRef.current =
            false;

          bgScreen.visible =
            false;

          overlayScreen.visible =
            false;

          screen.visible = true;
        }
      };

    startBackground();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        16.3,
        9.3,
        0.5
      ),
      new THREE.MeshStandardMaterial({
        color: 0x080808,
        roughness: 0.3,
        metalness: 0.85,
      })
    );

    group.add(body);

    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(
        15.68,
        8.82,
        0.3
      ),
      new THREE.MeshStandardMaterial({
        color: 0x030303,
        roughness: 0.5,
        metalness: 0.7,
      })
    );

    cabinet.position.z = -0.3;

    group.add(cabinet);

    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(
        16.8,
        9.8
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.04,
        blending:
          THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    halo.position.z = 0.05;

    group.add(halo);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.6,
        0.75,
        10,
        32
      ),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0,
      })
    );

    pillar.position.set(
      0,
      -9.5,
      0
    );

    group.add(pillar);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(
        13,
        0.8,
        4
      ),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.6,
        metalness: 0.4,
      })
    );

    base.position.set(
      0,
      -14.2,
      0
    );

    group.add(base);

    const light =
      new THREE.PointLight(
        0xffffff,
        8,
        20
      );

    light.position.set(
      0,
      0,
      1.5
    );

    group.add(light);

    const resize = () => {
      const nw =
        mount.clientWidth ||
        window.innerWidth;

      const nh =
        mount.clientHeight ||
        window.innerHeight;

      camera.aspect =
        nw / nh;

      camera.updateProjectionMatrix();

      renderer.setSize(
        nw,
        nh
      );
    };

    window.addEventListener(
      "resize",
      resize
    );

    let raf = 0;

    const animate = () => {
      raf =
        requestAnimationFrame(
          animate
        );

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        "resize",
        resize
      );

      if (adVideoRef.current) {
        adVideoRef.current.pause();

        adVideoRef.current.removeAttribute(
          "src"
        );

        adVideoRef.current.load();

        adVideoRef.current = null;
      }

      if (bgVideoRef.current) {
        bgVideoRef.current.pause();

        bgVideoRef.current.removeAttribute(
          "src"
        );

        bgVideoRef.current.load();

        bgVideoRef.current = null;
      }

      adTextureRef.current?.dispose();
      adTextureRef.current = null;

      bgTextureRef.current?.dispose();
      bgTextureRef.current = null;

      normalTextureRef.current?.dispose();
      normalTextureRef.current = null;

      overlayTextureRef.current?.dispose();
      overlayTextureRef.current = null;

      scene.traverse((o) => {
        o.geometry?.dispose();

        if (o.material) {
          if (
            Array.isArray(o.material)
          ) {
            o.material.forEach(
              (m) => m.dispose()
            );
          } else {
            o.material.dispose();
          }
        }
      });

      renderer.dispose();

      if (
        renderer.domElement
          .parentNode === mount
      ) {
        mount.removeChild(
          renderer.domElement
        );
      }

      screenMaterialRef.current =
        null;

      bgMaterialRef.current =
        null;

      overlayMaterialRef.current =
        null;

      screenMeshRef.current =
        null;

      bgScreenMeshRef.current =
        null;

      overlayScreenMeshRef.current =
        null;

      bgReadyRef.current =
        false;
    };
  }, []);

  useEffect(() => {
    if (adPlaying) return;

    const screen =
      screenMeshRef.current;

    const bgScreen =
      bgScreenMeshRef.current;

    const overlayScreen =
      overlayScreenMeshRef.current;

    if (bgReadyRef.current) {
      if (screen) {
        screen.visible = false;
      }

      if (bgScreen) {
        bgScreen.visible = true;
      }

      if (overlayScreen) {
        overlayScreen.visible =
          Boolean(campaign);
      }
    } else {
      if (screen) {
        screen.visible = true;
      }

      if (bgScreen) {
        bgScreen.visible = false;
      }

      if (overlayScreen) {
        overlayScreen.visible =
          false;
      }
    }

    const screenMaterial =
      screenMaterialRef.current;

    if (screenMaterial) {
      const texture =
        createLedTexture(
          campaign
        );

      const old =
        screenMaterial.map;

      screenMaterial.map =
        texture;

      screenMaterial.needsUpdate =
        true;

      normalTextureRef.current =
        texture;

      if (
        old &&
        old !== adTextureRef.current
      ) {
        old.dispose();
      }
    }

    const overlayMaterial =
      overlayMaterialRef.current;

    if (overlayMaterial) {
      const texture =
        createOverlayTexture(
          campaign
        );

      const old =
        overlayMaterial.map;

      overlayMaterial.map =
        texture;

      overlayMaterial.needsUpdate =
        true;

      overlayTextureRef.current =
        texture;

      if (old) {
        old.dispose();
      }
    }
  }, [campaign, adPlaying]);

  const playAdVideo =
    useCallback(async (campaignOverride = campaign) => {
      if (
        playingAdRef.current ||
        !screenMaterialRef.current
      ) {
        return;
      }

      playingAdRef.current =
        true;

      setAdPlaying(true);
      setError(null);

      const normalMaterial =
        screenMaterialRef.current;

      const bgMaterial =
        bgMaterialRef.current;

      const bgVideo =
        bgVideoRef.current;

      const bgTexture =
        bgTextureRef.current;

      const screen =
        screenMeshRef.current;

      const bgScreen =
        bgScreenMeshRef.current;

      const overlayScreen =
        overlayScreenMeshRef.current;

      const previousNormalTexture =
        normalMaterial.map;

      const video =
        document.createElement(
          "video"
        );

      video.src =
        campaignOverride?.video_url ||
        VIDEO_SRC;

      video.preload = "auto";
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.loop = false;
      video.crossOrigin =
        "anonymous";

      video.setAttribute(
        "playsinline",
        ""
      );

      adVideoRef.current =
        video;

      const texture =
        makeVideoTexture(video);

      adTextureRef.current =
        texture;

      if (screen) {
        screen.visible = true;
      }

      if (bgScreen) {
        bgScreen.visible = false;
      }

      if (overlayScreen) {
        overlayScreen.visible =
          false;
      }

      normalMaterial.map =
        texture;

      normalMaterial.needsUpdate =
        true;

      const restore =
        async () => {
          if (
            !playingAdRef.current
          ) {
            return;
          }

          bgMaterial.map =
            bgTexture;

          bgMaterial.needsUpdate =
            true;

          if (screen) {
            screen.visible = false;
          }

          if (bgScreen) {
            bgScreen.visible = true;
          }

          if (overlayScreen) {
            overlayScreen.visible =
              Boolean(campaignOverride);
          }

          if (bgVideo) {
            try {
              await bgVideo.play();

              bgReadyRef.current =
                true;
            } catch (e) {
              bgReadyRef.current =
                false;

              console.warn(
                "BG.mp4 could not resume after ad.",
                e
              );
            }
          }

          normalMaterial.map =
            previousNormalTexture ||
            createLedTexture(
              campaignOverride
            );

          normalMaterial.needsUpdate =
            true;

          texture.dispose();

          video.pause();

          video.removeAttribute(
            "src"
          );

          video.load();

          adVideoRef.current =
            null;

          adTextureRef.current =
            null;

          playingAdRef.current =
            false;

          setAdPlaying(false);
        };

      video.addEventListener(
        "ended",
        restore,
        { once: true }
      );

      video.addEventListener(
        "error",
        () => {
          setError(
            "Could not load the campaign video."
          );

          restore();
        },
        { once: true }
      );

      try {
        video.currentTime = 0;
        video.load();

        if (
          video.readyState <
          HTMLMediaElement.HAVE_FUTURE_DATA
        ) {
          await new Promise(
            (resolve, reject) => {
              const onReady = () => {
                cleanup();
                resolve();
              };

              const onError = () => {
                cleanup();
                reject(
                  new Error(
                    "ad video load failed"
                  )
                );
              };

              const cleanup =
                () => {
                  video.removeEventListener(
                    "canplay",
                    onReady
                  );

                  video.removeEventListener(
                    "error",
                    onError
                  );
                };

              video.addEventListener(
                "canplay",
                onReady,
                { once: true }
              );

              video.addEventListener(
                "error",
                onError,
                { once: true }
              );
            }
          );
        }

        await video.play();
      } catch (e) {
        console.error(
          "Ad video start failed:",
          e
        );

        setError(
          "The campaign video could not start."
        );

        restore();
      }
    }, [campaign]);

  /*
   * Autoplay the takeover ad as soon as the current campaign is known —
   * both on a visitor's very first load of the billboard, and again
   * whenever they return to it after leaving (Legal, Pricing, Discover,
   * Advertise) and coming back. Previously this only fired on the
   * "returning" path, so a first-time visitor never saw the ad play until
   * they navigated away and back once — this treats first mount the same
   * as a return.
   */
  useEffect(() => {
    if (loading) return;

    let timer = null;

    const replay = () => {
      if (document.visibilityState === "hidden") return;
      if (playingAdRef.current) return;

      sessionStorage.removeItem(RETURN_FLAG);

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(async () => {
        if (playingAdRef.current) return;

        const nextCampaign = await loadCampaign(true, true);

        if (nextCampaign && !playingAdRef.current) {
          playAdVideo(nextCampaign);
        }
      }, 150);
    };

    // Route navigation/remount (isReturningToBillboard), or a plain first
    // mount of the billboard — both should autoplay immediately.
    replay();

    const handlePageShow = () => {
      if (sessionStorage.getItem(RETURN_FLAG) === "1") {
        replay();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handlePageShow();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (timer) {
        clearTimeout(timer);
      }

      // If this billboard instance is being unmounted because the user
      // navigated to another page, mark the next billboard mount as a return.
      sessionStorage.setItem(RETURN_FLAG, "1");
    };
  }, [loading, loadCampaign, playAdVideo]);

  const handleClick =
    async () => {
      /*
       * Never allow clicks while the takeover video is playing.
       */
      if (adPlaying) {
        return;
      }

      if (!campaign) {
        return;
      }

      /*
       * Set the return flag BEFORE opening the destination.
       * This is what tells the billboard:
       *
       * "The user clicked an advertiser.
       * When they come back, play the ad."
       */
      if (campaign.destination_url) {
        sessionStorage.setItem(
          RETURN_FLAG,
          "1"
        );
      }

      try {
        /*
         * Click registration now goes through the register-click edge
         * function, which captures the real client IP server-side (the
         * browser has no reliable/trustworthy way to know its own public
         * IP) and hashes it before it ever reaches the database. This is
         * what actually rate-limits per real visitor.
         */
        const {
          data,
          error: fnError,
        } = await supabase.functions.invoke(
          "register-click",
          {
            body: {
              campaign_id: campaign.id,
            },
          }
        );

        if (fnError) {
          throw fnError;
        }

        const result =
          Array.isArray(data)
            ? data[0]
            : data;

        if (!result) {
          throw new Error(
            "Click registration returned no result."
          );
        }

        /*
         * The fixed Supabase function returns:
         *
         * registered
         * campaign_id
         * click_number
         * completed
         *
         * It does NOT return destination_url.
         */
        if (
          result.registered ===
          false
        ) {
          const reasonMessages = {
            rate_limited_cooldown: "Slow down a bit — try again in a second.",
            rate_limited_burst: "Too many clicks too fast — take a short break.",
            rate_limited_daily_cap: "You've hit today's click limit on this campaign.",
            campaign_complete: "This campaign just wrapped up!",
            no_live_campaign: "No live campaign right now.",
          };
          throw new Error(
            reasonMessages[result.reason] ||
              "Click could not be registered."
          );
        }

        setCampaign(
          (prev) =>
            prev
              ? {
                  ...prev,
                  current_click_count:
                    result.click_number ??
                    prev.current_click_count,
                }
              : prev
        );

        /*
         * Open the actual campaign URL from
         * the campaign record.
         */
        if (
          campaign.destination_url
        ) {
          window.open(
            campaign.destination_url,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } catch (e) {
        console.error(e);

        /*
         * If registration failed, don't leave
         * a stale return flag behind.
         */
        sessionStorage.removeItem(
          RETURN_FLAG
        );

        setError(
          e?.message ||
            "Click didn't register. Try again."
        );
        const shownMessage = e?.message || "Click didn't register. Try again.";
        setTimeout(() => {
          setError((current) => (current === shownMessage ? null : current));
        }, 3000);
      }
    };

  return (
    <div
      style={styles.viewport}
    >
      <div
        ref={mountRef}
        style={styles.webgl}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Digital billboard"
      />

      {loading && (
        <div style={styles.status}>
          Loading billboard…
        </div>
      )}

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

    </div>
  );
}

const styles = {
  viewport: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#000",
    margin: 0,
    padding: 0,
  },

  webgl: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "#000",
    cursor: "pointer",
    outline: "none",
  },

  status: {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform:
      "translate(-50%,-50%)",
    color: "rgba(255,255,255,.65)",
    font: "13px Arial,sans-serif",
    zIndex: 10,
    pointerEvents: "none",
  },

  error: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform:
      "translateX(-50%)",
    color: "#ff8888",
    background:
      "rgba(0,0,0,.75)",
    padding: "8px 12px",
    borderRadius: 6,
    font: "12px Arial,sans-serif",
    zIndex: 20,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },

  card: {
    background: "#111",
    color: "#fff",
    border:
      "1px solid rgba(255,255,255,.12)",
    borderRadius: 16,
    padding: 32,
    maxWidth: 340,
    textAlign: "center",
    fontFamily:
      "Arial,sans-serif",
  },
};