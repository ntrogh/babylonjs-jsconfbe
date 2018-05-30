/// <reference path="../node_modules/babylonjs/babylon.d.ts" />
class Game {
    //#endregion
    // Create canvas and engine
    constructor(canvasElement) {
        this.alpha = 0;
        this.canvas = document.getElementById(canvasElement);
        this.engine = new BABYLON.Engine(this.canvas, true);
        // Listen for browser/canvas resize events
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }
    createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.createCamera();
        this.createSphereAndGround();
        this.createLighting();
        this.createObjects();
        this.addShadows();
        this.addMaterials();
        this.animateBox();
        this.addParticles();
        this.addSkybox();
        // this.importMesh();
        this.addReflection();
    }
    createCamera() {
        // Create a camera, and set its position to slightly behind our meshes
        // this.universalCamera = new BABYLON.UniversalCamera('freeCamera', new BABYLON.Vector3(0, 5, -10), this.scene);
        // Make our camera look at the middle of the scene, where we have placed our items
        // this.universalCamera.setTarget(BABYLON.Vector3.Zero());
        // Attach the camera to the canvas, this allows us to give input to the camera
        // this.universalCamera.attachControl(this.canvas, false);
        // Create an arc rotate camera
        this.arcCamera = new BABYLON.ArcRotateCamera('arcCamera', 3.2 * Math.PI / 2, Math.PI / 3, 10, BABYLON.Vector3.Zero(), this.scene);
        // Attach the camera to the canvas, this allows us to give input to the camera
        this.arcCamera.attachControl(this.canvas, false);
    }
    createSphereAndGround() {
        this.sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { segments: 16, diameter: 1 }, this.scene);
        this.sphere.position.y = 1;
        this.ground = BABYLON.MeshBuilder.CreateGround('groundPlane', { width: 6, height: 6, subdivisions: 2 }, this.scene);
    }
    createObjects() {
        this.knot = BABYLON.Mesh.CreateTorusKnot("knot", 0.5, 0.5, 128, 64, 2, 3, this.scene);
        this.knot.position = new BABYLON.Vector3(-2, 1, 0);
        this.box = BABYLON.MeshBuilder.CreateBox('box', { size: 1 }, this.scene);
        this.box.position = new BABYLON.Vector3(2, 1, 0);
        this.box.rotation.x = Math.PI / 6;
        this.box.rotation.y = Math.PI / 6;
        this.box.scaling.x = 0.5;
    }
    createLighting() {
        // Hemispheric light - ambient environment light
        // var hemisphericLight = new BABYLON.HemisphericLight('skyLight', new BABYLON.Vector3(0, 1, 0), this.scene);
        // Directional light - light emitted from everywhere in specified direction, infinite range
        // this.dirLight = new BABYLON.DirectionalLight("Dir0", new BABYLON.Vector3(0, -1, 0), this.scene);
        // this.dirLight.diffuse = new BABYLON.Color3(1, 1, 1);
        // this.dirLight.specular = new BABYLON.Color3(1, 1, 1);
        // Spot light - defined by position, angle, direction, shines a cone of light
        this.spotLight = new BABYLON.SpotLight("Spot0", new BABYLON.Vector3(0, 10, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, this.scene);
        this.spotLight.diffuse = new BABYLON.Color3(1, 1, 1);
        this.spotLight.specular = new BABYLON.Color3(1, 1, 1);
        // Point light - similar to a lightbulb, shines in all directions
        this.pointLight1 = new BABYLON.PointLight("Point1", new BABYLON.Vector3(0, -10, 0), this.scene);
        this.pointLight1.diffuse = new BABYLON.Color3(0.5, 0.5, 1);
        this.pointLight1.specular = new BABYLON.Color3(0.5, 0.5, 1);
        this.pointLight2 = new BABYLON.PointLight("Point2", new BABYLON.Vector3(10, 5, 0), this.scene);
        this.pointLight2.diffuse = new BABYLON.Color3(0, 1, 0);
        this.pointLight2.specular = new BABYLON.Color3(0, 1, 0);
    }
    updateLighting() {
        this.pointLight1.position = new BABYLON.Vector3(10 * Math.sin(this.alpha), 0, -10 * Math.cos(this.alpha));
        this.pointLight2.position = new BABYLON.Vector3(10 * Math.cos(this.alpha), 0, 10 * Math.sin(this.alpha));
        this.spotLight.position = new BABYLON.Vector3(10 * Math.sin(this.alpha) / 4, 5, 0);
        this.alpha += 0.01;
    }
    addShadows() {
        var shadowGenerator = new BABYLON.ShadowGenerator(1024, this.spotLight);
        shadowGenerator.addShadowCaster(this.sphere);
        shadowGenerator.addShadowCaster(this.knot);
        shadowGenerator.addShadowCaster(this.box);
        shadowGenerator.useExponentialShadowMap = true;
        this.ground.receiveShadows = true;
    }
    addMaterials() {
        // Create a wireframe material
        var wireFrameMaterial = new BABYLON.StandardMaterial("texture1", this.scene);
        wireFrameMaterial.wireframe = true;
        //Creation of a red material with alpha
        var redMaterial = new BABYLON.StandardMaterial("texture2", this.scene);
        redMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); //Red
        redMaterial.alpha = 0.3;
        //Creation of a material with an image texture
        var miscMaterial = new BABYLON.StandardMaterial("texture3", this.scene);
        miscMaterial.diffuseTexture = new BABYLON.Texture("textures/misc.jpg", this.scene);
        //Creation of a material with an image texture - wood
        var woodMaterial = new BABYLON.StandardMaterial("texture4", this.scene);
        woodMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", this.scene);
        //Creation of a material with an image texture - wood
        var grassMaterial = new BABYLON.StandardMaterial("texture5", this.scene);
        grassMaterial.diffuseTexture = new BABYLON.Texture("textures/grass.png", this.scene);
        // grassMaterial.backFaceCulling = false;
        //Apply the materials to meshes
        this.sphere.material = miscMaterial;
        this.knot.material = wireFrameMaterial;
        this.box.material = woodMaterial;
        this.ground.material = grassMaterial;
    }
    animateBox() {
        //Create a scaling animation at 30 FPS
        var animationBox = new BABYLON.Animation("boxAnimation", "rotation.x", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        // Animation keys
        var keys = [];
        // At the animation key 0, the value of scaling is "1"
        keys.push({
            frame: 0,
            value: 0
        });
        // At the animation key 50, the value of scaling is "0.2"
        keys.push({
            frame: 50,
            value: Math.PI
        });
        // At the animation key 100, the value of scaling is "1"
        keys.push({
            frame: 100,
            value: 0
        });
        //Adding keys to the animation object
        animationBox.setKeys(keys);
        //Then add the animation object to box
        this.box.animations.push(animationBox);
        //Finally, launch animations on box, from key 0 to key 100 with loop activated
        this.scene.beginAnimation(this.box, 0, 100, true);
    }
    addParticles() {
        // Create a particle system
        var particleSystem = new BABYLON.ParticleSystem("particles", 2000, this.scene);
        //Texture of each particle
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        // Where the particles come from
        particleSystem.emitter = this.box; // the starting object, the emitter
        particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, 0); // Starting all from
        particleSystem.maxEmitBox = new BABYLON.Vector3(1, 0, 0); // To...
        // Colors of all particles
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        // Size of each particle (random between...
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        // Life time of each particle (random between...
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        // Emission rate
        particleSystem.emitRate = 1500;
        // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        // Set the gravity of all particles
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        // Direction of each particle after it has been emitted
        particleSystem.direction1 = new BABYLON.Vector3(-7, 8, 3);
        particleSystem.direction2 = new BABYLON.Vector3(7, 8, -3);
        // Angular speed, in radians
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        // Speed
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        particleSystem.updateSpeed = 0.005;
        // Start the particle system
        particleSystem.start();
    }
    addSkybox() {
        // Skybox
        this.skybox = BABYLON.Mesh.CreateBox("skyBox", 100.0, this.scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        this.skybox.material = skyboxMaterial;
    }
    importMesh() {
        BABYLON.SceneLoader.ImportMesh("", "scenes/", "skull.babylon", this.scene, function (newMeshes) {
            // Set the target of the camera to the first imported mesh
            newMeshes[0].scaling = new BABYLON.Vector3(0.02, 0.02, 0.02);
            newMeshes[0].position = new BABYLON.Vector3(0, 3, 0);
        });
    }
    addReflection() {
        var material = new BABYLON.StandardMaterial("kosh5", this.scene);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.reflectionTexture = new BABYLON.CubeTexture("textures/TropicalSunnyDay", this.scene);
        material.reflectionTexture.level = 0.5;
        material.specularPower = 64;
        material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        // Fresnel
        material.emissiveFresnelParameters = new BABYLON.FresnelParameters();
        material.emissiveFresnelParameters.bias = 0.4;
        material.emissiveFresnelParameters.power = 2;
        material.emissiveFresnelParameters.leftColor = BABYLON.Color3.Black();
        material.emissiveFresnelParameters.rightColor = BABYLON.Color3.White();
        this.sphere.material = material;
    }
    run() {
        this.engine.runRenderLoop(() => {
            // this.updateLighting();
            this.scene.render();
        });
    }
}
// Create our game class using the render canvas element
let game = new Game('renderCanvas');
// Create the scene
game.createScene();
// start animation
game.run();
