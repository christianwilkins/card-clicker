'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Suit, Rank } from './Card';

interface Card3DProps {
  suit: Suit;
  rank: Rank;
  position?: [number, number, number];
  rotation?: [number, number, number];
  animate?: boolean;
}

export default function Card3D({ suit, rank, position = [0, 0, 0], rotation = [0, 0, 0], animate = false }: Card3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const isRed = suit === '♥' || suit === '♦';

  useFrame((state) => {
    if (meshRef.current && animate) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.3;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* Card base */}
      <mesh>
        <boxGeometry args={[1.5, 2, 0.05]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Card border */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[1.48, 1.98]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Rank text */}
      <Text
        position={[0, 0.6, 0.03]}
        fontSize={0.5}
        color={isRed ? '#dc2626' : '#000000'}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {rank}
      </Text>

      {/* Suit text */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.8}
        color={isRed ? '#dc2626' : '#000000'}
        anchorX="center"
        anchorY="middle"
      >
        {suit}
      </Text>
    </group>
  );
}