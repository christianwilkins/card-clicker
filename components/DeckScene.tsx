'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Card3D from './Card3D';
import type { CardType } from './Card';

interface DeckSceneProps {
  lastCard: CardType | null;
  onDeckClick: () => void;
}

export default function DeckScene({ lastCard, onDeckClick }: DeckSceneProps) {
  return (
    <div
      className="w-full h-64 cursor-pointer rounded-lg overflow-hidden bg-gradient-to-br from-blue-900 to-blue-700 shadow-2xl border-4 border-blue-300"
      onClick={onDeckClick}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Deck of cards stacked */}
        {[...Array(8)].map((_, i) => (
          <group key={i} position={[0, 0, -i * 0.05]}>
            <mesh rotation={[0, 0, 0]}>
              <boxGeometry args={[1.5, 2, 0.05]} />
              <meshStandardMaterial color="#3b82f6" />
            </mesh>
          </group>
        ))}

        {/* Last drawn card floating above */}
        {lastCard && (
          <Card3D
            suit={lastCard.suit}
            rank={lastCard.rank}
            position={[2.5, 0, 0]}
            rotation={[0, 0.3, 0]}
            animate={true}
          />
        )}

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
