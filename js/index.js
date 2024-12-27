// Config
const s3BaseUrl = "https://buster-photos.s3.amazonaws.com/";
const minImageId = 1;
const maxImageId = 81;
let i = 0;

const visiblePhotosDistance = 15;
const minCameraDistance = 0;
const photoMarginZ = 0.5;
const spawnGridHeight = 2;
const spawnGridWidth = 3;
const spawnMinX = -2;
const spawnMaxX = 2;
const spawnMinY = -2;
const spawnMaxY = 2;
const photoWidth = 1;
const spawnRandomness = 0.5;

// Animation context
let currentlyVisibleIds = [];
let lastWasUpperLeft = false;

// Setup the scene
let scene, camera, renderer, textureLoader, photoTextures;

const setup = () => {
  // Setup the scene
  scene = new THREE.Scene();

  // Setup the camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 1; // Adjusted initial camera position

  // Setup the renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("threejs-canvas"),
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Setup the texture loader
  textureLoader = new THREE.TextureLoader();
  photoTextures = [];

  // Add a resize event listener
  window.addEventListener("resize", resize);
};

const resize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const loadPhotoTextures = async () => {
  const promises = [];
  for (let i = minImageId; i <= maxImageId; i++) {
    promises.push(loadSinglePhotoTexture(i));
  }

  try {
    await Promise.all(promises);
  } catch (e) {
    console.error(e);
  }
};

const loadSinglePhotoTexture = async (id) => {
  const url = `${s3BaseUrl}${id}.webp`;
  const photoTexture = await new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
  photoTextures.push(photoTexture);
  console.log("Loaded photo", id);
};

const spawnPhotos = () => {
  while (
    scene.children.length < 1 ||
    scene.children.every(
      (child) =>
        child.position.z >
        camera.position.z - minCameraDistance - visiblePhotosDistance,
    )
  ) {
    const photoId = getRandomPhotoId();
    spawnNewPhoto(photoId);
  }

  //Remove photos that are behind the camera
  const photosToRemove = scene.children.filter(
    (child) => child.position.z > camera.position.z,
  );
  photosToRemove.forEach((photo) => {
    scene.remove(photo);
    currentlyVisibleIds = currentlyVisibleIds.filter(
      (id) => id !== photo.userData.id,
    );
  });
};

const getRandomPhotoId = () => {
  const photoIds = Array.from(
    { length: maxImageId - minImageId + 1 },
    (_, i) => i + minImageId,
  );
  // Remove currently visible ids
  const availableIds = photoIds.filter(
    (id) => !currentlyVisibleIds.includes(id) && photoTextures[id - minImageId],
  );

  // Return a random id
  return availableIds[Math.floor(Math.random() * availableIds.length)];
};

const getGridBasedPosition = (gridIndex) => {
  const gridX = gridIndex % spawnGridWidth;
  const gridY = Math.floor(gridIndex / spawnGridWidth);

  // Calculate base position
  const baseX =
    spawnMinX +
    (gridX * (spawnMaxX - spawnMinX)) / spawnGridWidth +
    spawnGridWidth / 2 -
    photoWidth;
  const baseY =
    spawnMinY +
    (gridY * (spawnMaxY - spawnMinY)) / spawnGridHeight +
    spawnGridHeight / 2;

  // Add randomness
  const x = baseX + Math.random() * spawnRandomness;
  const y = baseY + Math.random() * spawnRandomness;

  return { x, y };
};

const spawnNewPhoto = (id) => {
  const photoTexture = photoTextures[id - minImageId];
  const photoMaterial = new THREE.MeshBasicMaterial({ map: photoTexture });
  const photoHeight =
    (photoTexture.image.height / photoTexture.image.width) * photoWidth;
  const photoGeometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
  const photoMesh = new THREE.Mesh(photoGeometry, photoMaterial);

  // Calculate the x and y position
  const gridPosition = lastWasUpperLeft * 3 + Math.floor(Math.random() * 3);
  const { x, y } = getGridBasedPosition(gridPosition);

  // Calculate the z position
  const lowestPhotoZ = scene.children.reduce(
    (lowestZ, child) => Math.min(lowestZ, child.position.z),
    0,
  );

  const z = lowestPhotoZ - photoMarginZ;

  // Set the position
  photoMesh.position.set(x, y, z);

  // Add custom data to the photo mesh
  photoMesh.userData.id = id;

  console.log(photoMesh.position);

  // Add the photo to the scene
  scene.add(photoMesh);

  // Update the currently visible ids
  currentlyVisibleIds.push(id);

  // Update the lastWasUpperLeft
  lastWasUpperLeft = !lastWasUpperLeft;
};

// Animation loop
const animate = function () {
  requestAnimationFrame(animate);

  // Spawn photos
  spawnPhotos();

  // Move camera forward
  camera.position.z -= 0.01;

  renderer.render(scene, camera);
};

const main = async () => {
  setup();

  loadPhotoTextures();

  // Sleep until 30 photos are loaded
  while (photoTextures.length < 30) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Remove loading screen
  document.getElementById("loading").style.display = "none";
  animate();
};

main();
