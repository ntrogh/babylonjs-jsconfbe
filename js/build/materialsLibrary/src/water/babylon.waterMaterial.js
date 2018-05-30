///// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
///// <reference path="../../../dist/preview release/babylon.d.ts"/>
(function (BABYLON) {
    class WaterMaterialDefines extends BABYLON.MaterialDefines {
        constructor() {
            super();
            this.BUMP = false;
            this.REFLECTION = false;
            this.CLIPPLANE = false;
            this.ALPHATEST = false;
            this.DEPTHPREPASS = false;
            this.POINTSIZE = false;
            this.FOG = false;
            this.NORMAL = false;
            this.UV1 = false;
            this.UV2 = false;
            this.VERTEXCOLOR = false;
            this.VERTEXALPHA = false;
            this.NUM_BONE_INFLUENCERS = 0;
            this.BonesPerMesh = 0;
            this.INSTANCES = false;
            this.SPECULARTERM = false;
            this.LOGARITHMICDEPTH = false;
            this.FRESNELSEPARATE = false;
            this.BUMPSUPERIMPOSE = false;
            this.BUMPAFFECTSREFLECTION = false;
            this.rebuild();
        }
    }
    class WaterMaterial extends BABYLON.PushMaterial {
        /**
        * Constructor
        */
        constructor(name, scene, renderTargetSize = new BABYLON.Vector2(512, 512)) {
            super(name, scene);
            this.renderTargetSize = renderTargetSize;
            this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            this.specularColor = new BABYLON.Color3(0, 0, 0);
            this.specularPower = 64;
            this._disableLighting = false;
            this._maxSimultaneousLights = 4;
            /**
            * @param {number}: Represents the wind force
            */
            this.windForce = 6;
            /**
            * @param {Vector2}: The direction of the wind in the plane (X, Z)
            */
            this.windDirection = new BABYLON.Vector2(0, 1);
            /**
            * @param {number}: Wave height, represents the height of the waves
            */
            this.waveHeight = 0.4;
            /**
            * @param {number}: Bump height, represents the bump height related to the bump map
            */
            this.bumpHeight = 0.4;
            /**
             * @param {boolean}: Add a smaller moving bump to less steady waves.
             */
            this._bumpSuperimpose = false;
            /**
             * @param {boolean}: Color refraction and reflection differently with .waterColor2 and .colorBlendFactor2. Non-linear (physically correct) fresnel.
             */
            this._fresnelSeparate = false;
            /**
             * @param {boolean}: bump Waves modify the reflection.
             */
            this._bumpAffectsReflection = false;
            /**
            * @param {number}: The water color blended with the refraction (near)
            */
            this.waterColor = new BABYLON.Color3(0.1, 0.1, 0.6);
            /**
            * @param {number}: The blend factor related to the water color
            */
            this.colorBlendFactor = 0.2;
            /**
             * @param {number}: The water color blended with the reflection (far)
             */
            this.waterColor2 = new BABYLON.Color3(0.1, 0.1, 0.6);
            /**
             * @param {number}: The blend factor related to the water color (reflection, far)
             */
            this.colorBlendFactor2 = 0.2;
            /**
            * @param {number}: Represents the maximum length of a wave
            */
            this.waveLength = 0.1;
            /**
            * @param {number}: Defines the waves speed
            */
            this.waveSpeed = 1.0;
            this._renderTargets = new BABYLON.SmartArray(16);
            /*
            * Private members
            */
            this._mesh = null;
            this._reflectionTransform = BABYLON.Matrix.Zero();
            this._lastTime = 0;
            this._lastDeltaTime = 0;
            this._createRenderTargets(scene, renderTargetSize);
            // Create render targets
            this.getRenderTargetTextures = () => {
                this._renderTargets.reset();
                this._renderTargets.push(this._reflectionRTT);
                this._renderTargets.push(this._refractionRTT);
                return this._renderTargets;
            };
        }
        get useLogarithmicDepth() {
            return this._useLogarithmicDepth;
        }
        set useLogarithmicDepth(value) {
            this._useLogarithmicDepth = value && this.getScene().getEngine().getCaps().fragmentDepthSupported;
            this._markAllSubMeshesAsMiscDirty();
        }
        // Get / Set
        get refractionTexture() {
            return this._refractionRTT;
        }
        get reflectionTexture() {
            return this._reflectionRTT;
        }
        // Methods
        addToRenderList(node) {
            if (this._refractionRTT && this._refractionRTT.renderList) {
                this._refractionRTT.renderList.push(node);
            }
            if (this._reflectionRTT && this._reflectionRTT.renderList) {
                this._reflectionRTT.renderList.push(node);
            }
        }
        enableRenderTargets(enable) {
            var refreshRate = enable ? 1 : 0;
            if (this._refractionRTT) {
                this._refractionRTT.refreshRate = refreshRate;
            }
            if (this._reflectionRTT) {
                this._reflectionRTT.refreshRate = refreshRate;
            }
        }
        getRenderList() {
            return this._refractionRTT ? this._refractionRTT.renderList : [];
        }
        get renderTargetsEnabled() {
            return !(this._refractionRTT && this._refractionRTT.refreshRate === 0);
        }
        needAlphaBlending() {
            return (this.alpha < 1.0);
        }
        needAlphaTesting() {
            return false;
        }
        getAlphaTestTexture() {
            return null;
        }
        isReadyForSubMesh(mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new WaterMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (scene.texturesEnabled) {
                    if (this.bumpTexture && BABYLON.StandardMaterial.BumpTextureEnabled) {
                        if (!this.bumpTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.BUMP = true;
                        }
                    }
                    if (BABYLON.StandardMaterial.ReflectionTextureEnabled) {
                        defines.REFLECTION = true;
                    }
                }
            }
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            if (defines._areMiscDirty) {
                if (this._fresnelSeparate) {
                    defines.FRESNELSEPARATE = true;
                }
                if (this._bumpSuperimpose) {
                    defines.BUMPSUPERIMPOSE = true;
                }
                if (this._bumpAffectsReflection) {
                    defines.BUMPAFFECTSREFLECTION = true;
                }
            }
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, this._maxSimultaneousLights, this._disableLighting);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Configure this
            this._mesh = mesh;
            if (this._waitingRenderList) {
                for (var i = 0; i < this._waitingRenderList.length; i++) {
                    this.addToRenderList(scene.getNodeByID(this._waitingRenderList[i]));
                }
                this._waitingRenderList = null;
            }
            // Get correct effect      
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                if (defines.LOGARITHMICDEPTH) {
                    fallbacks.addFallback(0, "LOGARITHMICDEPTH");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "water";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor", "vSpecularColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vNormalInfos",
                    "mBones",
                    "vClipPlane", "normalMatrix",
                    "logarithmicDepthConstant",
                    // Water
                    "worldReflectionViewProjection", "windDirection", "waveLength", "time", "windForce",
                    "cameraPosition", "bumpHeight", "waveHeight", "waterColor", "waterColor2", "colorBlendFactor", "colorBlendFactor2", "waveSpeed"
                ];
                var samplers = ["normalSampler",
                    // Water
                    "refractionSampler", "reflectionSampler"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        }
        bindForSubMesh(world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect || !this._mesh) {
                return;
            }
            this._activeEffect = effect;
            // Matrices        
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures        
                if (this.bumpTexture && BABYLON.StandardMaterial.BumpTextureEnabled) {
                    this._activeEffect.setTexture("normalSampler", this.bumpTexture);
                    this._activeEffect.setFloat2("vNormalInfos", this.bumpTexture.coordinatesIndex, this.bumpTexture.level);
                    this._activeEffect.setMatrix("normalMatrix", this.bumpTexture.getTextureMatrix());
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            if (defines.SPECULARTERM) {
                this._activeEffect.setColor4("vSpecularColor", this.specularColor, this.specularPower);
            }
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            // Log. depth
            BABYLON.MaterialHelper.BindLogDepth(defines, this._activeEffect, scene);
            // Water
            if (BABYLON.StandardMaterial.ReflectionTextureEnabled) {
                this._activeEffect.setTexture("refractionSampler", this._refractionRTT);
                this._activeEffect.setTexture("reflectionSampler", this._reflectionRTT);
            }
            var wrvp = this._mesh.getWorldMatrix().multiply(this._reflectionTransform).multiply(scene.getProjectionMatrix());
            // Add delta time. Prevent adding delta time if it hasn't changed.
            let deltaTime = scene.getEngine().getDeltaTime();
            if (deltaTime !== this._lastDeltaTime) {
                this._lastDeltaTime = deltaTime;
                this._lastTime += this._lastDeltaTime;
            }
            this._activeEffect.setMatrix("worldReflectionViewProjection", wrvp);
            this._activeEffect.setVector2("windDirection", this.windDirection);
            this._activeEffect.setFloat("waveLength", this.waveLength);
            this._activeEffect.setFloat("time", this._lastTime / 100000);
            this._activeEffect.setFloat("windForce", this.windForce);
            this._activeEffect.setFloat("waveHeight", this.waveHeight);
            this._activeEffect.setFloat("bumpHeight", this.bumpHeight);
            this._activeEffect.setColor4("waterColor", this.waterColor, 1.0);
            this._activeEffect.setFloat("colorBlendFactor", this.colorBlendFactor);
            this._activeEffect.setColor4("waterColor2", this.waterColor2, 1.0);
            this._activeEffect.setFloat("colorBlendFactor2", this.colorBlendFactor2);
            this._activeEffect.setFloat("waveSpeed", this.waveSpeed);
            this._afterBind(mesh, this._activeEffect);
        }
        _createRenderTargets(scene, renderTargetSize) {
            // Render targets
            this._refractionRTT = new BABYLON.RenderTargetTexture(name + "_refraction", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
            this._refractionRTT.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._refractionRTT.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._refractionRTT.ignoreCameraViewport = true;
            this._reflectionRTT = new BABYLON.RenderTargetTexture(name + "_reflection", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
            this._reflectionRTT.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._reflectionRTT.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._reflectionRTT.ignoreCameraViewport = true;
            var isVisible;
            var clipPlane = null;
            var savedViewMatrix;
            var mirrorMatrix = BABYLON.Matrix.Zero();
            this._refractionRTT.onBeforeRender = () => {
                if (this._mesh) {
                    isVisible = this._mesh.isVisible;
                    this._mesh.isVisible = false;
                }
                // Clip plane
                clipPlane = scene.clipPlane;
                var positiony = this._mesh ? this._mesh.position.y : 0.0;
                scene.clipPlane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, positiony + 0.05, 0), new BABYLON.Vector3(0, 1, 0));
            };
            this._refractionRTT.onAfterRender = () => {
                if (this._mesh) {
                    this._mesh.isVisible = isVisible;
                }
                // Clip plane 
                scene.clipPlane = clipPlane;
            };
            this._reflectionRTT.onBeforeRender = () => {
                if (this._mesh) {
                    isVisible = this._mesh.isVisible;
                    this._mesh.isVisible = false;
                }
                // Clip plane
                clipPlane = scene.clipPlane;
                var positiony = this._mesh ? this._mesh.position.y : 0.0;
                scene.clipPlane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, positiony - 0.05, 0), new BABYLON.Vector3(0, -1, 0));
                // Transform
                BABYLON.Matrix.ReflectionToRef(scene.clipPlane, mirrorMatrix);
                savedViewMatrix = scene.getViewMatrix();
                mirrorMatrix.multiplyToRef(savedViewMatrix, this._reflectionTransform);
                scene.setTransformMatrix(this._reflectionTransform, scene.getProjectionMatrix());
                scene.getEngine().cullBackFaces = false;
                scene._mirroredCameraPosition = BABYLON.Vector3.TransformCoordinates(scene.activeCamera.position, mirrorMatrix);
            };
            this._reflectionRTT.onAfterRender = () => {
                if (this._mesh) {
                    this._mesh.isVisible = isVisible;
                }
                // Clip plane
                scene.clipPlane = clipPlane;
                // Transform
                scene.setTransformMatrix(savedViewMatrix, scene.getProjectionMatrix());
                scene.getEngine().cullBackFaces = true;
                scene._mirroredCameraPosition = null;
            };
        }
        getAnimatables() {
            var results = [];
            if (this.bumpTexture && this.bumpTexture.animations && this.bumpTexture.animations.length > 0) {
                results.push(this.bumpTexture);
            }
            if (this._reflectionRTT && this._reflectionRTT.animations && this._reflectionRTT.animations.length > 0) {
                results.push(this._reflectionRTT);
            }
            if (this._refractionRTT && this._refractionRTT.animations && this._refractionRTT.animations.length > 0) {
                results.push(this._refractionRTT);
            }
            return results;
        }
        getActiveTextures() {
            var activeTextures = super.getActiveTextures();
            if (this._bumpTexture) {
                activeTextures.push(this._bumpTexture);
            }
            return activeTextures;
        }
        hasTexture(texture) {
            if (super.hasTexture(texture)) {
                return true;
            }
            if (this._bumpTexture === texture) {
                return true;
            }
            return false;
        }
        dispose(forceDisposeEffect) {
            if (this.bumpTexture) {
                this.bumpTexture.dispose();
            }
            var index = this.getScene().customRenderTargets.indexOf(this._refractionRTT);
            if (index != -1) {
                this.getScene().customRenderTargets.splice(index, 1);
            }
            index = -1;
            index = this.getScene().customRenderTargets.indexOf(this._reflectionRTT);
            if (index != -1) {
                this.getScene().customRenderTargets.splice(index, 1);
            }
            if (this._reflectionRTT) {
                this._reflectionRTT.dispose();
            }
            if (this._refractionRTT) {
                this._refractionRTT.dispose();
            }
            super.dispose(forceDisposeEffect);
        }
        clone(name) {
            return BABYLON.SerializationHelper.Clone(() => new WaterMaterial(name, this.getScene()), this);
        }
        serialize() {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.WaterMaterial";
            serializationObject.renderList = [];
            if (this._refractionRTT && this._refractionRTT.renderList) {
                for (var i = 0; i < this._refractionRTT.renderList.length; i++) {
                    serializationObject.renderList.push(this._refractionRTT.renderList[i].id);
                }
            }
            return serializationObject;
        }
        getClassName() {
            return "WaterMaterial";
        }
        // Statics
        static Parse(source, scene, rootUrl) {
            var mat = BABYLON.SerializationHelper.Parse(() => new WaterMaterial(source.name, scene), source, scene, rootUrl);
            mat._waitingRenderList = source.renderList;
            return mat;
        }
        static CreateDefaultMesh(name, scene) {
            var mesh = BABYLON.Mesh.CreateGround(name, 512, 512, 32, scene, false);
            return mesh;
        }
    }
    __decorate([
        BABYLON.serializeAsTexture("bumpTexture")
    ], WaterMaterial.prototype, "_bumpTexture", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
    ], WaterMaterial.prototype, "bumpTexture", void 0);
    __decorate([
        BABYLON.serializeAsColor3()
    ], WaterMaterial.prototype, "diffuseColor", void 0);
    __decorate([
        BABYLON.serializeAsColor3()
    ], WaterMaterial.prototype, "specularColor", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "specularPower", void 0);
    __decorate([
        BABYLON.serialize("disableLighting")
    ], WaterMaterial.prototype, "_disableLighting", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
    ], WaterMaterial.prototype, "disableLighting", void 0);
    __decorate([
        BABYLON.serialize("maxSimultaneousLights")
    ], WaterMaterial.prototype, "_maxSimultaneousLights", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
    ], WaterMaterial.prototype, "maxSimultaneousLights", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "windForce", void 0);
    __decorate([
        BABYLON.serializeAsVector2()
    ], WaterMaterial.prototype, "windDirection", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "waveHeight", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "bumpHeight", void 0);
    __decorate([
        BABYLON.serialize("bumpSuperimpose")
    ], WaterMaterial.prototype, "_bumpSuperimpose", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "bumpSuperimpose", void 0);
    __decorate([
        BABYLON.serialize("fresnelSeparate")
    ], WaterMaterial.prototype, "_fresnelSeparate", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "fresnelSeparate", void 0);
    __decorate([
        BABYLON.serialize("bumpAffectsReflection")
    ], WaterMaterial.prototype, "_bumpAffectsReflection", void 0);
    __decorate([
        BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "bumpAffectsReflection", void 0);
    __decorate([
        BABYLON.serializeAsColor3()
    ], WaterMaterial.prototype, "waterColor", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "colorBlendFactor", void 0);
    __decorate([
        BABYLON.serializeAsColor3()
    ], WaterMaterial.prototype, "waterColor2", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "colorBlendFactor2", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "waveLength", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "waveSpeed", void 0);
    __decorate([
        BABYLON.serialize()
    ], WaterMaterial.prototype, "useLogarithmicDepth", null);
    BABYLON.WaterMaterial = WaterMaterial;
})(BABYLON || (BABYLON = {}));
