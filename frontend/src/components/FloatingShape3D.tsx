/**
 * FloatingShape3D.tsx
 * An ambient floating 3D Torus Knot using raw Three.js.
 * Reacts to mouse movement and floats with a sine-wave animation.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppSelector } from '../hooks/redux';

const FloatingShape3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = useAppSelector((state) => state.theme.mode === 'dark');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width  = el.clientWidth  || 400;
    const height = el.clientHeight || 400;

    // Scene setup
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ─── Geometry ────────────────────────────────────────────────
    const geometry = new THREE.TorusKnotGeometry(1.15, 0.38, 160, 36);

    // Solid mesh
    const solidMat = new THREE.MeshStandardMaterial({
      color:     isDark ? 0x7c3aed : 0x6d28d9,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    const solidMesh = new THREE.Mesh(geometry, solidMat);
    scene.add(solidMesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color:       isDark ? 0x06b6d4 : 0x0891b2,
      wireframe:   true,
      transparent: true,
      opacity:     isDark ? 0.18 : 0.12,
    });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    scene.add(wireMesh);

    // ─── Lights ──────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const light1 = new THREE.PointLight(0x7c3aed, 5, 12);
    light1.position.set(3, 3, 3);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x06b6d4, 5, 12);
    light2.position.set(-3, -2, 2);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xd946ef, 3, 8);
    light3.position.set(0, -3, -2);
    scene.add(light3);

    // ─── Mouse tracking ──────────────────────────────────────────
    let mx = 0, my = 0;
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    // ─── Resize ──────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── Animation loop ──────────────────────────────────────────
    let rafId: number;
    const t0 = performance.now();

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;

      // Floating sine
      const floatY = Math.sin(t * 0.65) * 0.14;
      solidMesh.position.y = floatY;
      wireMesh.position.y  = floatY;

      // Rotation + mouse influence
      solidMesh.rotation.x = t * 0.28 + my * 0.25;
      solidMesh.rotation.y = t * 0.45 + mx * 0.25;
      wireMesh.rotation.x  = solidMesh.rotation.x;
      wireMesh.rotation.y  = solidMesh.rotation.y;

      // Orbiting lights
      light1.position.set(Math.sin(t * 0.7) * 3.5,  Math.cos(t * 0.5) * 3.5,  3);
      light2.position.set(Math.cos(t * 0.8) * 3.5, -Math.sin(t * 0.6) * 3.5,  2);

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      geometry.dispose();
      solidMat.dispose();
      wireMat.dispose();
      renderer.dispose();
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.45))' }}
    />
  );
};

export default FloatingShape3D;
