 // Global theme state
        let isDarkMode = true;
        
        // Mobile detection
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        
        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('container').appendChild(renderer.domElement);

        // Camera controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = !isMobile;
        camera.position.set(0, 50, 100);
        controls.update();

        // Add background stars
        function createStars() {
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({
                color: isDarkMode ? 0xffffff : 0x000000,
                size: isMobile ? 0.05 : 0.1,
                transparent: true
            });

            const starsVertices = [];
            for (let i = 0; i < 5000; i++) {
                const x = (Math.random() - 0.5) * 2000;
                const y = (Math.random() - 0.5) * 2000;
                const z = (Math.random() - 0.5) * 2000;
                starsVertices.push(x, y, z);
            }

            starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
            const stars = new THREE.Points(starsGeometry, starsMaterial);
            scene.add(stars);
            return stars;
        }
        let stars = createStars();

        // Lighting
        let ambientLight = new THREE.AmbientLight(isDarkMode ? 0x333333 : 0xaaaaaa);
        scene.add(ambientLight);

        let sunLight = new THREE.PointLight(isDarkMode ? 0xffffff : 0xffffdd, 1.5, 0, 0);
        sunLight.position.set(0, 0, 0);
        scene.add(sunLight);

        let directionalLight = new THREE.DirectionalLight(isDarkMode ? 0xffffff : 0xffffdd, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Sun
        const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: isDarkMode ? 0xffff00 : 0xffaa00,
            emissive: isDarkMode ? 0xffff00 : 0xffaa00,
            emissiveIntensity: 1
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        // Planet data
        const planets = [
            { name: "Mercury", darkColor: 0x8c8c8c, lightColor: 0x6c6c6c, size: 0.4, distance: 15, speed: 0.04 },
            { name: "Venus", darkColor: 0xe6c229, lightColor: 0xd6b219, size: 0.6, distance: 20, speed: 0.015 },
            { name: "Earth", darkColor: 0x3498db, lightColor: 0x2478bb, size: 0.6, distance: 25, speed: 0.01 },
            { name: "Mars", darkColor: 0xe67e22, lightColor: 0xd66e12, size: 0.5, distance: 30, speed: 0.008 },
            { name: "Jupiter", darkColor: 0xf1c40f, lightColor: 0xe1b400, size: 1.2, distance: 40, speed: 0.002 },
            { name: "Saturn", darkColor: 0xf39c12, lightColor: 0xe38c02, size: 1.0, distance: 50, speed: 0.0009 },
            { name: "Uranus", darkColor: 0x1abc9c, lightColor: 0x0aac8c, size: 0.8, distance: 60, speed: 0.0004 },
            { name: "Neptune", darkColor: 0x3498db, lightColor: 0x2478bb, size: 0.8, distance: 70, speed: 0.0001 }
        ];

        // Create planets
        const planetMeshes = [];
        const planetOrbits = [];
        const planetSpeeds = [];

        planets.forEach((planet, index) => {
            // Planet mesh
            const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
            const material = new THREE.MeshPhongMaterial({ 
                color: isDarkMode ? planet.darkColor : planet.lightColor 
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Orbit path
            const orbitGeometry = new THREE.BufferGeometry();
            const orbitPoints = [];
            const orbitRadius = planet.distance;
            
            for (let i = 0; i <= 64; i++) {
                const theta = (i / 64) * Math.PI * 2;
                orbitPoints.push(new THREE.Vector3(
                    orbitRadius * Math.cos(theta),
                    0,
                    orbitRadius * Math.sin(theta)
                ));
            }
            
            orbitGeometry.setFromPoints(orbitPoints);
            const orbitMaterial = new THREE.LineBasicMaterial({ 
                color: isDarkMode ? 0x555555 : 0xaaaaaa 
            });
            const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
            
            scene.add(orbit);
            scene.add(mesh);
            
            planetMeshes.push(mesh);
            planetOrbits.push(orbit);
            planetSpeeds.push(planet.speed);
            
            // Add control slider
            const controlDiv = document.createElement('div');
            controlDiv.innerHTML = `
                <div style="margin-bottom:10px;">
                    <label style="display:inline-block;width:${isMobile ? '60px' : '80px'};font-size:0.9em;">${planet.name}:</label>
                    <input type="range" min="0" max="0.1" step="0.001" value="${planet.speed}" 
                           oninput="updatePlanetSpeed(${index}, this.value)" 
                           style="width:${isMobile ? '100px' : '150px'};vertical-align:middle;">
                    <span style="margin-left:5px;font-size:0.9em;">${planet.speed.toFixed(4)}</span>
                </div>
            `;
            document.getElementById('planet-controls').appendChild(controlDiv);
        });

        // Raycaster for planet interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredPlanet = null;
        const tooltip = document.getElementById('tooltip');

        // Handle mouse/touch movement
        function onPointerMove(event) {
            // Update pointer position
            if (event.type === 'mousemove') {
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            } else if (event.touches) {
                mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
            }
            
            // Update raycaster
            raycaster.setFromCamera(mouse, camera);
            
            // Find intersections
            const intersects = raycaster.intersectObjects(planetMeshes);
            
            if (intersects.length > 0) {
                const planetIndex = planetMeshes.indexOf(intersects[0].object);
                const planet = planets[planetIndex];
                
                // Position tooltip near planet
                const vector = planetMeshes[planetIndex].position.clone().project(camera);
                tooltip.style.left = `${(vector.x * 0.5 + 0.5) * window.innerWidth}px`;
                tooltip.style.top = `${(-(vector.y * 0.5) + 0.5) * window.innerHeight}px`;
                tooltip.textContent = planet.name;
                tooltip.style.display = 'block';
                
                hoveredPlanet = planetIndex;
            } else {
                tooltip.style.display = 'none';
                hoveredPlanet = null;
            }
        }

        // Handle click/tap to zoom to planet
        function onPointerClick(event) {
            if (hoveredPlanet !== null) {
                const planet = planetMeshes[hoveredPlanet];
                const distance = planets[hoveredPlanet].distance;
                
                // Show planet info
                const infoDiv = document.getElementById('planet-info');
                infoDiv.style.display = 'block';
                infoDiv.innerHTML = `<h3 style="margin-top:0;">${planets[hoveredPlanet].name}</h3>
                                   <p>Distance from Sun: ${distance} AU</p>
                                   <p>Orbital Speed: ${planetSpeeds[hoveredPlanet].toFixed(4)}</p>`;
                
                // Animate camera to planet
                const targetPosition = new THREE.Vector3();
                targetPosition.copy(planet.position);
                targetPosition.multiplyScalar(1.5);
                
                gsap.to(camera.position, {
                    x: targetPosition.x,
                    y: targetPosition.y + 5,
                    z: targetPosition.z,
                    duration: 1,
                    onUpdate: function() {
                        camera.lookAt(planet.position);
                        controls.target.copy(planet.position);
                    }
                });
            }
        }

        // Event listeners for both mouse and touch
        window.addEventListener('mousemove', onPointerMove, false);
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('click', onPointerClick, false);
        window.addEventListener('touchend', onPointerClick, { passive: false });

        // Animation control
        let animationPaused = false;
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            
            if (!animationPaused) {
                const delta = clock.getDelta();
                
                planetMeshes.forEach((mesh, index) => {
                    const angle = Date.now() * planetSpeeds[index] * 0.001;
                    const distance = planets[index].distance;
                    mesh.position.x = Math.cos(angle) * distance;
                    mesh.position.z = Math.sin(angle) * distance;
                });
            }
            
            controls.update();
            renderer.render(scene, camera);
        }

        // Control functions
        function updatePlanetSpeed(index, speed) {
            planetSpeeds[index] = parseFloat(speed);
            const span = document.querySelectorAll('#planet-controls input')[index].nextElementSibling;
            span.textContent = parseFloat(speed).toFixed(4);
        }

        function resetSpeeds() {
            planets.forEach((planet, index) => {
                planetSpeeds[index] = planet.speed;
                const input = document.querySelectorAll('#planet-controls input')[index];
                input.value = planet.speed;
                input.nextElementSibling.textContent = planet.speed.toFixed(4);
            });
        }

        function toggleAnimation() {
            animationPaused = !animationPaused;
        }

        function toggleTheme() {
            isDarkMode = !isDarkMode;
            const themeButton = document.getElementById('theme-toggle');
            themeButton.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
            
            // Update background
            document.body.style.backgroundColor = isDarkMode ? '#000' : '#f0f0f0';
            
            // Update stars
            scene.remove(stars);
            stars = createStars();
            
            // Update lighting
            scene.remove(ambientLight);
            scene.remove(sunLight);
            scene.remove(directionalLight);
            
            ambientLight = new THREE.AmbientLight(isDarkMode ? 0x333333 : 0xaaaaaa);
            scene.add(ambientLight);
            
            sunLight = new THREE.PointLight(isDarkMode ? 0xffffff : 0xffffdd, 1.5, 0, 0);
            sunLight.position.set(0, 0, 0);
            scene.add(sunLight);
            
            directionalLight = new THREE.DirectionalLight(isDarkMode ? 0xffffff : 0xffffdd, 0.5);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            // Update sun
            sun.material.color.setHex(isDarkMode ? 0xffff00 : 0xffaa00);
            sun.material.emissive.setHex(isDarkMode ? 0xffff00 : 0xffaa00);
            
            // Update planets
            planetMeshes.forEach((mesh, index) => {
                mesh.material.color.setHex(isDarkMode ? planets[index].darkColor : planets[index].lightColor);
            });
            
            // Update orbits
            planetOrbits.forEach(orbit => {
                orbit.material.color.setHex(isDarkMode ? 0x555555 : 0xaaaaaa);
            });
            
            // Update UI elements
            const controls = document.getElementById('controls');
            const tooltip = document.getElementById('tooltip');
            
            if (isDarkMode) {
                controls.style.backgroundColor = 'rgba(0,0,0,0.7)';
                controls.style.color = 'white';
                tooltip.style.color = 'white';
                tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
            } else {
                controls.style.backgroundColor = 'rgba(255,255,255,0.7)';
                controls.style.color = '#000';
                tooltip.style.color = 'black';
                tooltip.style.backgroundColor = 'rgba(255,255,255,0.7)';
            }
        }

        // Handle window resize
        function handleResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Adjust control panel for mobile
            const controls = document.getElementById('controls');
            if (window.innerWidth < 768) {
                controls.style.maxWidth = '200px';
                controls.style.fontSize = '0.8em';
            } else {
                controls.style.maxWidth = '300px';
                controls.style.fontSize = '';
            }
        }

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call

        // Start animation
        animate();
