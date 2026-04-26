import { Effects } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { Particles } from "./particles";
import { VignetteShader } from "./shaders/vignetteShader";

const PARTICLE_SETTINGS = {
  speed: 1.0,
  noiseScale: 0.6,
  noiseIntensity: 0.52,
  timeScale: 1,
  focus: 3.8,
  aperture: 1.79,
  pointSize: 10.0,
  opacity: 0.3,
  planeScale: 10.0,
  size: 512,
  vignetteDarkness: 1.5,
  vignetteOffset: 0.4,
  useManualTime: false,
  manualTime: 0,
} as const;

export const GL = () => {
  const {
    speed,
    focus,
    aperture,
    size,
    noiseScale,
    noiseIntensity,
    timeScale,
    pointSize,
    opacity,
    planeScale,
    vignetteDarkness,
    vignetteOffset,
    useManualTime,
    manualTime,
  } = PARTICLE_SETTINGS;

  return (
    <div className="webgl" aria-hidden>
      <Canvas
        camera={{
          position: [
            1.2629783123314589, 2.664606471394044, -1.8178993743288914,
          ],
          fov: 50,
          near: 0.01,
          far: 300,
        }}
      >
        <color attach="background" args={["#000"]} />
        <Particles
          speed={speed}
          aperture={aperture}
          focus={focus}
          size={size}
          noiseScale={noiseScale}
          noiseIntensity={noiseIntensity}
          timeScale={timeScale}
          pointSize={pointSize}
          opacity={opacity}
          planeScale={planeScale}
          useManualTime={useManualTime}
          manualTime={manualTime}
        />
        <Effects multisamping={0} disableGamma>
          <shaderPass
            args={[VignetteShader]}
            uniforms-darkness-value={vignetteDarkness}
            uniforms-offset-value={vignetteOffset}
          />
        </Effects>
      </Canvas>
    </div>
  );
};
