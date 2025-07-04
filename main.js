const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.getElementById("canvas-container").appendChild(renderer.domElement);

function setRendererSize() {
  const heightFactor = window.innerWidth < 768 ? 0.6 : 0.8;
  renderer.setSize(window.innerWidth, window.innerHeight * heightFactor);
  camera.aspect = window.innerWidth / (window.innerHeight * heightFactor);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", setRendererSize);
setRendererSize();

const clock = new THREE.Clock();
let isPaused = false;

// Camera rotation
let rotateX = 0, rotateY = 0;
let isDragging = false;
let prevX, prevY;

// Camera zoom
let radius = 30;
const baseRadius = 30;
let targetRadius = baseRadius;
let isZoomedIn = false;

// Mouse rotation
renderer.domElement.addEventListener("mousedown", e => {
  isDragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
});
renderer.domElement.addEventListener("mouseup", () => isDragging = false);
renderer.domElement.addEventListener("mousemove", e => {
  if (!isDragging) return;
  const deltaX = e.clientX - prevX;
  const deltaY = e.clientY - prevY;
  rotateY += deltaX * 0.005;
  rotateX += deltaY * 0.005;
  rotateX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotateX));
  prevX = e.clientX;
  prevY = e.clientY;
});

// Touch rotation & pinch zoom
let lastDistance = null;
renderer.domElement.addEventListener("touchstart", e => {
  isDragging = e.touches.length === 1;
  if (isDragging) {
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
  }
});
renderer.domElement.addEventListener("touchend", () => {
  isDragging = false;
  lastDistance = null;
});
renderer.domElement.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isDragging) {
    const deltaX = e.touches[0].clientX - prevX;
    const deltaY = e.touches[0].clientY - prevY;
    rotateY += deltaX * 0.005;
    rotateX += deltaY * 0.005;
    rotateX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotateX));
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
  }
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (lastDistance !== null) {
      const delta = distance - lastDistance;
      targetRadius -= delta * 0.05;
      targetRadius = Math.max(5, Math.min(100, targetRadius));
    }
    lastDistance = distance;
  }
});

// Stars
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000;
const starPos = new Float32Array(starsCount * 3);
for (let i = 0; i < starsCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 300;
starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })));

// Lights
scene.add(new THREE.PointLight(0xffffff, 1.5, 1000));
scene.add(new THREE.AmbientLight(0x222222));

// Sun
const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfdb813 }));
scene.add(sun);

// Planets
const planetData = [
  { name: "Mercury", color: 0xaaaaaa, size: 0.3, distance: 4, speed: 1.2 },
  { name: "Venus", color: 0xffcc99, size: 0.6, distance: 6, speed: 1.0 },
  { name: "Earth", color: 0x3399ff, size: 0.65, distance: 8, speed: 0.8 },
  { name: "Mars", color: 0xff6633, size: 0.5, distance: 10, speed: 0.6 },
  { name: "Jupiter", color: 0xffcc66, size: 1.2, distance: 13, speed: 0.3 },
  { name: "Saturn", color: 0xffff99, size: 1.0, distance: 16, speed: 0.25 },
  { name: "Uranus", color: 0x66ffff, size: 0.8, distance: 19, speed: 0.2 },
  { name: "Neptune", color: 0x6666ff, size: 0.75, distance: 22, speed: 0.15 },
];

const planets = [];
const planetSpeeds = {};

planetData.forEach(({ name, color, size, distance, speed }) => {
  const orbit = new THREE.Object3D();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), new THREE.MeshStandardMaterial({ color }));
  mesh.position.x = distance;
  mesh.userData.name = name;
  orbit.add(mesh);
  scene.add(orbit);
  planets.push({ name, orbit, mesh });
  planetSpeeds[name] = speed;

  const label = document.createElement("label");
  label.innerHTML = `${name}: <input type="range" min="0.01" max="2" step="0.01" value="${speed}" id="${name}-slider">`;
  document.querySelector(".sliders-container").appendChild(label);
  document.getElementById(`${name}-slider`).addEventListener("input", e => {
    planetSpeeds[name] = parseFloat(e.target.value);
  });
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  if (!isPaused) {
    const delta = clock.getDelta();
    planets.forEach(({ orbit, mesh, name }) => {
      orbit.rotation.y += planetSpeeds[name] * delta;
      mesh.rotation.y += 0.01;
    });
  }

  // Smooth zoom
  radius += (targetRadius - radius) * 0.1;

  // Update camera position
  camera.position.x = radius * Math.sin(rotateY) * Math.cos(rotateX);
  camera.position.y = radius * Math.sin(rotateX);
  camera.position.z = radius * Math.cos(rotateY) * Math.cos(rotateX);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
animate();

// Pause/Resume
document.getElementById("toggle-animation").addEventListener("click", e => {
  isPaused = !isPaused;
  e.target.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
});

// Dark/Light Theme
document.getElementById("toggle-theme").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// Tooltip
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");

window.addEventListener("mousemove", event => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length > 0) {
    const planetName = intersects[0].object.userData.name;
    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 10 + "px";
    tooltip.style.top = event.clientY + 10 + "px";
    tooltip.textContent = planetName;
  } else {
    tooltip.style.display = "none";
  }
});

// Zoom toggle on click
renderer.domElement.addEventListener("click", () => {
  isZoomedIn = !isZoomedIn;
  targetRadius = isZoomedIn ? baseRadius * 0.5 : baseRadius;
});
