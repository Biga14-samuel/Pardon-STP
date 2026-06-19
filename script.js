/* ====================================================================
   PIÈCES POUR BREANNA — système solaire 3D
   Structure du fichier :
   1. Configuration et données des planètes
   2. Initialisation de la scène (caméra, lumières, rendu)
   3. Construction du fond étoilé
   4. Construction du Soleil et de son halo
   5. Construction des planètes et de leurs orbites
   6. Astéroïde secret
   7. Interactions (clic / tap, vol de caméra, panneaux)
   8. Boucle d'animation
==================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------
     1. DONNÉES DES PLANÈTES
     distance  : rayon orbital autour du Soleil (unités de scène)
     size      : rayon de la sphère
     speed     : vitesse angulaire (radians / seconde)
     tilt      : légère inclinaison orbitale pour casser la platitude
     message   : fragment de la lettre porté par cette planète
  ------------------------------------------------------------------- */
  const PLANETS = [
    { name: "Mercure", distance: 9,  size: 0.42, speed: 0.36, color: 0x9c8d7a, tilt: 0.02,
      message: "Je suis sincèrement désolé" },
    { name: "Vénus",   distance: 12, size: 0.62, speed: 0.27, color: 0xe6c79c, tilt: -0.03,
      message: "de t'avoir fait attendre" },
    { name: "Terre",   distance: 16, size: 0.68, speed: 0.20, color: 0x3f6ea5, tilt: 0.0,
      message: "ce n'était pas mon intention" },
    { name: "Mars",    distance: 20, size: 0.52, speed: 0.16, color: 0xb1502f, tilt: 0.025,
      message: "j'aurais dû te prévenir" },
    { name: "Jupiter", distance: 29, size: 2.05, speed: 0.09, color: 0xcdab85, tilt: -0.015,
      message: "au lieu de disparaître" },
    { name: "Saturne", distance: 38, size: 1.75, speed: 0.07, color: 0xe3cf9b, tilt: 0.03,
      message: "tu méritais mieux", rings: true },
    { name: "Uranus",  distance: 46, size: 1.2,  speed: 0.05, color: 0x9fdedd, tilt: -0.02,
      message: "merci pour ta patience" },
    { name: "Neptune", distance: 53, size: 1.18, speed: 0.04, color: 0x3a5fd9, tilt: 0.015,
      message: "j'espère me faire pardonner" },
  ];

  const SUN_MESSAGE = "Breanna";
  const SECRET_MESSAGE = "Promis, la prochaine fois je répondrai avant plusieurs heures 😅";
  const TOTAL_FRAGMENTS = PLANETS.length + 1; // 8 planètes + le Soleil

  /* ------------------------------------------------------------------
     2. SCÈNE, CAMÉRA, RENDU
  ------------------------------------------------------------------- */
  const canvas = document.getElementById("scene");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 2000
  );
  camera.position.set(0, 26, 70);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 6;
  controls.maxDistance = 160;
  controls.target.set(0, 0, 0);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ------------------------------------------------------------------
     3. FOND ÉTOILÉ
     Plusieurs milliers de points distribués dans une grande sphère,
     avec une légère variation de taille pour la profondeur.
  ------------------------------------------------------------------- */
  function buildStarfield() {
    const starCount = 9000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribution sphérique uniforme
      const radius = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xf3efe6,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });

    scene.add(new THREE.Points(geometry, material));
  }

  /* ------------------------------------------------------------------
     4. SOLEIL + HALO LUMINEUX
     Le halo est un sprite avec une texture en degradé radial,
     généré via un canvas 2D (aucune image externe nécessaire).
  ------------------------------------------------------------------- */
  function makeGlowTexture(innerColor, outerColor) {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(0.4, outerColor);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  let sunMesh;

  function buildSun() {
    const geometry = new THREE.SphereGeometry(4.6, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    sunMesh = new THREE.Mesh(geometry, material);
    sunMesh.userData = { isSun: true, name: "Soleil", message: SUN_MESSAGE };
    scene.add(sunMesh);

    // Halo proche, intense
    const glowTexture = makeGlowTexture("rgba(255, 224, 170, 0.9)", "rgba(217, 179, 108, 0.35)");
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(26, 26, 1);
    sunMesh.add(glow);

    // Lumière ponctuelle - source de toutes les ombres
    const light = new THREE.PointLight(0xfff1d6, 3.2, 0, 1.6);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    sunMesh.add(light);

    // Lumière d'ambiance très faible pour que les faces non éclairées
    // ne soient pas totalement noires
    scene.add(new THREE.AmbientLight(0x2a2a40, 0.35));
  }

  /* ------------------------------------------------------------------
     5. PLANÈTES + ORBITES
     Chaque planète est portée par un "pivot" (Object3D) qui tourne
     autour du Soleil ; la planète elle-même tourne sur son axe.
  ------------------------------------------------------------------- */
  const clickable = []; // toutes les meshs qu'on peut sélectionner

  function buildOrbitRing(radius) {
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xd9b36c,
      transparent: true,
      opacity: 0.18,
    });
    return new THREE.LineLoop(geometry, material);
  }

  function buildSaturnRings(planetSize) {
    const inner = planetSize * 1.4;
    const outer = planetSize * 2.4;
    const geometry = new THREE.RingGeometry(inner, outer, 64);

    // UVs radiales pour un degradé propre le long du rayon de l'anneau
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = (dist - inner) / (outer - inner);
      uv.setXY(i, t, 0.5);
    }

    const ringTexture = makeRingGradientTexture();
    const material = new THREE.MeshBasicMaterial({
      map: ringTexture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2.15;
    return ring;
  }

  function makeRingGradientTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 16;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0,    "rgba(227, 207, 155, 0)");
    grad.addColorStop(0.25, "rgba(227, 207, 155, 0.65)");
    grad.addColorStop(0.5,  "rgba(180, 160, 120, 0.3)");
    grad.addColorStop(0.75, "rgba(227, 207, 155, 0.7)");
    grad.addColorStop(1,    "rgba(227, 207, 155, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 16);
    return new THREE.CanvasTexture(c);
  }

  function buildPlanets() {
    PLANETS.forEach((data) => {
      // Anneau orbital visuel
      scene.add(buildOrbitRing(data.distance));

      // Pivot : tourne autour du Soleil, porte la planète à `distance`
      const pivot = new THREE.Object3D();
      pivot.rotation.y = Math.random() * Math.PI * 2; // phase de départ aléatoire
      pivot.rotation.x = data.tilt;
      scene.add(pivot);

      const geometry = new THREE.SphereGeometry(data.size, 48, 48);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.85,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(data.distance, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { name: data.name, message: data.message, isPlanet: true };
      pivot.add(mesh);

      if (data.rings) {
        const rings = buildSaturnRings(data.size);
        mesh.add(rings);
      }

      data._pivot = pivot;
      data._mesh = mesh;
      clickable.push(mesh);
    });
  }

  /* ------------------------------------------------------------------
     6. ASTÉROÏDE SECRET
     Caché légèrement au-dessus du plan, entre Mars et Jupiter —
     là où l'on trouve la véritable ceinture d'astéroïdes.
  ------------------------------------------------------------------- */
  let secretMesh;

  function buildSecretAsteroid() {
    const pivot = new THREE.Object3D();
    pivot.rotation.y = Math.random() * Math.PI * 2;
    pivot.position.y = 2.4; // légèrement hors du plan, pour la cacher
    scene.add(pivot);

    const geometry = new THREE.IcosahedronGeometry(0.22, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xc97a72,
      emissive: 0xc97a72,
      emissiveIntensity: 0.25,
      roughness: 0.6,
    });
    secretMesh = new THREE.Mesh(geometry, material);
    secretMesh.position.set(24.5, 0, 0);
    secretMesh.userData = { isSecret: true, name: "?", message: SECRET_MESSAGE };
    pivot.add(secretMesh);

    secretMesh._pivot = pivot;
    secretMesh._spinSpeed = 0.22;
    clickable.push(secretMesh);
  }

  /* ------------------------------------------------------------------
     7. INTERACTIONS
  ------------------------------------------------------------------- */
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  let pointerDownPos = null;
  let focusedObject = null;       // objet actuellement affiché dans le panneau
  let cameraFlight = null;        // animation de vol en cours, si existante
  const viewedFragments = new Set();

  const hud = document.getElementById("hud");
  const progressLabel = document.getElementById("progress-label");
  const messagePanel = document.getElementById("message-panel");
  const panelPlanetName = document.getElementById("panel-planet-name");
  const panelMessageText = document.getElementById("panel-message-text");
  const secretPanel = document.getElementById("secret-panel");

  function updateProgress() {
    progressLabel.textContent = `${viewedFragments.size} / ${TOTAL_FRAGMENTS} fragments`;
  }

  function getPointer(event) {
    const x = event.touches ? event.touches[0].clientX : event.clientX;
    const y = event.touches ? event.touches[0].clientY : event.clientY;
    return { x, y };
  }

  function onPointerDown(event) {
    pointerDownPos = getPointer(event);
  }

  function onPointerUp(event) {
    if (!pointerDownPos) return;
    const end = getPointer(event);
    const moved = Math.hypot(end.x - pointerDownPos.x, end.y - pointerDownPos.y);
    pointerDownPos = null;
    if (moved > 6) return; // c'était un glissement de caméra, pas un tap

    pointerNDC.x = (end.x / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(end.y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const targets = [sunMesh, ...clickable];
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      selectObject(hits[0].object);
    }
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  function worldPositionOf(object) {
    const v = new THREE.Vector3();
    object.getWorldPosition(v);
    return v;
  }

  function selectObject(object) {
    focusedObject = object;
    const data = object.userData;

    // Marque le fragment comme découvert (le fragment secret est un bonus,
    // il n'entre pas dans le compte des 9 fragments principaux)
    if (!data.isSecret) {
      viewedFragments.add(data.name);
      updateProgress();
    }

    // Lance le vol de caméra vers l'objet
    const targetPos = worldPositionOf(object);
    const objectRadius = object.geometry ? object.geometry.parameters.radius || 2 : 2;
    const viewDistance = Math.max(objectRadius * 5, 6);

    const dir = camera.position.clone().sub(targetPos).normalize();
    const newCamPos = targetPos.clone().add(dir.multiplyScalar(viewDistance));
    newCamPos.y += objectRadius * 0.6;

    cameraFlight = {
      fromPos: camera.position.clone(),
      toPos: newCamPos,
      fromTarget: controls.target.clone(),
      toTarget: targetPos.clone(),
      t: 0,
      duration: 1.3,
    };
    controls.enabled = false;

    // Affiche le panneau correspondant après un court délai,
    // pour laisser le temps au regard d'arriver
    window.setTimeout(() => {
      if (data.isSecret) {
        secretPanel.classList.remove("hidden");
      } else {
        panelPlanetName.textContent = data.name;
        panelMessageText.textContent = data.message;
        messagePanel.classList.remove("hidden");
      }
    }, 750);
  }

  function closePanels() {
    messagePanel.classList.add("hidden");
    secretPanel.classList.add("hidden");
    controls.enabled = true;
    focusedObject = null;

    // Vol de retour vers la vue d'ensemble
    cameraFlight = {
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(0, 26, 70),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      t: 0,
      duration: 1.1,
    };
    controls.enabled = false;
    window.setTimeout(() => { controls.enabled = true; }, 1150);
  }

  document.getElementById("panel-close").addEventListener("click", closePanels);
  document.getElementById("secret-close").addEventListener("click", closePanels);

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function updateCameraFlight(delta) {
    if (!cameraFlight) return;
    cameraFlight.t += delta / cameraFlight.duration;
    const t = Math.min(cameraFlight.t, 1);
    const eased = easeInOutCubic(t);

    camera.position.lerpVectors(cameraFlight.fromPos, cameraFlight.toPos, eased);
    controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.toTarget, eased);

    if (t >= 1) cameraFlight = null;
  }

  /* ------------------------------------------------------------------
     ÉCRAN D'ACCUEIL → entrée dans l'expérience
  ------------------------------------------------------------------- */
  document.getElementById("enter-btn").addEventListener("click", () => {
    document.getElementById("intro-screen").classList.add("fade-out");
    hud.classList.remove("hidden");
  });

  /* ------------------------------------------------------------------
     8. BOUCLE D'ANIMATION
  ------------------------------------------------------------------- */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Rotation des planètes autour du Soleil + sur elles-mêmes
    PLANETS.forEach((data) => {
      data._pivot.rotation.y += data.speed * delta * 0.4;
      data._mesh.rotation.y += delta * 0.5;
    });

    // L'astéroïde secret suit sa propre orbite, légèrement inclinée
    if (secretMesh) {
      secretMesh._pivot.rotation.y += secretMesh._spinSpeed * delta * 0.4;
    }

    // Légère pulsation du Soleil pour lui donner vie
    if (sunMesh) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.6) * 0.015;
      sunMesh.scale.setScalar(pulse);
    }

    updateCameraFlight(delta);
    controls.update();
    renderer.render(scene, camera);
  }

  /* ------------------------------------------------------------------
     INITIALISATION
  ------------------------------------------------------------------- */
  function init() {
    buildStarfield();
    buildSun();
    buildPlanets();
    buildSecretAsteroid();
    updateProgress();
    animate();
    document.getElementById("loading").classList.add("hidden");
  }

  init();
})();
