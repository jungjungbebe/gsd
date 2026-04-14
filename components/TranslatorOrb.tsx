'use client'

import { useEffect, useRef } from 'react'

interface TranslatorOrbProps {
  isActive?: boolean
  size?: number
}

export default function TranslatorOrb({ isActive = false, size: orbSize = 180 }: TranslatorOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const uniformsRef = useRef<any>(null)
  const glowUniformsRef = useRef<any>(null)
  const targetRef = useRef({ distortion: 0.0, rimPulse: 0.0, speed: 0.35 })
  const currentRef = useRef({ distortion: 0.0, rimPulse: 0.0, speed: 0.35 })
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current || !containerRef.current) return
    initRef.current = true

    let animId: number
    let renderer: any
    let geo: any
    let mat: any
    let glowGeo: any
    let glowMat: any

    async function init() {
      const THREE = await import('three')

      const size = orbSize
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
      camera.position.set(0, 0, 4.0)
      camera.lookAt(0, 0, 0)

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.2
      containerRef.current?.appendChild(renderer.domElement)

      // ── Noise (shared GLSL) ──
      const noiseGLSL = `
        vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod(i, 289.0);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 1.0/7.0;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
        }
        float fbm(vec3 p, float t) {
          float f = 0.0; float amp = 0.55; float freq = 1.2;
          for (int i = 0; i < 5; i++) {
            f += amp * snoise(p * freq + t);
            freq *= 1.9; amp *= 0.4; p = p.yzx;
          }
          return f;
        }
        float getDisp(vec3 pos, float t, float amp) {
          return fbm(pos, t * 0.25) * amp + snoise(pos * 0.5 + t * 0.06) * amp * 0.4;
        }
      `

      // ── MAIN ORB ──
      const mainVert = `
        uniform float uTime; uniform float uSpeed; uniform float uNoiseAmp;
        varying vec3 vNormal; varying vec3 vViewDir; varying vec3 vWorldPos; varying float vDisp;
        ${noiseGLSL}
        void main() {
          float t = uTime * uSpeed;
          float disp = getDisp(position, t, uNoiseAmp);
          vec3 newPos = position + normal * disp;
          vDisp = disp;
          // Recalculate normal
          float eps = 0.005;
          vec3 up = abs(normal.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
          vec3 tang = normalize(cross(up, normal));
          vec3 bitan = cross(normal, tang);
          vec3 pC = position + normal * disp;
          vec3 pT = (position + tang * eps) + normal * getDisp(position + tang * eps, t, uNoiseAmp);
          vec3 pB = (position + bitan * eps) + normal * getDisp(position + bitan * eps, t, uNoiseAmp);
          vec3 reN = normalize(cross(pT - pC, pB - pC));
          vNormal = normalize(normalMatrix * reN);
          vec4 wp = modelMatrix * vec4(newPos, 1.0);
          vWorldPos = wp.xyz;
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `

      const mainFrag = `
        uniform float uTime; uniform float uRimPulse;
        varying vec3 vNormal; varying vec3 vViewDir; varying vec3 vWorldPos; varying float vDisp;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);

          // Translucent gradient: pink top → mint bottom
          vec3 pinkTop  = vec3(0.85, 0.45, 0.65);
          vec3 lavender  = vec3(0.60, 0.40, 0.70);
          vec3 mintBot   = vec3(0.30, 0.72, 0.82);
          float ny = N.y * 0.5 + 0.5;
          vec3 baseColor = mix(mintBot, lavender, smoothstep(0.0, 0.45, ny));
          baseColor = mix(baseColor, pinkTop, smoothstep(0.4, 1.0, ny));
          // displacement brightens
          float d = smoothstep(-0.05, 0.2, vDisp);
          baseColor = mix(baseColor * 0.7, baseColor * 1.1, d);

          // Bright wrapped diffuse — show the gradient colors
          vec3 keyDir = normalize(vec3(2.0, 2.0, 3.0));
          float keyDiff = max(dot(N, keyDir), 0.0) * 0.5 + 0.5; // half-lambert
          keyDiff = keyDiff * keyDiff * 0.6;
          vec3 fillDir = normalize(vec3(-1.5, 0.5, 1.0));
          float fillDiff = max(dot(N, fillDir), 0.0) * 0.2;
          vec3 backDir = normalize(vec3(0.0, -1.0, -1.0));
          float backDiff = max(dot(N, backDir), 0.0) * 0.1;
          float totalDiff = keyDiff + fillDiff + backDiff + 0.5; // very bright ambient
          // Soft crevice AO
          float ao = smoothstep(-0.15, 0.08, vDisp);
          totalDiff *= mix(0.5, 1.0, ao);

          // Sharp rose gold specular
          vec3 roseGold = vec3(1.0, 0.5, 0.6);
          vec3 h1 = normalize(keyDir + V);
          float spec1 = pow(max(dot(N, h1), 0.0), 180.0) * 1.2;
          vec3 topDir = normalize(vec3(0.0, 3.0, 1.0));
          vec3 h2 = normalize(topDir + V);
          float spec2 = pow(max(dot(N, h2), 0.0), 120.0) * 0.4;

          // STRONG Fresnel — sharp edge glow
          float fresnel = 1.0 - max(dot(V, N), 0.0);
          float fresnelSharp = pow(fresnel, 4.0);
          float fresnelVerySharp = pow(fresnel, 8.0);

          // Pulsing rim
          float breathe = sin(uTime * 2.5) * 0.5 + 0.5;
          float rimStr = mix(0.6, 1.4, uRimPulse * breathe);
          vec3 rimWarm = vec3(0.9, 0.45, 0.55);
          vec3 rimCool = vec3(0.5, 0.3, 0.8);
          vec3 rimColor = mix(rimCool, rimWarm, ny);
          vec3 rim = rimColor * fresnelSharp * rimStr;

          // Hot edge line
          vec3 hotEdge = vec3(1.0, 0.6, 0.7) * fresnelVerySharp * 0.5;

          vec3 color = baseColor * totalDiff
                     + roseGold * spec1 + roseGold * 0.5 * spec2
                     + rim + hotEdge;

          // Semi-translucent: mostly visible, edges fully opaque
          float alpha = mix(0.82, 1.0, fresnelSharp);
          gl_FragColor = vec4(color, alpha);
        }
      `

      const uniforms = {
        uTime: { value: 0 }, uSpeed: { value: 0.35 },
        uNoiseAmp: { value: 0.12 }, uRimPulse: { value: 0.0 },
      }
      uniformsRef.current = uniforms

      geo = new THREE.SphereGeometry(1, 128, 128)
      mat = new THREE.ShaderMaterial({
        vertexShader: mainVert, fragmentShader: mainFrag,
        transparent: true, blending: THREE.NormalBlending, depthWrite: true, side: THREE.FrontSide, uniforms,
      })
      const mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)

      // ── GLOW SHELL — additive outer layer ──
      const glowVert = `
        uniform float uTime; uniform float uSpeed; uniform float uNoiseAmp;
        varying vec3 vNormal; varying vec3 vViewDir;
        ${noiseGLSL}
        void main() {
          float t = uTime * uSpeed;
          float disp = getDisp(position, t, uNoiseAmp);
          vec3 newPos = position + normal * (disp + 0.06); // slightly larger
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(newPos, 1.0);
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `

      const glowFrag = `
        uniform float uRimPulse;
        varying vec3 vNormal; varying vec3 vViewDir;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);
          float fresnel = 1.0 - max(dot(V, N), 0.0);
          float glow = pow(fresnel, 3.0);
          vec3 glowColor = vec3(0.8, 0.4, 0.6);
          float intensity = mix(0.15, 0.4, uRimPulse);
          gl_FragColor = vec4(glowColor * glow * intensity, glow * 0.2);
        }
      `

      const glowUniforms = {
        uTime: uniforms.uTime, uSpeed: uniforms.uSpeed,
        uNoiseAmp: uniforms.uNoiseAmp, uRimPulse: uniforms.uRimPulse,
      }
      glowUniformsRef.current = glowUniforms

      glowGeo = new THREE.SphereGeometry(1, 64, 64)
      glowMat = new THREE.ShaderMaterial({
        vertexShader: glowVert, fragmentShader: glowFrag,
        transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.FrontSide, uniforms: glowUniforms,
      })
      const glowMesh = new THREE.Mesh(glowGeo, glowMat)
      scene.add(glowMesh)

      const clock = new THREE.Clock()

      function animate() {
        animId = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()
        uniforms.uTime.value = t

        // Elastic interpolation
        const cur = currentRef.current
        const tgt = targetRef.current
        const atk = tgt.distortion > cur.distortion ? 0.08 : 0.025
        cur.distortion += (tgt.distortion - cur.distortion) * atk
        cur.rimPulse += (tgt.rimPulse - cur.rimPulse) * atk
        cur.speed += (tgt.speed - cur.speed) * 0.04

        // Rubber band bounce on release
        if (tgt.distortion < 0.01 && cur.distortion > 0.003) {
          const bounce = Math.sin(t * 8.0) * cur.distortion * 0.35
          uniforms.uNoiseAmp.value = Math.max(0.12, 0.12 + cur.distortion + bounce)
        } else {
          uniforms.uNoiseAmp.value = 0.12 + cur.distortion
        }
        uniforms.uRimPulse.value = cur.rimPulse
        uniforms.uSpeed.value = cur.speed

        mesh.rotation.y = t * 0.08
        mesh.rotation.x = Math.sin(t * 0.05) * 0.1
        glowMesh.rotation.copy(mesh.rotation)

        renderer.render(scene, camera)
      }
      animate()
    }

    init()

    return () => {
      if (animId) cancelAnimationFrame(animId)
      if (renderer) renderer.dispose()
      if (geo) geo.dispose()
      if (mat) mat.dispose()
      if (glowGeo) glowGeo.dispose()
      if (glowMat) glowMat.dispose()
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas')
        if (canvas) containerRef.current.removeChild(canvas)
      }
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      targetRef.current = { distortion: 0.08, rimPulse: 1.0, speed: 0.8 }
    } else {
      targetRef.current = { distortion: 0.0, rimPulse: 0.0, speed: 0.35 }
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      style={{
        width: orbSize,
        height: orbSize,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
        transition: 'filter 0.6s ease',
        filter: isActive
          ? 'drop-shadow(0 8px 32px rgba(160, 80, 120, 0.5))'
          : 'drop-shadow(0 4px 16px rgba(160, 80, 120, 0.25))',
      }}
    />
  )
}
