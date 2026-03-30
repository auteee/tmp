/*
|--------------------------------------------------------------------------
| 名称: Created by Xcui. Date: 2026/3/26 14:20
|--------------------------------------------------------------------------
|
| 描述:
|
|
*/
// 还原 xt 类
// https://ve.mvpmeta.com/preview/#/?id=5042&secret=NTA0Mg==
// 主要类
import * as THREE from "three";
// import { Nodes } from 'three/addons/objects/Nodes.js'
// import { UVTransformNode, TextureNode, UVNode, materialNode } from 'three/nodes'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import JSZip from "jszip"
import AnimationController from './AnimationController.js'

export default class Three3d {
    constructor(container)
    {
        // 1. 资源/数据存储类
        this.cubemaps = []; // 立方体贴图数组（CubeTexture） 1
        this.all_files = {}; // 所有加载的文件资源（键值对：文件名/路径 => 资源实例）1
        this.gif_anis = []; // GIF动画相关的材质/纹理实例1
        this.skeletons = []; // 骨骼动画实例数组1
        this.tree = []; // 场景层级树结构1

        // 2. 配置/设置类
        this.play_setting = {}; // 播放配置（速度、循环、暂停等）1
        this.script = {}; // 自定义交互脚本配置1
        this.is_mobile = true; // 是否为移动端环境1

        // 3. 动画/帧管理类
        this.frame_move_recall = []; // 每帧移动回调函数数组 1
        this.animation = new AnimationController() // new pt(); // 动画管理器实例1
        this.animation.o2 = this; // 绑定当前场景管理器实例到动画对象1
        this.total_time = 0; // 累计运行总时间（ms）1
        this.last_frame_time = 0; // 上一帧时间戳1
        this.frame_total_count = 0; // 累计渲染帧数1

        // 4. 相机相关类
        this.cameras = []; // 场景中的所有相机实例（PerspectiveCamera/OrthographicCamera）1
        this.camera_switch_count = 0; // 相机切换累计次数
        this.camera_move_dir = new THREE.Vector3(); // 相机移动方向向量（Vector3）1
        this.switch_camera_finish = []; // 相机切换完成后的回调数组1

        // 5. 后处理效果类
        this.postEffect = {
            bDefaultRender: true, // 是否启用默认渲染1
            glow: false, // 辉光效果开关1
            sobel: false, // 索贝尔边缘检测开关1
            fxaa: false, // FXAA抗锯齿开关1
            lut: false, // LUT颜色查找表开关1
            film: false, // 胶片颗粒效果开关1
            outline: false, // 轮廓描边开关1
            ao: false, // 环境光遮蔽（AO）开关1
            glow_strength: 0.5, // 辉光强度1
            glow_threshold: 0, // 辉光阈值1
            glow_radius: 0, // 辉光半径1
            aoIntensity: 0.002, // AO强度1
            aoRadius: 20, // AO半径1
            aoScale: 1000 // AO缩放1
        };

        //=================== xc++
        // 初始化 TextureLoader（Three.js 官方推荐）
        // this.loadingManager = new THREE.LoadingManager();
        // this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.textureLoader = new THREE.TextureLoader();
        this.load_small_texture = false

        this.init(container)
    }

    /**
     * 初始化Three.js场景核心（资源、渲染器、场景、相机、默认纹理、后期处理等）
     * @param {HTMLElement} container - 渲染容器DOM元素
     */
    // 3. 核心逻辑拆解
    // 该 init 方法是整个 Three.js 应用的入口初始化函数，涵盖 10 大核心模块：
    // 基础状态初始化：帧计数、资源缓存、时间戳、容器绑定；
    // 纯色纹理创建：手动生成 1x1 像素的红 / 绿 / 蓝 / 黑纹理（DataTexture）；
    // 功能纹理加载：加载白色 / 透明 / 半透明 / 法线等默认纹理（TextureLoader）；
    // 渲染器初始化：区分移动端 / 桌面端配置，启用阴影、适配像素比；
    // LUT 着色器扩展：重写 Three.js 内置的 CustomToneMapping，实现 LUT 颜色校正；
    // 分辨率适配：4K 以上分辨率自动缩放，平衡性能与画质；
    // 场景 / 相机 / 控制器：创建场景、透视相机、轨道控制器、FPS 控制器；
    // 时钟 / 场景重置：初始化动画时钟，重置场景到初始状态；
    // 后期通道创建：调用 create_render_pass 初始化后期效果；
    // DOM 挂载 / 动画启动：挂载渲染画布、绑定窗口事件、启动主动画 / 骨架动画。
    //
    // 核心功能：init 是 Three.js 应用的全量初始化入口，完成从资源加载、渲染器配置、场景 / 相机创建，到后期效果、控制器、动画循环的所有基础初始化工作，是整个 3D 应用的启动核心。
    init(container)
    {
        // ===================== 1. 初始化基础状态/资源管理器 =====================
        this.frame_count = 0;                          // 帧计数器
        this.image_loader = new THREE.ImageLoader();   // 图片加载器（ge["O"]对应THREE.ImageLoader）
        this.loaded_images = {};                       // 已加载图片缓存
        this.unload_textures = {};                     // 待释放纹理缓存
        this.meshes = {};                              // 网格对象缓存
        this.multi_selection = [];                     // 多选对象列表
        this.last_time = Date.now();                   // 上一帧时间戳
        this.container = container;                    // 渲染容器

        // 获取容器宽高，初始化渲染尺寸
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        console.log(containerWidth, containerHeight, "分辨率");
        this.WIDTH = containerWidth;
        this.HEIGHT = containerHeight;
        this.maps = {};                                // 纹理映射表
        this.copy_maps = [];                           // 纹理副本列表
        this.default_textures = {};                    // 默认纹理缓存（红/绿/蓝/黑/白等）

        // ===================== 2. 创建默认纯色纹理（1x1像素） =====================
        // --- 2.1 红色纹理 ---
        {
            const width = 1;
            const height = 1;
            // 重点：RGBA 需要 4 个值（R、G、B、A），所以数组长度是 4
            // 红色 + 不透明（Alpha=255）
            const pixelData = new Uint8Array([255, 0, 0, 255]);

            // 核心修改：RGBAFormat
            const redTexture = new THREE.DataTexture(
                pixelData,            // 数据
                width,                // 宽
                height,               // 高
                // THREE.RGBAFormat,     //
                // THREE.UnsignedByteType,
                // THREE.UVMapping,
                // THREE.ClampToEdgeWrapping,
                // THREE.ClampToEdgeWrapping,
                // THREE.NearestFilter,
                // THREE.NearestFilter,
                // 1,
                // THREE.SRGBColorSpace
            );
            redTexture.colorSpace = THREE.SRGBColorSpace
            redTexture.needsUpdate = true;

            redTexture.o2_default = "red";     // 自定义标识
            this.map_red = redTexture;         // 保存红色纹理引用
            this.default_textures.red = redTexture;

        }

        // --- 2.2 绿色纹理 ---
        {
            const pixelData = new Uint8Array([0, 255, 0, 255]);

            // 官方默认 width: 1, height: 1， format: RGBAFormat
            const greenTexture = new THREE.DataTexture(pixelData)

            greenTexture.colorSpace = THREE.SRGBColorSpace
            greenTexture.needsUpdate = true;

            greenTexture.o2_default = "green";
            this.map_green = greenTexture;
            this.default_textures.green = greenTexture;
        }

        // --- 2.3 蓝色纹理 ---
        {
            const pixelData = new Uint8Array([0, 0, 255, 255]);

            const blueTexture = new THREE.DataTexture(pixelData);

            blueTexture.colorSpace = THREE.SRGBColorSpace
            blueTexture.needsUpdate = true;
            blueTexture.o2_default = "blue";

            this.map_blue = blueTexture;
            this.default_textures.blue = blueTexture;
        }

        // --- 2.4 黑色纹理 ---
        {
            const pixelData = new Uint8Array([0, 0, 0, 255]);

            const blackTexture = new THREE.DataTexture(pixelData);

            blackTexture.colorSpace = THREE.SRGBColorSpace
            blackTexture.needsUpdate = true
            blackTexture.o2_default = "black";

            this.map_black = blackTexture;
            this.default_textures.black = blackTexture;
        }

        // ===================== 3. 加载默认功能纹理（白色/透明/法线等） =====================
        // --- 3.1 白色纹理 ---
        {
            // ge["bc"]=THREE.TextureLoader，i("a420")是纹理资源ID/路径
            const whiteTexture = this.textureLoader.load('./imgs/white.733e7f3a.png');

            whiteTexture.wrapS = THREE.RepeatWrapping; // ge["Mb"]=THREE.RepeatWrapping
            whiteTexture.wrapT = THREE.RepeatWrapping;
            whiteTexture.flipX = false;
            whiteTexture.flipY = false;
            whiteTexture.needsUpdate = true;           // 标记纹理需要更新
            whiteTexture.o2_default = "white";

            this.map_white = whiteTexture;
            this.default_textures.white = whiteTexture;
        }

        // --- 3.2 透明纹理 ---
        {
            // i("26f4")
            const alphaTexture = this.textureLoader.load('./imgs/alpha.e6ddc245.png');

            alphaTexture.wrapS = THREE.RepeatWrapping;
            alphaTexture.wrapT = THREE.RepeatWrapping;
            alphaTexture.flipX = false;
            alphaTexture.flipY = false;
            alphaTexture.needsUpdate = true;
            alphaTexture.o2_default = "alpha";

            this.map_alpha = alphaTexture;
            this.default_textures.alpha = alphaTexture;
        }

        // --- 3.3 半透明纹理 ---
        {
            // i("bf23")
            const halfAlphaTexture = this.textureLoader.load('./imgs/half_alpha.1588e218.png');

            halfAlphaTexture.wrapS = THREE.RepeatWrapping;
            halfAlphaTexture.wrapT = THREE.RepeatWrapping;
            halfAlphaTexture.flipX = false;
            halfAlphaTexture.flipY = false;
            halfAlphaTexture.needsUpdate = true;
            halfAlphaTexture.o2_default = "half_alpha";

            this.half_alpha = halfAlphaTexture;
            this.default_textures.half_alpha = halfAlphaTexture;
        }

        // --- 3.4 法线纹理 ---
        {
            // i("c911")
            const normalTexture = this.textureLoader.load('./imgs/normalmap.8135b487.jpg');

            normalTexture.wrapS = THREE.RepeatWrapping;
            normalTexture.wrapT = THREE.RepeatWrapping;
            normalTexture.flipX = false;
            normalTexture.flipY = false;
            normalTexture.needsUpdate = true;
            normalTexture.o2_default = "normal_map";

            this.map_normal = normalTexture;
            this.default_textures.map_normal = normalTexture;
            this.default_textures.normal_map = normalTexture;
        }

        // ===================== 4. 初始化渲染器（区分移动端/桌面端） =====================
        // 移动端：开启抗锯齿和透明通道
        this.renderer = new THREE.WebGLRenderer({ // ge["oc"]=THREE.WebGLRenderer
            antialias: true,
            alpha: true,
            // powerPreference: "low-power" // 低功耗模式，
        });

        // 渲染器基础配置
        // 颜色空间统一（必须，否则颜色偏暗/偏色）
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // 原程序值是 0
        this.renderer.toneMappingExposure = 1;                // 曝光度默认值

        // 像素比（防止高清屏模糊）
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 阴影（需要再开，开销较大）
        this.renderer.shadowMap.enabled = true;               // 启用阴影映射
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;// ge["wb"]=THREE.PCFSoftShadowMap（软阴影）

        // 自动清理（多场景、后期处理时可关闭）
        // this.renderer.autoClear = true;

        // this.renderer.map_lut = this.map_white;               // 默认LUT纹理为白色

        // ===================== 5. 自定义LUT色调映射着色器（核心扩展） =====================
        // 替换Three.js内置的CustomToneMapping函数，实现LUT颜色校正


        // ===================== 6. 适配超高清分辨率（>3840px时缩放） =====================
        let renderWidth = containerWidth;
        this.cwidth = containerWidth;
        this.cheight = containerHeight;

        // 分辨率超过3840px（4K）时，渲染尺寸减半，提升性能
        if (renderWidth > 3840) {
            this.WIDTH = containerWidth / 2;
            this.HEIGHT = containerHeight / 2;
            this.renderer.setSize(this.WIDTH, this.HEIGHT, false); // 不更新样式尺寸
        }
        else {
            this.renderer.setSize(containerWidth, containerHeight);
        }
        console.log(containerWidth, containerHeight, "分辨率");

        // ===================== 7. 初始化场景、相机、控制器 =====================
        // 7.1 创建场景（ge["Nb"]=THREE.Scene）
        this.scene = new THREE.Scene();

        // 7.2 创建透视相机（ge["xb"]=THREE.PerspectiveCamera）
        const fov = 60;                // 视场角
        const aspectRatio = this.WIDTH / this.HEIGHT; // 宽高比
        const nearClip = 100;          // 近裁剪面
        const farClip = 500000;        // 远裁剪面（5e5=500000）
        this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, nearClip, farClip);
        this.camera.position.set(0, 3000, -5000); // 相机初始位置（3e3=3000，5e3=5000）

        // 7.3 创建轨道控制器（st=THREE.OrbitControls）
        this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.cameraControls.target.set(0, 0, 0);    // 控制器目标点
        this.cameraControls.enableZoom = true;      // 启用缩放
        this.cameraControls.enableDamping = true;   // 启用阻尼（平滑移动）
        this.cameraControls.rotateSpeed = 1;        // 旋转速度
        this.cameraControls.minDistance = 100;      // 最小缩放距离
        this.cameraControls.maxDistance = 500000;   // 最大缩放距离
        this.cameraControls.update();               // 更新控制器状态

        console.log(this.renderer.domElement.style, "render");

        // 7.4 创建FPS控制器（at["a"]=THREE.FlyControls/FPSControls）
        this.fpsControls = new PointerLockControls(this.camera, this.renderer.domElement);

        // ===================== 8. 初始化时钟、重置场景、创建后期通道 =====================
        this.clock = new THREE.Timer(); // ge["n"]=THREE.Clock（时钟，用于动画计时）
        this.reset_scene();             // 重置场景到初始状态
        this.create_render_pass();      // 创建后期渲染通道

        // ===================== 9. 挂载渲染DOM、绑定事件、启动动画 =====================
        this.container.appendChild(this.renderer.domElement); // 将渲染画布添加到容器
        console.log(this.renderer.domElement, "render");

        // 绑定窗口大小调整事件
        window.addEventListener("resize", this.onWindowResize.bind(this), false);

        // 启动主动画循环和骨架动画循环
        this.animate();
        this.animate_skeleton();
    }

    // 核心功能：该方法是 Three.js 窗口 / 容器尺寸变化的核心适配入口，覆盖相机、渲染器、后处理全链路的尺寸同步，保证场景在不同尺寸下无拉伸、效果正常。
    // 关键特性：
    // 兼容多类型入参（数字 / 事件对象），适配灵活
    // 区分透视 / 正交相机适配逻辑，覆盖不同相机类型
    // 超宽屏性能优化，自动减半渲染尺寸
    // 同步所有后处理通道和特效参数，保证视觉效果一致
    // 依赖说明：需确保 this.container（渲染容器）、this.camera（相机实例）、this.renderer（渲染器）及各类后处理对象已提前初始化
    /**
     * 处理窗口/容器尺寸变化的适配逻辑（Three.js核心适配方法）
     * @param {number|Event} size - 高度偏移值（数字）或事件对象（兼容传参）
     */
    onWindowResize = (size) => {
        // console.log(size, "size");

        let offsetHeight = 0;
        if (typeof size === "number") {
            offsetHeight = size;
        }

        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight - offsetHeight;

        const clientWidth = containerWidth;
        const clientHeight = containerHeight;

        this.WIDTH = containerWidth;
        this.HEIGHT = containerHeight;
        this.cwidth = clientWidth;
        this.cheight = clientHeight;

        // 更新相机
        this.camera.aspect = containerWidth / containerHeight;
        this.camera.updateProjectionMatrix();

        // 正交相机特殊处理
        if (this.camera.type === "OrthographicCamera") {
            this.camera.left = this.camera.bottom * containerWidth / containerHeight;
            this.camera.right = this.camera.top * containerWidth / containerHeight;
            this.camera.updateMatrix();
        }

        let renderWidth = containerWidth;
        let renderHeight = containerHeight;

        // 超宽屏降分辨率
        if (clientWidth > 3840) {
            renderWidth /= 2;
            renderHeight /= 2;
        }

        // 设置渲染器尺寸
        if (clientWidth > 3840) {
            this.renderer.setSize(renderWidth, renderHeight, false);
            this.renderer2 && this.renderer2.setSize(renderWidth, renderHeight, false);
        }
        else {
            this.renderer.setSize(renderWidth, renderHeight);
            this.renderer2 && this.renderer2.setSize(renderWidth, renderHeight);
        }

        // 后处理通道
        this.finalComposer && this.finalComposer.setSize(renderWidth, renderHeight);
        this.bloomComposer && this.bloomComposer.setSize(renderWidth, renderHeight);

        // Sobel 边缘检测
        if (this.effectSobel) {
            const px = window.devicePixelRatio;
            this.effectSobel.uniforms.resolution.value.x = renderWidth * px;
            this.effectSobel.uniforms.resolution.value.y = renderHeight * px;
        }

        // FXAA 抗锯齿
        if (this.fxaaPass) {
            const px = this.renderer.getPixelRatio();
            this.fxaaPass.material.uniforms.resolution.value.x = 1 / (renderWidth * px);
            this.fxaaPass.material.uniforms.resolution.value.y = 1 / (renderHeight * px);
        }
    }

    // 核心功能：animate 是整个 3D 应用的动画主循环，整合了 GIF 纹理动画、双版本相机动画、DOM-3D 绑定、渲染执行、性能统计等所有实时更新逻辑，是驱动场景的核心。
    // 核心设计：
    // 基于 requestAnimationFrame 实现流畅循环；
    // 用 deltaTime 保证动画速度稳定；
    // 新版相机动画采用「缓动 + 四元数插值」实现平滑切换；
    // 视图投影矩阵实现 2D DOM 与 3D 位置绑定。
    // 关键价值：一站式整合所有动态逻辑，保证 3D 场景的交互性、流畅性和可视化效果。
    animate = () => {
        // 1. 启动下一帧动画（浏览器原生动画循环）
        requestAnimationFrame(this.animate);

        // 2. 计算帧时间差（deltaTime）
        const now = Date.now();
        this.update_frame_rate(now);

        // 计算帧间隔时间（秒）
        let delta = (now - this.last_time) / 1000; // 转换为秒

        // 移动端帧率优化：帧时间差小于0.03秒（≈33帧/秒）则跳过
        if (this.is_mobile) {
            delta = Math.min(delta, 0.03); // 限制最大 delta，而非跳过
        }

        // 3. 渲染性能统计更新（可选）
        if (this.rendererStats && this.rendererStats.bShow) {
            this.rendererStats.update(this.renderer);
        }

        // ==================== 模块1：GIF 纹理动画更新 ====================
        if (this.gif_anis) {
            for (let i = 0; i < this.gif_anis.length; i++) {
                const anim = this.gif_anis[i];
                const texture = anim.texture;

                anim.count++;
                if (anim.count >= anim.frame) {
                    anim.count = 0;
                    anim.current_frame++;

                    // 循环播放
                    if (anim.current_frame >= anim.width * anim.height) {
                        anim.current_frame = 0;
                    }

                    // 设置纹理平铺与偏移（雪碧图播放）
                    texture.repeat.set(1 / anim.width, 1 / anim.height);

                    const xIndex = anim.current_frame % anim.width;
                    const yIndex = anim.height - Math.ceil((anim.current_frame + 1) / anim.width);

                    texture.offset.set(xIndex / anim.width, yIndex / anim.height);
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }
            }
        }

        // ==================== 模块2：相机平滑插值（模式1） ====================
        if (this.camera_switch_count > 0) {
            this.camera_switch_count--;
            this.cameraControls.target.lerp(this.camera_target, 0.05);
            this.camera.position.lerp(this.camera_eye, 0.05);

            // 插值结束，强制设置最终位置
            if (this.camera_switch_count === 0) {
                this.cameraControls.target.set(
                    this.camera_target.x,
                    this.camera_target.y,
                    this.camera_target.z
                );
                this.camera.position.set(
                    this.camera_eye.x,
                    this.camera_eye.y,
                    this.camera_eye.z
                );
            }
        }

        // ==================== 模块3：相机高级插值（模式2：曲线/四元数） ====================
        if (this.camera_switch_count2 > 0) {
            this.camera_switch_count2--;

            const target = this.begin_target2.clone();
            const eye = this.begin_eye2.clone();
            let progress = 1 - this.camera_switch_count2 / this.camera_switch_total2;
            const curve = -100;

            // 指数曲线缓动
            if (curve !== 0) {
                const exp = Math.exp(Math.abs(curve / 100));
                progress = curve < 0 ? 1 - Math.pow(1 - progress, exp) : Math.pow(progress, exp);
            }

            // 目标点插值
            target.lerp(this.camera_target2, progress);

            // 相机距离 + 旋转插值
            const dist = this.begin_length * (1 - progress) + this.end_length * progress;
            const quat = this.begin_quaterion.clone();
            quat.slerp(this.end_quaterion, progress);

            // 计算相机最终位置
            const dir = new THREE.Vector3(0, 0, 1);
            dir.applyQuaternion(quat);
            dir.multiplyScalar(-dist);

            eye.copy(target);
            eye.add(dir);

            // 应用相机
            this.cameraControls.target.copy(target);
            this.camera.position.copy(eye);
        }
        // 相机切换结束，触发回调
        else if (!this.bSwitchFinish) {
            this.bSwitchFinish = true;
            const callbacks = this.switch_camera_finish;
            if (callbacks.length > 0) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i](
                        this.cameraControls.target.x, this.cameraControls.target.y, this.cameraControls.target.z,
                        this.camera.position.x, this.camera.position.y, this.camera.position.z
                    );
                }
            }
        }

        // 最大帧间隔限制（防止卡顿跳变）
        if (delta > 0.1) delta = 0.1;

        // 帧移动回调
        for (let i = 0; i < this.frame_move_recall.length; i++) {
            this.frame_move_recall[i](delta);
        }

        // 更新时间
        this.last_time = now;

        // 动画系统更新
        this.animation.frame_move(delta);

        // 相机控制器更新
        this.cameraControls.update();

        // ==================== 渲染场景 ====================
        const renderStart = Date.now();

        // 优先使用自定义渲染方法，否则用默认render
        this.custom_render ? this.custom_render() : this.render()

        const renderEnd = Date.now();

        // ==================== 3D 物体绑定到屏幕 DOM ====================
        if (this.div_bind.length > 0) {
            const matWorldInv = new THREE.Matrix4();
            const matProjView = new THREE.Matrix4();

            matWorldInv.copy(this.camera.matrixWorldInverse);
            // matProjView.multiplyMatrices(this.camera.projectionMatrix, matWorldInv);
            matProjView.copy(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse);

            for (let i = 0; i < this.div_bind.length; i++) {
                const bind = this.div_bind[i];
                const pos = bind.position.clone();

                pos.applyMatrix4(matProjView);

                // 3D 坐标 → 2D 屏幕坐标
                pos.x = pos.x * this.WIDTH / 2 + this.WIDTH / 2;
                pos.y = this.HEIGHT / 2 - pos.y * this.HEIGHT / 2;

                // 设置 DOM 位置
                bind.div.style.position = "absolute";
                bind.div.style.left = Math.round(pos.x) + "px";
                bind.div.style.top = Math.round(pos.y) + "px";
            }
        }

        // 性能统计
        this.frame_count++;
        if (!this.render_cost) this.render_cost = 0;
        this.render_cost += renderEnd - renderStart;
    }

    // 核心功能：方法实现了稳定的帧率统计逻辑，每 2 秒计算一次平均帧率并触发回调，是 3D 应用中性能监控的基础方法。
    // 关键细节：
    // 时间单位转换（毫秒→秒）是帧率计算的核心，避免单位混淆导致帧率数值错误；
    // 「2 秒累计窗口」平衡了统计实时性和稳定性，是帧率统计的最佳实践；
    // 回调触发前先判断函数是否存在，避免调用不存在的方法导致报错。
    /**
     * 更新帧率统计（每2秒计算一次平均帧率）
     * 核心功能：基于帧时间戳计算实时帧率，达到2秒时触发帧率更新回调
     * @param {number} now - 当前帧的时间戳（毫秒）
     */
    update_frame_rate(now)
    {
        // 计算距离上一帧的时间间隔（秒）
        let delta = (now - this.last_frame_time) / 1000;

        // 累计时间 + 累计帧数
        this.total_time += delta;
        this.frame_total_count++;

        // 更新最后一帧时间
        this.last_frame_time = now;

        // 每满 2 秒，计算一次平均帧率
        if (this.total_time >= 2) {
            // 平均帧率 = 1 / 平均每帧耗时
            this.frame_rate = 1 / (this.total_time / this.frame_total_count);

            // 重置计时器
            this.total_time = 0;
            this.frame_total_count = 0;

            // 如果有回调，通知外部帧率更新
            if (this.on_update_frame_rate) {
                this.on_update_frame_rate(this.frame_rate);
            }
        }
    }

    // 核心功能：该方法是 Three.js 场景渲染的入口，支持两种渲染模式 —— 普通渲染（直接渲染场景）和后处理渲染（含辉光效果的分层渲染）。
    // 关键特性：
    // 优先级：bDefaultRender 标记可强制使用普通渲染，忽略后处理
    // 辉光渲染：通过相机图层切换，仅渲染指定层的对象为辉光效果
    // 分层渲染：先渲染辉光通道，再渲染最终后处理通道，保证效果叠加
    // 依赖说明：需确保 this.postEffect（后处理配置）、this.bloomComposer/this.finalComposer（后处理通道）、this.renderer/this.scene/this.camera 已提前初始化
    render()
    {
        // 如果没有后处理，或者后处理设置为默认渲染 → 直接正常渲染
        if (this.postEffect == null || this.postEffect.bDefaultRender) {
            this.renderer.render(this.scene, this.camera);
        }
        // 否则使用后处理（泛光 + 最终合成）
        else {
            // 如果开启了 glow 泛光效果
            if (this.postEffect.glow && this.bloomComposer) {
                // 只渲染 layer=1 的物体（用于发光效果）
                this.camera.layers.set(1);
                this.bloomComposer.render();

                // 切回默认层渲染正常物体
                this.camera.layers.set(0);
            }
            // 最终合成渲染
            this.finalComposer.render();
        }
    }

    animate_skeleton = () => {

        requestAnimationFrame(this.animate_skeleton);

        // 获取两帧之间的时间差
        const deltaTime = this.clock.getDelta();

        // 遍历场景，更新所有带骨骼动画的模型
        this.scene.traverse(node => {
            if (node.mixer) {
                node.mixer.update(deltaTime);
            }
        });
    }

    /**
     * 【场景总入口】加载 O2 格式 3D 场景（JSON配置）
     * @param {string} url - 场景 JSON 文件地址
     * @returns {Promise} 加载完成/失败回调
     */
    // 核心功能：该方法是从普通 JSON 文件加载 Three.js 3D 场景的核心入口，支持两种场景格式（save_project 类型和普通 O2 格式），完成场景重置、JSON 加载、对象 / 模型加载、动画绑定等全流程。
    async load_o2_scene(url)
    {
        // ====================== 1. 初始化场景状态 ======================

        this.reset_scene();             // 重置场景清空旧内容
        this.grid.visible = false;      // 隐藏辅助网格
        this.from_zip = false;          // 标记：不从压缩包加载

        // 自动提取项目基础路径（用于加载相对路径模型/贴图）
        // this.project_url = url.substring(0, url.lastIndexOf("/") + 1);
        this.project_url = './'

        // ====================== 2. 加载场景 JSON 配置 ======================
        // 用现代 fetch 加载场景文件
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`场景加载失败，HTTP 状态：${response.status}`);
        }
        // 解析 JSON 数据
        const sceneData = await response.json();

        // ====================== 3. 根据配置类型加载场景 ======================
        if (sceneData.type === "save_project") {
            // ============== 情况 A：完整项目格式（含场景、对象、动画、后处理） ==============
            // 加载通用场景配置（环境、背景、LUT、曝光、 cubemap 等）
            this.load_common_scene(sceneData, false);

            // 批量加载所有子对象
            const loadTasks = sceneData.children.map(async (child) => {
                // 加载保存的对象
                const modelObject = await this.load_saved_object(child, false);
                if (modelObject) {
                    // 复制保存的参数（位置、旋转、缩放、材质等）
                    this.copy_saved_param(modelObject, child);
                    // 添加到场景
                    this.scene.add(modelObject);
                }
            });

            // 等待所有模型加载完成
            await Promise.all(loadTasks);
        }
        else {
            // ============== 情况 B：简易模型格式（环境 + 模型列表） ==============
            // 创建环境贴图作为场景背景
            this.scene.background = this.create_envMap(sceneData.evn.cube, false);
            // 设置默认全局环境贴图
            this.cubemap = this.scene.background;

            // 批量加载模型文件
            const loadTasks = sceneData.models.map((modelCfg) => {
                const modelUrl = this.project_url + modelCfg.mesh;
                return this.load_mesh_url(modelUrl, modelCfg);
            });

            // 保存模型层级树结构
            this.tree = sceneData.tree;
            // 等待所有模型加载完成
            await Promise.all(loadTasks);
        }

        // ====================== 4. 统一后续初始化 ======================
        // 绑定动画到模型
        this.animation.bind_objects();
        // 加载后统一处理（阴影、材质、光照等）
        this.process_after_load();
        // 执行场景初始化脚本（安全调用，不存在则忽略）
        this.script.init?.();
    }

    /**
     * 加载保存的场景对象（模型/骨骼/灯光/组/线条/精灵/反射器）
     * @param {Object} opts 对象配置数据
     * @param {Boolean} useLocalFiles 是否使用本地缓存文件（all_files）
     * @param {Object} zipFile 外部压缩包资源
     * @returns {Promise<Object3D>}
     */
    // 核心功能：该方法是 Three.js 项目的通用 3D 对象加载入口，支持 Mesh、Light、Sprite、骨骼动画、反射面等 10 + 种 3D 对象类型，核心逻辑为「类型判断 → 资源加载 → 对象创建 → 属性配置 → Promise 返回」
    async load_saved_object(opts, useLocalFiles, zipFile)
    {
        // 骨骼动画模型
        // ==============================
        if (opts.encode_type === 'Skeleton2.0') {
            try {
                const model = await this.load_saved_skeleton(opts.url2, zipFile);
                if (!model) return null;

                if (opts.mtls) {
                    this.apply_skeleton_mtl(model, '0', opts.mtls, useLocalFiles, zipFile);
                }
                if (opts.objects) {
                    this.apply_skeleton_objects(model, '0', opts.objects);
                }

                if (opts.clips?.length > 0) {
                    let remaining = 0;
                    for (const clip of opts.clips) {
                        if (clip.version !== 2) continue;
                        remaining++;

                        const animData = await this.load_animation_clip(clip.url, zipFile);
                        const clipAnim = animData.animations[0];
                        clipAnim.name = clip.name;
                        model.animations.push(clipAnim);
                        model.clips.push(clip);
                        remaining--;

                        if (remaining <= 0) {
                            this.play_skeleton_clip(model, opts.clip_name, true);
                            return model;
                        }
                    }
                }

                return model;
            }
            catch (e) {
                return null;
            }
        }

        // ==============================
        // Mesh 模型（严格原版逻辑）
        // ==============================
        if (opts.type === 'Mesh') {
            let geometry

            // 1. zipFile
            if (zipFile) {
                geometry = this._makeMesh(opts.common_mesh);
                if (!geometry) {
                    const buffer = zipFile.all_files[opts.meshid];
                    geometry = this.load_mesh2(buffer);
                }

                if (geometry) {
                    this.meshes[opts.meshid] = geometry;
                    const mesh = this.load_mesh_data(geometry, opts, useLocalFiles, zipFile);
                    this._processUV2(geometry, mesh, opts.xy);
                    return mesh;
                }
                throw new Error('create geometry fail!');
            }

            // 2. useLocalFiles
            if (useLocalFiles) {
                geometry = this._makeMesh(opts.common_mesh);
                if (!geometry) {
                    const buffer = this.all_files[opts.meshid];
                    geometry = this.load_mesh2(buffer);
                }

                if (geometry) {
                    this.meshes[opts.meshid] = geometry;
                    const mesh = this.load_mesh_data(geometry, opts, useLocalFiles, zipFile);
                    this._processUV2(geometry, mesh, opts.xy);
                    return mesh;
                }
                throw new Error('create geometry fail!');
            }

            // 3. 内置几何体
            if (opts.common_mesh) {
                geometry = this._makeMesh(opts.common_mesh);
                if (geometry) {
                    const mesh = this.load_mesh_data(geometry, opts, useLocalFiles, zipFile);
                    this._processUV2(geometry, mesh, opts.xy);
                    return mesh;
                }
                throw new Error('create geo fail!');
            }

            // 4. 网络加载 → 使用 fetch
            const url = this.project_url + opts.meshid;
            const buffer = await this._fetchArrayBuffer(url);
            geometry = this.load_mesh2(buffer);

            if (!geometry) throw new Error('create geo fail!');
            const mesh = this.load_mesh_data(geometry, opts, useLocalFiles, zipFile);
            this._processUV2(geometry, mesh, opts.xy);
            return mesh;
        }

        // 线条 → fetch 替换 XHR
        // ==============================
        if (opts.type === 'LineSegments') {
            let buffer;
            if (zipFile) {
                buffer = zipFile.all_files[opts.file];
            }
            else if (useLocalFiles) {
                buffer = this.all_files[opts.file];
            }
            else {
                const url = this.project_url + opts.file;
                buffer = await this._fetchArrayBuffer(url);
            }

            if (!buffer) return null;
            const line = this.load_mesh_line(buffer);
            if (!line) return null;

            line.name = opts.name;
            line.file = opts.file;
            line.applyMatrix4(opts.wts);
            line.material.color.setHex(opts.material.color);
            return line;
        }

        // Object3D
        // ==============================
        if (opts.type === 'Object3D') {
            const group = new THREE.Object3D();
            group.matrixWorldNeedsUpdate = true;
            group.name = opts.name;
            group.uuid = opts.uuid;
            group.applyMatrix4(opts.wts);
            group.visible = opts.visible;

            if (opts.children?.length > 0) {
                for (const child of opts.children) {
                    const obj = await this.load_saved_object(child, useLocalFiles, zipFile);
                    if (obj) {
                        this.copy_saved_param(obj, child);
                        if (child.lib_uuid) obj.lib_uuid = child.lib_uuid;
                        group.add(obj);
                    }
                }
            }

            return group;
        }

        // Sprite
        // ==============================
        if (opts.type === 'Sprite') {
            const mat = opts.material;

            let texture = null;
            // 创建纹理并处理 GIF 动画

            if (mat.map) {
                texture = this.create_map_with_default(mat.map, zipFile);

                if (texture) {
                    texture.offset.set(mat.map.offset.x, mat.map.offset.y);
                    texture.repeat.set(mat.map.repeat.x, mat.map.repeat.y);
                    texture.rotation = mat.map.rotation;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    // GIF 动画配置
                    if (mat.map.gifani && !texture.gifani) {
                        const gifAnim = { count: 0 };
                        gifAnim.frame = mat.map.gifani.frame;
                        gifAnim.begin = mat.map.gifani.begin;
                        gifAnim.current_frame = 0;
                        gifAnim.width = mat.map.gifani.width;
                        gifAnim.height = mat.map.gifani.height;
                        gifAnim.texture = texture;
                        texture.gifani = gifAnim;
                    }
                    if (texture.gifani) this.add_gifani(texture.gifani);
                }
            }

             texture ??= this.map_white;
            // 创建精灵对象
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: texture,
                color: "#69f"
            }));
            sprite.material.color.setHex(mat.color);
            if (mat.opacity) sprite.material.opacity = mat.opacity;
            sprite.material.uuid = mat.uuid;
            sprite.material.side = mat.side;
            sprite.material.o2id = mat.o2id;
            if (mat.alphaTest) sprite.material.alphaTest = mat.alphaTest;
            sprite.material.transparent = mat.transparent;
            sprite.material.depthWrite = mat.depthWrite;
            sprite.material.blending = mat.blending;
            sprite.material.depthTest = mat.depthTest;
            sprite.position.set(opts.position.x, opts.position.y, opts.position.z);
            sprite.scale.set(opts.scale.x, opts.scale.y, opts.scale.z);
            sprite.uuid = opts.uuid;
            sprite.name = opts.name;
            sprite.visible = opts.visible;

            return sprite;
        }

        // 环境光
        // ==============================
        if (opts.type === 'AmbientLight') {

            const light = new THREE.AmbientLight(opts.color, opts.intensity);

            // Object.assign(light, { name: opts.name, uuid: opts.uuid, visible: opts.visible })
            light.name = opts.name;
            light.uuid = opts.uuid;
            light.visible = opts.visible;

            // 调用 applyMatrix4() 会自动开启 matrixWorldNeedsUpdate，不需要手动写
            // light.matrixWorldNeedsUpdate = true;
            // 应用矩阵 矩阵变换对环境光无效，这里先去掉
            // const matrix = new THREE.Matrix4().fromArray(opts.wts.elements);
            // light.applyMatrix4(matrix)

            return light;
        }

        // ==============================
        // 骨骼动画组
        // ==============================
        if (opts.type === 'Group' && opts.bSkeleton) {
            let url = this.project_url + opts.url;
            if (zipFile) {
                url = URL.createObjectURL(new Blob([zipFile.all_files[opts.url]]));
            } else if (useLocalFiles) {
                url = URL.createObjectURL(new Blob([this.all_files[opts.url]]));
            }

            const model = await this.load_skeleton_animate(url, opts.name);
            if (!model) return null;

            model.clips = opts.clips;
            model.bSkeleton = true;
            model.url = opts.url;
            model.clip_name = opts.clip_name;
            model.matrixWorldNeedsUpdate = true;
            model.name = opts.name;
            model.uuid = opts.uuid;
            model.applyMatrix4(opts.wts);
            model.visible = opts.visible;

            model.traverse(child => {
                if (child.material?.type === 'MeshPhongMaterial') {
                    child.material.color.setRGB(1, 1, 1);
                    child.material.lightMap = this.map_white;
                }
            });

            if (opts.mtls) {
                this.apply_skeleton_mtl(model, '0', opts.mtls, useLocalFiles, zipFile);
            }

            if (model.clips?.length) {
                for (const clip of model.clips) {
                    let clipUrl = this.project_url + clip.url;
                    if (zipFile) {
                        clipUrl = URL.createObjectURL(new Blob([zipFile.all_files[clip.url]]));
                    }
                    await this.load_skeleton_clip(clipUrl, model, clip.name);
                }
                this.play_skeleton_clip(model, model.clip_name, true);
            }

            return model;
        }

        // 平行光
        // ==============================
        if (opts.type === 'DirectionalLight') {
            const light = new THREE.DirectionalLight(opts.color, 0.5);
            light.intensity = opts.intensity;
            light.matrixWorldNeedsUpdate = true;
            light.name = opts.name;
            light.uuid = opts.uuid;
            light.applyMatrix4(opts.wts);
            light.visible = opts.visible;
            light.castShadow = true;
            light.shadow.camera.near = 100;
            light.shadow.camera.far = 1e6;
            light.shadow.camera.right = 2e5;
            light.shadow.camera.left = -2e5;
            light.shadow.camera.top = 2e5;
            light.shadow.camera.bottom = -2e5;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            return light;
        }

        // 点光源
        // ==============================
        if (opts.type === 'PointLight') {
            const light = new THREE.PointLight(opts.color, 1, 1000);
            light.intensity = opts.intensity;
            light.matrixWorldNeedsUpdate = true;
            light.name = opts.name;
            light.uuid = opts.uuid;
            light.applyMatrix4(opts.wts);
            light.decay = opts.decay;
            light.distance = opts.distance;
            light.visible = opts.visible;
            light.castShadow = true;
            light.shadow.camera.near = 100;
            light.shadow.camera.far = 6e4;
            light.shadow.bias = 1e-4;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            return light;
        }

        // 聚光灯
        // ==============================
        if (opts.type === 'SpotLight') {
            const light = new THREE.SpotLight(opts.color);
            light.intensity = opts.intensity;
            light.matrixWorldNeedsUpdate = true;
            light.name = opts.name;
            light.uuid = opts.uuid;
            light.applyMatrix4(opts.wts);
            light.decay = opts.decay;
            light.penumbra = opts.penumbra;
            light.distance = opts.distance;
            light.angle = opts.angle;
            light.visible = opts.visible;
            light.castShadow = opts.castShadow;
            if (light.castShadow) {
                light.shadow.camera.near = 100;
                light.shadow.camera.far = 6e4;
                light.shadow.bias = 1e-4;
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
            }
            light.target_uuid = opts.target_uuid;
            return light;
        }

        // 反射器 这里没用到先去掉
        // ==============================
        // if (data.type === 'Reflector') {}

        return null;
    }

    // ------------------------------
    // 工具方法
    // ------------------------------
    _makeMesh(type)
    {
        switch (type) {
            case 'MeshBox': return new THREE.BoxGeometry(1000, 1000, 1000, 1, 1, 1);
            case 'MeshPlane': return new THREE.PlaneGeometry(1000, 1000, 1, 1);
            case 'MeshSphere': return new THREE.SphereGeometry(1000, 24, 24);
            default: return null;
        }
    }

    _processUV2(geometry, mesh, xyInfo) {
        if (!xyInfo || !geometry.attributes.uv2) return;
        mesh.xy = xyInfo;
        const step = this.scene.bake_step;
        const arr = geometry.attributes.uv2.array;

        for (let i = 0; i < arr.length / 2; i++) {
            arr[2 * i] = step * xyInfo.ix + step * arr[2 * i];
            arr[2 * i + 1] = 1 - (step * xyInfo.iy + step * (1 - arr[2 * i + 1]));
        }
        geometry.attributes.uv2.needsUpdate = true;
    }

    // fetch 封装，完全替换 XMLHttpRequest
    async _fetchArrayBuffer(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return await res.arrayBuffer();
    }

    // 这段代码的核心功能是加载自定义二进制格式的动画文件，解析其中的关键帧数据，最终转换为 Three.js 的 AnimationClip 对象。
    // 数据解析规则是：前 12 字节为头部信息 → 浮点数组存储关键帧数值 → JSON 文本存储动画元信息。
    // 代码做了缓存优化（优先使用本地 Blob 数据），并处理了 404 等请求异常情况
    /**
     * 加载并解析自定义格式的动画剪辑文件
     * @param {string} fileKey - 动画剪辑文件名
     * @param {Object} cacheData - 缓存数据对象 (包含 all_files 属性)
     * @returns {Promise<THREE.AnimationClip>} - 返回解析后的 AnimationClip 对象
     */
    async load_animation_clip(fileKey, cacheData)
    {
        // 构建加载地址（缓存优先）
        let url = this.project_url + fileKey;

        // 如果有缓存数据，使用Blob创建本地URL
        if (cacheData) {
            const buffer = cacheData.all_files[fileKey];
            const blob = new Blob([buffer]);
            url = URL.createObjectURL(blob);
        }

        // fetch 获取二进制数据
        const response = await fetch(url);
        if (!response.ok) throw new Error(`加载动画失败: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // 解析二进制头部
        const header = new Uint32Array(arrayBuffer, 0, 3);
        const floatLength = header[1] / 4;
        const floatData = new Float32Array(arrayBuffer, 12, floatLength);
        const jsonBytes = new Int8Array(arrayBuffer, 12 + header[1]);

        // 解析动画JSON
        const jsonString = new TextDecoder().decode(jsonBytes);
        const data = JSON.parse(jsonString);

        // 填充动画轨道数据
        data.animations.forEach(anim => {
            anim.tracks.forEach(track => {
                track.times = [];
                track.values = [];

                // 填充时间轴
                for (let i = 0; i < track.size; i++) {
                    track.times.push(floatData[track.pos + i]);
                }

                // 填充数值（四元数 / 向量3）
                const valueSize = track.type === 'quaternion' ? 4 : 3;
                const start = track.pos + track.size;
                for (let i = 0; i < valueSize * track.size; i++) {
                    track.values.push(floatData[start + i]);
                }
            });
        });

        // THREE 加载器解析动画
        return new Promise(resolve => {
            const loader = new THREE.ObjectLoader();
            loader.parse(data, resolve);
        });
    }

    // 这段代码的核心作用是异步加载骨骼数据（缓存 / 远程），初始化动画混合器并返回骨骼对象；
    // 关键依赖 THREE.AnimationMixer 是 Three.js 骨骼动画的核心类，用于控制动画的播放、暂停、混合等；
    // 核心逻辑分缓存加载和远程加载，最终都通过 _load_skeleton_from_buffer 解析二进制骨骼数据
    // 加载已保存的骨骼数据（异步方法，返回 Promise）
    async load_saved_skeleton(fileKey, cachedData)
    {
        // 骨骼加载完成后初始化动画混合器及相关属性
        function onSkeletonLoaded(skeletonObject) {
            skeletonObject.mixer = new THREE.AnimationMixer(skeletonObject);
            skeletonObject.clips = [];
            skeletonObject.bNewSkeleton = true;
            skeletonObject.url2 = fileKey;
            return skeletonObject;
        }

        // 优先从缓存中加载骨骼数据
        if (cachedData) {
            const bufferData = cachedData.all_files[fileKey];
            return new Promise(resolve => {
                this._load_skeleton_from_buffer(bufferData, skeleton => {
                    resolve(onSkeletonLoaded(skeleton));
                });
            });
        }

        // 无缓存时使用fetch请求骨骼文件
        const requestUrl = this.project_url + fileKey;
        const response = await fetch(requestUrl);

        if (!response.ok) throw new Error('骨骼文件加载失败');

        const arrayBuffer = await response.arrayBuffer();

        return new Promise(resolve => {
            this._load_skeleton_from_buffer(arrayBuffer, skeleton => {
                resolve(onSkeletonLoaded(skeleton));
            });
        });
    }

    /**
     * 从二进制缓冲区加载骨架（骨骼动画）数据
     * 核心功能：解析二进制缓冲区中的几何、骨架数据，构建Three.js骨架模型
     * @param {ArrayBuffer} buffer - 包含骨架/几何数据的二进制缓冲区
     * @param {Function} callback - 加载完成后的回调函数（参数：构建好的Three.js对象）
     * @private // 下划线开头表示私有方法，仅内部调用
     */
    // 核心功能：_load_skeleton_from_buffer 是私有方法，实现了从自定义二进制缓冲区解析骨架（骨骼动画）数据的完整逻辑，包括二进制解码、属性解析、骨架构建，是 3D 骨骼动画加载的核心方法。
    _load_skeleton_from_buffer(buffer, callback)
    {
        // ===================== 1. 解析缓冲区头部数据（元信息） =====================
        // 读取前3个Uint32值：缓冲区元信息（格式：[版本/标识, 浮点数据长度, 整数数据长度]）
        const header = new Uint32Array(buffer, 0, 3);
        const floatLength = header[1] / 4;
        const uintLength = header[2] / 4;

        // 从二进制缓冲区提取数据数组
        // 解析浮点数据块（几何/骨架的数值数据：坐标、矩阵等）
        const floatData = new Float32Array(buffer, 12, floatLength);
        // 解析整数数据块（索引、位置偏移等）
        const uintData = new Uint32Array(buffer, 12 + header[1], uintLength);
        // 解析字符串数据块（JSON配置）
        const jsonBytes = new Int8Array(buffer, 12 + header[1] + header[2]);

        // 解码并解析JSON配置数据
        const jsonString = new TextDecoder().decode(jsonBytes);
        const data = JSON.parse(jsonString);

        // ===================== 2. 辅助函数：解析属性数据到数组 =====================
        // 填充属性数据到几何体
        /**
         * 解析单个属性的数据到数组（适配不同数据类型）
         * @param {Object} attr - 属性配置（data_size: 长度, type: 数据类型, data_pos: 起始位置）
         * @param {Float32Array} floatArr - 浮点数据数组
         * @param {Uint32Array} uintArr - 整数数据数组
         */
        function fillAttributeData(attr, floatArr, uintArr) {
            attr.array = []; // 存储解析后的属性值
            const size = attr.data_size; // 数据长度
            if (attr.type === 'Float32Array') {
                for (let i = 0; i < size; i++) {
                    attr.array.push(floatArr[attr.data_pos + i]);
                }
            }
            else if (attr.type === 'Uint16Array' || attr.type === 'Uint32Array') {
                for (let i = 0; i < size; i++) {
                    attr.array.push(uintArr[attr.data_pos + i]);
                }
            }
        }

        // ===================== 3. 解析几何数据（含变形动画） =====================
        // 处理几何体数据
        if (data.geometries) {
            for (const geom of data.geometries) {
                // 填充顶点属性
                for (const key in geom.data.attributes) {
                    fillAttributeData(geom.data.attributes[key], floatData, uintData);
                }
                // 填充变形目标属性
                if (geom.data.morphAttributes?.position) {
                    for (const morph of geom.data.morphAttributes.position) {
                        fillAttributeData(morph, floatData, uintData);
                    }
                }
            }
        }

        // ===================== 4. 解析骨架数据（骨骼逆矩阵） =====================
        // 处理骨骼逆矩阵数据
        if (data.skeletons) {
            for (const skeleton of data.skeletons) {
                skeleton.boneInverses = [];
                const boneCount = skeleton.bones.length;
                let pos = skeleton.data_pos;

                for (let i = 0; i < boneCount; i++) {
                    const matrix = [];
                    for (let j = 0; j < 16; j++) {
                        matrix.push(floatData[pos++]);
                    }
                    skeleton.boneInverses.push(matrix);
                }
            }
        }

        // ===================== 5. 构建Three.js骨架模型 =====================
        // THREE.js 解析器加载模型
        const loader = new THREE.ObjectLoader();
        // 解析JSON配置，构建Three.js对象
        loader.parse(data, (model) => {
            // 遍历模型重置UUID并替换材质
            model.traverse((child) => {
                child.uuid = this.gen_uuid();
                // 若子对象有材质，标记为骨架模型并创建默认材质
                if (child.material) {
                    model.bSkeleton = true;
                    child.material = new THREE.MeshStandardMaterial();
                }
            });
            // 回调返回加载完成的模型
            callback(model);
        });
    }

    /**
     * 加载场景通用配置
     * 环境贴图、后处理、LUT调色、曝光、背景色、天空盒、动画、展览模式
     * @param {Object} opts 场景配置 JSON
     * @param {Boolean} useLocalCache 是否本地缓存
     * @param {Object} zipFile 文件资源实例（all_files）
     */
    load_common_scene(opts, useLocalCache= true, zipFile= null)
    {
        // 1. 加载场景中的所有环境贴图（Cubemap）
        // ==============================================
        if (opts.scene.cubemaps) {
            console.log("cubemaps");

            opts.scene.cubemaps.forEach(cube => {
                const cubeMap = {
                    name: cube.name,
                    type: cube.type
                };

                if (cube.url) {
                    cubeMap.texture = this.create_envMap(cube.url, useLocalCache, zipFile);
                    if (cubeMap.texture) {
                        cubeMap.texture.cube_info = cube;
                    }
                }

                this.cubemaps.push(cubeMap);
            });
        }

        // 2. 加载后处理效果（PostEffect）+ LUT 调色
        // ==============================================
        if (opts.scene.postEffect) {
            this.postEffect = opts.scene.postEffect;
            this.postEffect.from_zip = useLocalCache;

            // 如果有外部文件实例，并且配置了 LUT 文件
            if (zipFile && this.postEffect.lutFile) {
                // 尝试读取指定的 LUT 文件
                this.postEffect.lutBlobFile = zipFile.all_files[this.postEffect.lutFile];

                // 没找到指定文件 → 自动找包含 CUBE 的文件
                if (!this.postEffect.lutBlobFile) {
                    const allKeys = Object.keys(zipFile.all_files);
                    const cubeFile = allKeys.find(key => key.includes("CUBE"));

                    if (cubeFile) {
                        this.postEffect.lutBlobFile = zipFile.all_files[cubeFile];
                    } else {
                        this.postEffect.lut = false;
                    }
                }

                // 生成 Blob URL 给后处理使用
                this.postEffect.lutBlob = new Blob([this.postEffect.lutBlobFile]);
                this.postEffect.lutFile = URL.createObjectURL(this.postEffect.lutBlob);
            }

            // 创建渲染通道
            this.create_render_pass();
        }

        // 3. 设置曝光度
        // ==============================================
        if (opts.scene.toneMappingExposure != null) {
            this.renderer.toneMappingExposure = opts.scene.toneMappingExposure;
        }

        // 4. 设置场景唯一 ID（没有则自动生成）
        // ==============================================
        this.scene.scene_id = opts.scene.scene_id;
        if (!this.scene.scene_id) {
            this.scene.scene_id = THREE.MathUtils.generateUUID();
        }

        // 5. 烘焙步数（默认 1）
        // ==============================================
        this.scene.bake_step = opts.scene.bake_step || 1;

        // 6. 场景背景设置（纯色 / 图片 / 天空盒）
        // ==============================================
        const bg = opts.scene.background;

        // 类型 0：纯色背景
        if (bg.type === 0) {
            if (!(this.scene.background instanceof THREE.Color)) {
                this.scene.background = new THREE.Color();
            }
            this.scene.background.setHex(bg.color);
        }
        // 类型 1：图片背景
        else if (bg.type === 1) {
            const texture = this.create_map(bg.map, zipFile);
            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                this.scene.background = texture;
            }
        }
        // 类型 2：环境贴图（天空盒）背景
        else if (bg.type === 2) {
            this.scene.background = this.create_envMap(bg.envMap, useLocalCache, zipFile);

            // 自动加入环境贴图列表
            if (this.scene.background && !this.scene.background.cube_info) {
                this.cubemaps.push({
                    name: "天空盒",
                    type: "正常",
                    texture: this.scene.background
                });
            }

            this.cubemap = this.scene.background;
        }

        // 7. 加载场景动画
        // ==============================================
        this.animation.from_json(opts.scene.animation);

        // 8. 展览模式（聚焦展示某些物体）
        // ==============================================
        if (opts.scene.exhibition) {
            this.exhibition = {
                objects_ids: opts.scene.exhibition.objects
            };
        }
    }

    // 这段代码的核心功能是从自定义二进制格式解析网格数据，并构建 Three.js 的 BufferGeometry 对象，包含位置、法线、UV1、UV2 和索引信息。
    // 数据解析逻辑是：先读元数据→再读缩放参数→解析原始 Uint16 数据→通过「基准值 + 缩放系数」计算最终属性值→构建几何体并修正 UV。
    // 关键细节：所有原始属性数据都是 Uint16 类型，通过线性缩放转换为 Float32 类型的 3D 坐标 / UV 坐标，最后翻转了 UV 的 V 轴方向
    /**
     * 从二进制 ArrayBuffer 加载并构建 Mesh 的 BufferGeometry
     * @param {ArrayBuffer} buffer - 包含网格数据的二进制缓冲区
     * @returns {THREE.BufferGeometry} 构建好的几何体对象
     */
    load_mesh2(buffer)
    {
        // 二进制头解析
        const header = new Uint32Array(buffer, 0, 5);
        const [indexCount, vertexCount, normalCount, uv1Count, uv2Count] = header;

        // 浮点范围参数（位置、法线、UV1、UV2） 读取顶点范围参数（用于计算真实坐标）
        const params = new Float32Array(buffer, 20, 20);

        // 工具函数：解压缩 16 位整型数据 → 浮点坐标
        const unpack = (src, min, scale, dim, dest) => {
            src.forEach((val, i) => {
                dest[i] = min[i % dim] + val * scale[i % dim];
            });
        };

        // 位置坐标范围计算
        // -----------------------
        const posMin    = [params[0], params[1], params[2]];
        const posMax    = [params[3], params[4], params[5]];
        const posScale  = posMax.map((v, i) => (v - posMin[i]) / 65535);
        const positions = new Float32Array(3 * vertexCount);
        const posData   = new Uint16Array(buffer, 100, 3 * vertexCount);
        unpack(posData, posMin, posScale, 3, positions);

        // -----------------------
        // 法线
        // -----------------------
        const normals   = new Float32Array(3 * vertexCount);
        if (normalCount > 0) {
            const nMin   = [params[6], params[7], params[8]];
            const nMax   = [params[9], params[10], params[11]];
            const nScale = nMax.map((v, i) => (v - nMin[i]) / 65535);
            const nData  = new Uint16Array(buffer, 100 + 6 * vertexCount, 3 * normalCount);
            unpack(nData, nMin, nScale, 3, normals);
        }

        // -----------------------
        // UV1
        // -----------------------
        const uvs       = new Float32Array(2 * vertexCount);
        if (uv1Count > 0) {
            const uvMin  = [params[12], params[13]];
            const uvMax  = [params[14], params[15]];
            const uvScale = uvMax.map((v, i) => (v - uvMin[i]) / 65535);
            const uvData = new Uint16Array(buffer, 100 + 12 * vertexCount, 2 * uv1Count);
            unpack(uvData, uvMin, uvScale, 2, uvs);
        }

        // -----------------------
        // UV2
        // -----------------------
        const uvs2      = new Float32Array(2 * vertexCount);
        if (uv2Count > 0) {
            const uv2Min = [params[16], params[17]];
            const uv2Max = [params[18], params[19]];
            const uv2Scale = uv2Max.map((v, i) => (v - uv2Min[i]) / 65535);
            const uv2Data = new Uint16Array(buffer, 100 + 12 * vertexCount + 4 * uv1Count, 2 * uv2Count);
            unpack(uv2Data, uv2Min, uv2Scale, 2, uvs2);
        }

        // -----------------------
        // 索引
        // -----------------------
        const indexOffset = 100 + 12 * vertexCount + 4 * uv1Count + 4 * uv2Count;
        const indices = new Uint16Array(buffer, indexOffset, 3 * indexCount);

        // -----------------------
        // 创建几何体
        // -----------------------
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        normals.length  && geom.setAttribute('normal',  new THREE.BufferAttribute(normals, 3));
        uvs.length      && geom.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
        uvs2.length     && geom.setAttribute('uv2',      new THREE.BufferAttribute(uvs2, 2));
        geom.setIndex(new THREE.BufferAttribute(indices, 1, true));
        geom.computeBoundingBox();

        // UV 翻转修正
        const uvArray = geom.attributes.uv.array;
        uvArray.forEach((_, i) => (i + 1) % 2 === 0 && (uvArray[i] += 1));

        return geom;
    }

    // 该函数支持两种二进制格式解析线数据：格式 1 直接读取 Float32 顶点，格式 2 通过 Uint16 原始值 + 缩放参数计算顶点。
    // 核心流程：解析二进制头部→根据魔术数字选择解析逻辑→构建 BufferGeometry→创建 LineBasicMaterial（黑色）→生成 Line 对象并返回。
    // 格式 2 的坐标计算逻辑与 load_mesh2 一致，都是将 Uint16 原始值通过「基准值 + 缩放系数」转换为 3D 坐标，是该项目统一的坐标压缩存储方案
    /**
     * 从二进制 ArrayBuffer 加载并构建 Three.js 线(Line)对象
     * @param {ArrayBuffer} buffer - 包含线数据的二进制缓冲区
     * @returns {THREE.Line} 构建好的线对象
     */
    load_mesh_line(buffer)
    {
        // 第一种数据格式：直接存储 Float32 类型的顶点位置
        {
            // 读取前 12 字节的头部数据（3 个 Uint32 数值）
            const header = new Uint32Array(buffer, 0, 3);
            const magicNumber = header[0]; // 魔术数字，用于判断数据格式
            const floatByteLength = header[1]; // 顶点数据的总字节数
            const vertexCount = floatByteLength / 4; // Float32 每个占 4 字节，计算顶点元素数量

            // 如果魔术数字匹配（1000003），使用第一种格式解析
            if (magicNumber === 1000003) {
                // 从 12 字节偏移处读取 Float32 顶点数据
                const positions = new Float32Array(buffer, 12, vertexCount);

                // 创建 BufferGeometry 并设置位置属性
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.computeBoundingBox();

                // 创建线材质（黑色）和线对象
                const material = new THREE.LineBasicMaterial({ color: 0x000000 });

                return new THREE.Line(geometry, material);
            }
        }

        // 第二种数据格式：存储 Uint16 原始值 + 缩放参数，需要计算最终顶点
        // 读取第一个 Uint32 数值（顶点元素总数）
        const header = new Uint32Array(buffer, 0, 1);
        const vertexElementCount = header[0]; // 3 * 顶点数量（x/y/z 各一个元素）

        // 读取 6 个 Float32 缩放参数（偏移 4 字节，共 24 字节）
        const scaleParams = new Float32Array(buffer, 4, 6);

        // 解析基准值（base）和范围值（range），计算缩放系数（scale）
        const positionBase = [scaleParams[0], scaleParams[1], scaleParams[2]]; // 基准值
        const positionRange = [scaleParams[3], scaleParams[4], scaleParams[5]]; // 范围最大值
        const positionScale = [
            (positionRange[0] - positionBase[0]) / 65535, // Uint16 最大值是 65535
            (positionRange[1] - positionBase[1]) / 65535,
            (positionRange[2] - positionBase[2]) / 65535
        ];

        // 初始化最终的 Float32 位置数组
        const positions = new Float32Array(vertexElementCount);
        // 读取 Uint16 原始数据（偏移 28 字节：4+24）
        const rawPositionData = new Uint16Array(buffer, 28, vertexElementCount);

        // 计算最终的顶点位置：基准值 + 原始值 * 缩放系数
        for (let i = 0; i < rawPositionData.length; i++) {
            const axis = i % 3; // 0=x, 1=y, 2=z
            positions[i] = positionBase[axis] + rawPositionData[i] * positionScale[axis];
        }

        // 创建 BufferGeometry 并设置位置属性
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeBoundingBox();

        // 创建黑色线材质和线对象
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });

        return new THREE.Line(geometry, material);
    }

    // 核心功能：该方法是 Three.js 中创建并配置网格对象的封装，核心步骤为「赋值 ID → 加载材质 → 创建网格 → 配置属性 → 应用矩阵 → 返回对象」
    load_mesh_data(geometry, opts, useLocalFiles, zipFile)
    {
        // 1. 赋值网格ID
        geometry.meshid = opts.meshid;

        // 2. 加载 Phong 材质（参数 i/s 推测为材质相关的配置/回调）
        const phongMaterial = this.load_phong_mtl(opts.material, useLocalFiles, zipFile);

        // 3. 创建 Three.js 网格对象（ge["hb"] 对应 THREE.Mesh）
        const mesh = new THREE.Mesh(geometry, phongMaterial);

        // 4. 配置网格的阴影属性
        mesh.castShadow = opts.castShadow;
        mesh.receiveShadow = opts.receiveShadow;
        mesh.matrixWorldNeedsUpdate = true;
        mesh.name = opts.name;
        mesh.uuid = opts.uuid;
        mesh.visible = opts.visible;

        // 应用变换矩阵
        mesh.applyMatrix4(opts.wts);

        // 自定义扩展属性
        if (opts.common_mesh) {
            mesh.common_mesh = opts.common_mesh;
        }

        return mesh;
    }

    // 核心功能：定制化的 Phong 材质加载核心方法，整合了主纹理（含 GIF 动画）、多类细节贴图、环境立方体贴图的加载与配置，同时将材质注册到全局列表，支持后续管理。
    // 关键设计：
    // 纹理加载失败自动回退到默认值，保证材质必有值；
    // GIF 动画参数初始化并关联到 animate 循环，实现动态纹理；
    // 环境贴图多优先级匹配，保证反射效果；
    // 全局注册材质，便于统一管理。
    // 业务价值：一站式解决 Three.js Phong 材质的加载、配置、动画、管理问题，是 3D 场景材质系统的核心基石，适配从基础模型到高真实感材质（法线 / 高光 / 环境反射）的全场景需求。
    load_phong_mtl(materialOpts, useLocalFiles, zipFile)
    {
        const opts = materialOpts;
        let texture = this.map_white;

        // ==================== 模块1：主纹理加载（含GIF动画） ====================
        if (opts.map) {
            // 1. 创建/加载主纹理（带默认值）
            texture = this.create_map_with_default(opts.map, zipFile) || this.map_white;

            // 2. 配置纹理UV属性（偏移/重复/旋转/包裹模式）
            if (!opts.map.o2_default) {
                texture.offset.set(opts.map.offset.x, opts.map.offset.y);
                texture.repeat.set(opts.map.repeat.x, opts.map.repeat.y);
                texture.rotation = opts.map.rotation;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
            }

            // GIF 动画
            if (opts.map.gifani) {
                if (!texture.gifani) {
                    texture.gifani = {
                        count: 0,
                        frame: opts.map.gifani.frame,
                        begin: opts.map.gifani.begin,
                        current_frame: 0,
                        width: opts.map.gifani.width,
                        height: opts.map.gifani.height,
                        texture: texture
                    };
                }

                texture.gifani && this.add_gifani(texture.gifani);
            }
        }

        // ==================== 模块2：创建基础Phong材质 ====================
        const material = new THREE.MeshPhongMaterial({
            map: texture
        });

        // ==================== 模块3：基础材质属性配置 ====================
        // 1. 光照贴图
        opts.lightMap && (material.lightMap = this.create_map_with_default(opts.lightMap, zipFile));

        // 2. 通用属性（双面/透明/透明度/alpha测试/混合模式/高光强度等）
        material.side = opts.side;
        material.transparent = opts.transparent;

        opts.opacity != null && (material.opacity = opts.opacity);
        opts.alphaTest != null && (material.alphaTest = opts.alphaTest);
        opts.blending != null && (material.blending = opts.blending);
        opts.shininess != null && (material.shininess = opts.shininess);

        material.o2id = opts.o2id;

        opts.depthTest != null && (material.depthTest = opts.depthTest);
        opts.depthWrite != null && (material.depthWrite = opts.depthWrite);
        opts.color != null && material.color.setHex(opts.color);

        // ==================== 模块4：MeshPhongMaterial专属属性 ====================
        if (opts.type === "MeshPhongMaterial") {
            opts.combine != null && (material.combine = opts.combine);
            opts.reflectivity != null && (material.reflectivity = opts.reflectivity);
            opts.lightMapIntensity != null && (material.lightMapIntensity = opts.lightMapIntensity);
            opts.emissiveIntensity != null && (material.emissiveIntensity = opts.emissiveIntensity);
            opts.aoMapIntensity != null && (material.aoMapIntensity = opts.aoMapIntensity);
            opts.normalScale != null && (material.normalScale = opts.normalScale);

            // 贴图全部使用你要的风格
            opts.alphaMap && (material.alphaMap = this.create_map_with_default(opts.alphaMap, zipFile));
            opts.emissiveMap && (material.emissiveMap = this.create_map_with_default(opts.emissiveMap, zipFile));
            opts.normalMap && (material.normalMap = this.create_map_with_default(opts.normalMap, zipFile));
            opts.specularMap && (material.specularMap = this.create_map_with_default(opts.specularMap, zipFile));
            opts.aoMap && (material.aoMap = this.create_map_with_default(opts.aoMap, zipFile));

            material.specular.setHex(opts.specular);
            material.emissive.setHex(opts.emissive);

            opts.shininess != null && (material.shininess = opts.shininess);
            material.needsUpdate = true;
        }

        // ==================== 模块5：材质注册（全局管理） ====================
        this.materials.push({
            id: material.o2id,
            mtl: material
        });

        // ==================== 模块6：环境立方体贴图（EnvMap） ====================
        if (opts.cube_info) {
            let envMap = null;

            for (let i = 0; i < this.cubemaps.length; i++) {
                const cube = this.cubemaps[i];
                if (cube.name === opts.cube_info.name) {
                    envMap = cube.texture;
                    break;
                }
            }

            if (!envMap) {
                for (let i = 0; i < this.cubemaps.length; i++) {
                    const cube = this.cubemaps[i];
                    if (cube.type === opts.cube_info.type) {
                        envMap = cube.texture;
                        break;
                    }
                }
            }

            material.envMap = envMap;
        }

        // 兜底环境贴图
        if (!material.envMap) {
            material.envMap = this.create_envMap(opts.envMap, useLocalFiles, zipFile);
        }

        return material;
    }

    // 核心功能：该方法是 Three.js 中图片转纹理的通用工具方法，支持缓存、缩略图、副本同步、内存优化等特性，适配不同格式的图片和渲染需求。
    // 关键特性：
    // 缓存机制避免重复加载，提升性能
    // 支持缩略图加载，适配低精度渲染场景
    // 自动识别图片格式并设置纹理格式
    // 同步更新纹理副本，保证渲染一致性
    // 释放 Blob URL，优化内存使用
    // 依赖说明：需确保 this.unload_textures（缓存容器）、this.image_loader（Three.js ImageLoader 实例）已提前初始化
    /**
     * 加载图片并转换为Three.js纹理（带缓存、缩略图、副本同步功能）
     * @param {string} key - 纹理名称（作为缓存key）
     * @param {string} url - 图片URL（支持Blob URL/网络URL/DataURL）
     * @returns {THREE.Texture} 创建/缓存的纹理对象
     */
    load_image_to_texture(key, url)
    {
        // 先从缓存里取，如果已经加载过，直接返回缓存纹理
        let texture = this.unload_textures[key];
        if (texture) {
            return texture;
        }

        // 缓存中没有，新建一个空纹理立即返回（异步加载）
        texture = new THREE.Texture();
        this.unload_textures[key] = texture;

        // 异步加载
        this.textureLoader.load(url, (tex) => {

            // 低清压缩模式
            if (this.load_small_texture) {
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(tex.image.width / 8);
                canvas.height = Math.ceil(tex.image.height / 8);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tex.image, 0, 0, canvas.width, canvas.height);

                // 重新加载压缩图
                this.textureLoader.load(canvas.toDataURL('image/png'), (miniTex) => {
                    texture.copy(miniTex);
                    texture.raw_url = url;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.needsUpdate = true;

                    // 同步所有拷贝纹理
                    this._syncCopiedTextures(texture);
                });
            }
            // 正常高清模式
            else {
                texture.copy(tex);
                texture.raw_url = url;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;

                URL.revokeObjectURL(url);
                this._syncCopiedTextures(texture);
            }
        });

        // 立即返回空纹理（异步加载）
        return texture;
    }

    // 提取重复逻辑：同步所有 copied 纹理
    _syncCopiedTextures(originalTex)
    {
        if (!originalTex.copyed) return;

        originalTex.copyed.forEach(copyTex => {
            copyTex.copy(originalTex);
            copyTex.raw_url = originalTex.raw_url;
            copyTex.needsUpdate = true;
        });
    }

    // 核心功能：该方法是纹理创建的「安全兜底层」，通过三级优先级（默认纹理→指定纹理→白色纹理）保证返回的纹理永远不为 null，避免 Three.js 渲染时因纹理缺失报错。
    // 关键特性：
    // 优先使用配置中指定的默认纹理（最高优先级）
    // 无默认纹理时，调用 create_map 创建指定名称的纹理
    // 纹理创建失败时，兜底使用白色纹理 map_white
    // 保留未使用参数 t 保证兼容性
    // 依赖说明：需确保 this.default_textures（默认纹理缓存）、this.map_white（白色兜底纹理）、this.create_map（基础纹理创建方法）已提前初始化。
    /**
     * 创建纹理（带多层兜底逻辑）
     * @param {Object|null} textureOpts - 纹理配置对象
     * @param {Object} [zipFile] - ZIP包文件对象（传给create_map，用于从ZIP加载纹理）
     * @returns {THREE.Texture} 最终的纹理对象（优先默认纹理 → 指定纹理 → 白色兜底纹理）
     */
    create_map_with_default(textureOpts, zipFile)
    {
        // 如果有默认纹理配置，直接返回默认纹理
        if (textureOpts?.o2_default) {
            return this.default_textures[textureOpts.o2_default];
        }

        // 创建自定义纹理，找不到则使用白色默认纹理
        const texture = textureOpts ? this.create_map(textureOpts.name, zipFile) : null;
        return texture ?? this.map_white;
    }

    // 核心功能：该方法是 Three.js 纹理创建的基础入口，支持 ZIP 包、远程 URL、本地路径三种加载方式，是 create_map_with_default 的底层依赖方法。
    // 关键特性：
    // 自动识别远程 URL，无需拼接项目路径
    // 优先从 ZIP 包加载纹理，提升本地加载速度
    /**
     * 创建Three.js纹理（支持ZIP包、远程URL、本地路径加载）
     * @param {string|null} path - 纹理文件路径/名称（为空则返回null）
     * @param {Object} [zipFile=null] - ZIP包文件对象 {all_files: {...}}
     * @returns {THREE.Texture|null} 创建的纹理对象（失败返回null）
     */
    create_map(path, zipFile = null)
    {
        if (!path) return null;

        let isExternal = false;
        let url = this.project_url + path;
        const lowerPath = path.toLowerCase();

        // 判断是否为 http 外部图片
        if (lowerPath.startsWith('http')) {
            url = path;
            isExternal = true;
        }

        // 优先使用缓存文件
        let fileData = this.all_files[path];
        if (zipFile) fileData = zipFile.all_files[path];

        if (fileData && !isExternal) {
            const blob = new Blob([fileData], { type: 'image/jpeg' });
            const blobUrl = URL.createObjectURL(blob);
            return this.load_image_to_texture(path, blobUrl);
        }

        // 无缓存则直接加载图片
        const texture = this.load_image_to_texture(path, url);
        this.maps.map_url = texture;

        return texture;
    }

    /**
     * 创建/获取环境立方体贴图（天空盒/反射贴图）
     * @param {string} name 环境贴图名称
     * @param {boolean} useLocalCache 是否使用本地缓存
     * @param {object} zipFile 压缩包文件实例
     * @param {function} onLoad 加载完成回调
     * @returns {THREE.CubeTexture}
     */
    create_envMap(name, useLocalCache = true, zipFile= null , onLoad = void 0)
    {
        // 未指定名称 或 使用场景默认 → 返回全局 cubemap
        if (!name || name === 'use_scene') {
            return this.cubemap;
        }

        // 优先从缓存读取
        let envMap = this.envmaps[name];
        if (envMap) return envMap;

        // 6个面的固定路径（Three.js CubeMap 标准顺序：px,nx,py,ny,pz,nz）
        const cubeFiles = [
            `image/${name}/posx.jpg`, // 右
            `image/${name}/negx.jpg`, // 左
            `image/${name}/posy.jpg`, // 上
            `image/${name}/negy.jpg`, // 下
            `image/${name}/posz.jpg`, // 前
            `image/${name}/negz.jpg`  // 后
        ];

        const urls = [];

        // 1. 优先使用外部 zipFile 缓存
        // ==========================================
        if (zipFile) {
            for (let i = 0; i < 6; i++) {
                const path = cubeFiles[i];
                const blob = new Blob([zipFile.all_files[path]], { type: 'image/jpeg' });
                urls.push(URL.createObjectURL(blob));
            }
            envMap = new THREE.CubeTextureLoader().load(urls, onLoad);
        }
        // 2. 使用当前实例本地缓存
        // ==========================================
        else if (useLocalCache) {
            for (let i = 0; i < 6; i++) {
                const path = cubeFiles[i];
                const blob = new Blob([this.all_files[path]], { type: 'image/jpeg' });
                urls.push(URL.createObjectURL(blob));
            }
            envMap = new THREE.CubeTextureLoader().load(urls, onLoad);
        }
        // 3. 无缓存 → 直接网络加载
        // ==========================================
        else {
            const netUrls = cubeFiles.map(path => this.project_url + path);
            envMap = new THREE.CubeTextureLoader().load(netUrls, onLoad);
        }

        // 设置贴图属性并缓存
        envMap.cubename = name;
        envMap.format = THREE.RGBAFormat; // 对应原 ge["Ib"]
        this.envmaps[name] = envMap;

        // 兜底返回
        return envMap || this.cubemap;
    }

    /**
     * 创建渲染通道（后处理特效：辉光、边缘检测、FXAA、LUT调色、AO、轮廓光）
     */
    create_render_pass()
    {   // 实际运行时只执行了这二句，其他的没有执行，先删除了，如果以后用到在补
        // 关闭 LUT 时重置色调映射为无（0 对应 THREE.NoToneMapping）
        this.renderer.toneMapping = 0;
        this.update_all_mtl();
    }

    // 这段代码的核心作用是批量遍历 Three.js 场景所有对象，强制更新材质（设置 needsUpdate = true）；
    // 关键逻辑是递归遍历对象层级，兼容单 / 多材质场景，确保所有材质修改生效；
    // material.needsUpdate = true 是 Three.js 材质更新的核心标记，缺少这一步修改材质后页面不会有变化
    // 定义更新场景中所有材质的主方法
    update_all_mtl ()
    {
        // 遍历场景根节点的所有子对象
        this.scene.children.forEach(child => {
            this._update_all_mtl(child);
        });
    }

    /**
     * 递归更新3D对象及其所有子对象的材质（标记材质需要更新）
     * 核心作用：修改材质属性后，强制Three.js重新编译/渲染材质，使修改生效
     * @param {THREE.Object3D} obj3d - 要更新材质的目标3D对象（可为场景/模型/网格等）
     * @private // 下划线开头表示私有方法，仅内部调用
     */
    // 核心功能：_update_all_mtl 是私有递归方法，用于标记 3D 对象层级中所有材质为「需要更新」，确保材质属性修改后能实时生效，是 Three.js 材质管理的核心辅助方法。
    _update_all_mtl(obj3d)
    {
        // 存在对象 + 存在材质 → 标记需要更新
        if (obj3d && obj3d.material) {
            obj3d.material.needsUpdate = true;
        }

        // 2. 递归子对象 → 使用 forEach（更简洁）
        obj3d?.children?.forEach(child => {
            this._update_all_mtl(child);
        });
    }

    // 核心功能：递归批量应用材质的方法，为骨骼 / 蒙皮对象（及所有子对象）根据「键名 + 索引」匹配材质配置，创建 Phong 材质并统一设置反射率为 0。
    // 关键设计：子对象材质键名自动拼接索引（如 body → body_0），递归遍历保证所有嵌套对象都能应用对应材质，适配骨骼模型多部位的材质需求。
    // 业务价值：统一管理骨骼模型的材质配置，避免手动给每个子对象设置材质，提升开发效率和维护性。
    // 这是为骨骼 / 蒙皮模型（SkinnedMesh） 量身定制的材质批量应用方法，解决了「骨骼模型多部位需要不同材质」的问题：
    apply_skeleton_mtl(model, index, materials, skinInfo, option)
    {
        // 获取当前子对象对应的材质配置
        const config = materials[index];

        // 存在材质则加载并应用
        if (config) {
            const phongMaterial = this.load_phong_mtl(config, skinInfo, option);
            phongMaterial.reflectivity = 0;      // 统一设置反射率为0（避免材质反光）
            model.material = phongMaterial;      // 给当前骨骼对象应用新材质
        }

        // 递归处理所有子对象
        for (let i = 0; i < model.children.length; i++) {
            const childIndex = `${index}_${i}`;
            this.apply_skeleton_mtl(model.children[i], childIndex, materials, skinInfo, option);
        }
    }

    /**
     * 递归应用骨架对象数据到目标层级结构
     * @param {THREE.Object3D} model - 要应用数据的目标3D对象（父级/子级骨架对象）
     * @param {string} key - 当前对象在数据中的标识键名（用于从数据集合中匹配对应数据）
     * @param {Object} dataMap - 骨架数据映射集合（key: 对象标识, value: 保存的骨架数据）
     */
    // 核心功能：递归遍历 3D 对象的层级结构，根据「父键名 + 子索引」的命名规则匹配骨架数据，将数据应用到每个层级的对象上
    apply_skeleton_objects(model, key, dataMap)
    {
        // 获取当前节点对应的骨骼数据
        const skeletonData = dataMap[key];

        // 存在数据则应用
        if (skeletonData) {
            this.apply_saved_skdata(model, skeletonData);
        }

        // 递归处理所有子节点
        model.children.forEach((child, index) => {
            const childKey = `${key}_${index}`;
            this.apply_skeleton_objects(child, childKey, dataMap);
        });
    }

    // 该方法核心功能是按动画名称播放，支持 0.2 秒淡入淡出过渡，同时记录当前动画状态；
    // 相比按索引播放的基础版，按名称查找更灵活，适配多动画切换场景；
    // crossFadeTo 是实现流畅动画过渡的关键，需确保渲染循环中更新 mixer 才能生效
    play_skeleton_clip(model, clipName, loop)
    {
        // 查找对应名称的动画剪辑
        let targetClip = null;
        model.animations.forEach(clip => {
            if (clip.name === clipName) {
                targetClip = clip;
            }
        });

        if (!targetClip) return;

        // 存在动画混合器时执行播放
        if (model.mixer && targetClip) {
            const action = model.mixer.clipAction(targetClip, model);

            // 切换动画时平滑过渡
            if (model.curAction) {
                model.curAction.enabled = true;
                model.curAction.crossFadeTo(action, 0.2);
            }

            action.enabled = true;
            model.curAction = action;

            // 设置循环模式
            if (loop) {
                action.loop = THREE.LoopRepeat;
                model.clip_name = clipName;
            }
            else {
                action.loop = THREE.LoopOnce;
            }

            action.play();
        }
    }

    /**
     * 添加GIF动画对象到列表（避免重复添加相同纹理的动画）
     * @param {Object} gifAnim - 要添加的GIF动画对象（包含texture等核心属性）
     */
    // 核心功能：该方法用于向 GIF 动画列表中添加新动画对象，核心逻辑是通过纹理（texture）去重，避免重复添加相同纹理的 GIF 动画。
    // 添加 GIF 动画纹理到动画列表（避免重复添加）
    add_gifani(gifAnim)
    {
        // 遍历已有的动画列表，检查是否已经存在相同纹理的动画
        for (let i = 0; i < this.gif_anis.length; i++) {
            const item = this.gif_anis[i];
            // 如果纹理相同，说明已添加，直接返回不重复添加
            if (item.texture === gifAnim.texture) {
                return;
            }
        }
        // 不存在则推入动画列表
        this.gif_anis.push(gifAnim);



    }
    // 极简优化版
    add_gifani1(gifAnim) {
        if (!this.gif_anis.some(item => item.texture === gifAnim.texture)) {
            this.gif_anis.push(gifAnim);
        }
    }


    // 核心逻辑：这段混淆代码的本质是通过 Object.defineProperty 给当前对象添加 gen_uuid 属性，用于生成 Three.js 风格的 UUID。
    // 实现方式：复用 Three.js Object3D 实例的自动 UUID 生成能力，而非手动实现 UUID 算法。
    // 优化建议：直接使用 THREE.MathUtils.generateUUID() 生成 UUID，避免创建临时的 Object3D 实例，性能更优。
    gen_uuid()
    {
        // let e = new THREE.Object3D(); // 或其他Three.js核心类
        return new THREE.MathUtils.generateUUID()
    }

    /**
     * 复制保存的参数到目标对象（同步状态类参数）
     * @param {Object} target - 要赋值的目标对象（3D模型/网格等）
     * @param {Object} source - 保存的参数对象（包含各类状态开关）
     */
    // 核心功能：用于将保存的状态参数（碰撞、锁定、可拾取、通用网格）同步到目标对象，仅复制有有效值的参数，避免覆盖目标对象的默认状态
    copy_saved_param(target, source)
    {
        // 如果 source 有碰撞检测标记，则同步到 target
        if (source.bColliTest) {
            target.bColliTest = true;
        }
        // 如果 source 有锁定标记，则同步到 target
        if (source.bLock) {
            target.bLock = true;
        }
        // 如果 source 的 bPickable 不是 null/undefined，则覆盖 target
        if (source.bPickable != null) {
            target.bPickable = source.bPickable;
        }
        // 如果 source 有 common_mesh，则赋值给 target
        if (source.common_mesh) {
            target.common_mesh = source.common_mesh;
        }
    }

    // 模型加载完成后的后处理
    // 这个函数是整个场景加载完最后一定会调用的总入口：
    process_after_load()
    {
        // 收集所有同步材质（统一贴图、统一参数）
        this.collect_syn_materials();

        // 遍历场景根节点，递归处理每个对象
        for (let i = 0; i < this.scene.children.length; i++) {
            this._process_after_load(this.scene.children[i]);
        }

        // 如果是展览模式，根据 UUID 查找需要展示的对象
        if (this.exhibition && this.exhibition.objects_ids) {
            this.exhibition.objects = [];

            for (let i = 0; i < this.exhibition.objects_ids.length; i++) {
                const uuid = this.exhibition.objects_ids[i].uuid;
                const obj = this.search_obj_by_guid2(uuid);

                // 找到就加入展览对象列表
                if (obj) {
                    this.exhibition.objects.push(obj);
                }
            }
        }
    }

    // 核心功能：该方法是单个聚光灯对象加载后的目标绑定逻辑，核心流程为「判断聚光灯类型 → 通过 UUID 查找目标 → 绑定 target 属性」
    /**
     * 单个3D对象加载完成后的后置处理（非递归）
     * @param {THREE.Object3D} obj - 待处理的3D对象
     */
    // 加载后对子对象的单独处理
    _process_after_load(obj)
    {
        // 如果是聚光灯，并且存有 target 的 uuid
        if (obj.type === "SpotLight" && obj.target_uuid) {
            // 根据 uuid 在场景中查找目标物体
            const targetObj = this.search_obj_by_guid2(obj.target_uuid);

            // 如果找到目标，就把灯的目标指向它
            if (targetObj) {
                obj.target = targetObj;
            }
        }
    }

    // 从整个场景中，根据 UUID 查找对象（对外入口方法）
    search_obj_by_guid2(uuid)
    {
        // 遍历场景的所有直接子对象
        for (let i = 0; i < this.scene.children.length; i++) {
            // 调用递归方法，在子对象树中查找
            const result = this.search_obj_by_guid(this.scene.children[i], uuid);

            // 如果找到了，直接返回
            if (result) {
                return result;
            }
        }

        // 遍历完都没找到，返回 null
        return null;
    }

    // 递归查找指定对象及其子对象中，匹配 UUID 的物体
    search_obj_by_guid(obj, uuid)
    {
        // 如果当前对象的 uuid 匹配，直接返回
        if (obj.uuid === uuid) {
            return obj;
        }

        // 遍历子对象，递归查找
        for (let i = 0; i < obj.children.length; i++) {
            const result = this.search_obj_by_guid(obj.children[i], uuid);

            // 找到了就直接返回结果
            if (result) {
                return result;
            }
        }

        // 没找到
        return null;
    }

    // 收集场景中所有【重复使用的材质】，用于统一同步
    collect_syn_materials()
    {
        // 临时 Map：key = 材质唯一标识，value = 材质数组
        const materialMap = new Map();

        // 遍历场景，递归收集所有材质
        for (let i = 0; i < this.scene.children.length; i++) {
            this._collect_syn_materials(materialMap, this.scene.children[i]);
        }

        // 最终只保存【被使用超过1次】的材质（真正需要同步的）
        this.synMaterials = new Map();
        for (const [key, materials] of materialMap) {
            if (materials.length > 1) {
                this.synMaterials.set(key, materials);
            }
        }
    }

    // 递归遍历对象，收集带有 o2id 标识的材质（用于同步）
    _collect_syn_materials(map, obj)
    {
        // 如果对象有材质，并且材质上有有效的 o2id 标识
        if (obj.material && obj.material.o2id && obj.material.o2id !== "") {
            // 从 map 中取出该 o2id 对应的材质数组
            let matArray = map.get(obj.material.o2id);

            // 如果数组已存在，就把当前材质加进去
            if (matArray) {
                matArray.push(obj.material);
            }
            // 不存在则新建数组并放入 map
            else {
                matArray = [];
                matArray.push(obj.material);
                map.set(obj.material.o2id, matArray);
            }
        }

        // 递归处理所有子对象
        for (let i = 0; i < obj.children.length; i++) {
            this._collect_syn_materials(map, obj.children[i]);
        }
    }

    /**
     * 重置场景：清空所有模型、材质、纹理、贴图、相机、动画
     * 加载新场景前必须调用，防止内存泄漏 & 资源残留
     */
    // 核心功能：reset_scene 是场景初始化 / 重置的核心方法，通过释放资源、清空数据、重置渲染参数、重建基础辅助线，将整个 Three.js 场景恢复到初始状态
    reset_scene()
    {
        // 1. 销毁所有材质、纹理、几何体（释放内存）
        this.dispose_all();

        // 2. 清空所有数组/集合
        this.cubemaps = [];             // 环境贴图列表
        this.gif_anis = [];            // GIF 动画纹理
        this.same_texture_count = 0;   // 重复纹理计数
        this.same_mesh_count = 0;      // 重复模型计数
        this.div_bind = [];            // DOM 绑定事件
        this.cameras = [];             // 相机列表

        // 3. 清空场景内容 & 核心对象
        this.scene.children = [];      // 清空场景下所有子对象
        this.objects = [];             // 场景物体列表
        this.materials = [];           // 材质列表
        this.material_buffer = null;   // 材质缓冲
        this.maps = {};                // 普通贴图缓存
        this.envmaps = {};             // 环境贴图缓存
        this.selection = null;         // 当前选中物体
        this.import_root = null;       // 导入模型根节点
        this.skeletons = [];           // 骨骼动画列表
        // this.textureLoader = null

        // 4. 重置渲染器参数（色调映射 + 曝光）
        this.renderer.toneMapping = 0;
        this.renderer.toneMappingExposure = 1;

        // 5. 创建默认辅助网格（10000单位，40格）
        const grid = new THREE.GridHelper(10000, 40, 0, 0);
        grid.name = "grid";
        grid.material.opacity = 0.3;
        grid.material.transparent = true;
        this.grid = grid;
        this.scene.add(grid);

        // 6. 设置默认背景色（浅灰色 #FAFAFA）
        this.scene.background = new THREE.Color(0.98, 0.98, 0.98);

        // 7. 清空全局环境贴图
        this.cubemap = null;
    }

    // 这段代码的核心是给当前对象定义一个批量释放场景资源的方法 dispose_all；
    // 执行逻辑是：检查场景存在 → 遍历所有子对象 → 逐个调用资源释放方法；
    // 典型应用场景是 3D 渲染（如 Three.js）中清理内存，避免内存泄漏
    dispose_all()
    {
        // 检查当前对象是否有 scene 属性（场景对象）
        if (this.scene){
            // 遍历场景下的所有子对象
            for (let e = 0; e < this.scene.children.length; e++)
                // 对每个子对象执行资源释放操作
                this._dispose_object(this.scene.children[e])
        }
    }

    /**
     * 递归释放3D对象的资源（材质、纹理、几何体），防止内存泄漏
     * @param {THREE.Object3D} obj - 要释放资源的目标3D对象（模型/网格/骨骼等）
     * @private  // 下划线开头表示私有方法，仅内部调用
     */
    // 核心功能：该私有方法递归释放 Three.js 3D 对象及其所有子对象的材质、纹理、几何体资源，是 Three.js 中防止内存泄漏的核心操作
    // 销毁对象及其所有子对象（释放内存，防止Three.js内存泄漏）
    _dispose_object(obj)
    {
        if (!obj) return;

        // 销毁材质 + 所有贴图
        if (obj.material) {
            // 销毁各种纹理
            obj.material.map && obj.material.map.dispose();
            obj.material.lightMap && obj.material.lightMap.dispose();
            obj.material.alphaMap && obj.material.alphaMap.dispose();
            obj.material.aoMap && obj.material.aoMap.dispose();
            obj.material.envMap && obj.material.envMap.dispose();

            // 销毁材质本身
            obj.material.dispose();
        }

        // 销毁几何体
        obj.geometry?.dispose();

        // 递归销毁所有子对象
        for (let i = 0; i < obj.children.length; i++) {
            this._dispose_object(obj.children[i]);
        }
    }
}