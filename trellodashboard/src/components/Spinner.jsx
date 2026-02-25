import React, { useRef, useEffect } from 'react';

const Spinner = ({ rewards = [], targetReward, isSpinning }) => {
  const wheelRef = useRef(null);

  const totalRewards = rewards.length;
  const anglePerItem = totalRewards > 0 ? 360 / totalRewards : 0;

  useEffect(() => {
    if (!wheelRef.current) return;

    if (isSpinning && targetReward) {
      const targetIndex = rewards.findIndex(r => r.id === targetReward.id);
      if (targetIndex === -1) return;

      const currentRotation = getRotationDegrees(wheelRef.current);
      const normalizedRotation = currentRotation % 360;

      const extraRotations = 5 * 360; 
      const targetAngle = 360 - (targetIndex * anglePerItem);
      const randomOffset = anglePerItem / 2;
      
      const finalAngle = extraRotations + targetAngle - randomOffset;

      wheelRef.current.style.transition = 'transform 5s cubic-bezier(.25, .1, .25, 1)';
      wheelRef.current.style.transform = `rotate(${finalAngle}deg)`;
    } else if (!isSpinning) {
      // Allows re-spinning to the same reward
      wheelRef.current.style.transition = 'none';
    }
  }, [isSpinning, targetReward]);

  const getRotationDegrees = (element) => {
    if (!element) return 0;
    const st = window.getComputedStyle(element, null);
    const transform = st.getPropertyValue("-webkit-transform") ||
                      st.getPropertyValue("-moz-transform") ||
                      st.getPropertyValue("-ms-transform") ||
                      st.getPropertyValue("-o-transform") ||
                      st.getPropertyValue("transform");

    if (transform === 'none' || !transform || transform.indexOf('(') === -1) {
      return 0;
    }

    const values = transform.split('(')[1].split(')')[0].split(',');
    const a = values[0];
    const b = values[1];
    const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));

    return angle;
  };

  const segmentColors = ['#27272a', '#3f3f46'];

  return (
    <div className="relative w-96 h-96 mx-auto flex items-center justify-center">
      {/* Marcador/Seta */}
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-20" style={{ right: '-24px' }}>
        <div className="w-0 h-0 
          border-t-[15px] border-t-transparent
          border-b-[15px] border-b-transparent
          border-l-[25px] border-l-red-500"
        />
        <div className="absolute w-3 h-3 bg-neutral-900 rounded-full" style={{top: '50%', left: '1px', transform: 'translateY(-50%)'}}/>
      </div>
      
      {/* Roda da Roleta */}
      <div
        ref={wheelRef}
        className="relative w-full h-full rounded-full border-4 border-neutral-700 shadow-xl overflow-hidden"
        style={{ transformOrigin: 'center center' }}
      >
        <ul className="absolute w-full h-full" style={{'--item-count': totalRewards}}>
          {rewards.map((reward, index) => {
            const rotation = (360 / totalRewards) * index;
            const color = segmentColors[index % segmentColors.length];

            return (
              <li 
                key={reward.id} 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  clipPath: `polygon(50% 50%, 100% 0, 100% 100%)`, // Triângulo inicial
                  '--slice-angle': `${anglePerItem}deg`
                }}
              >
                <div
                  className="absolute w-full h-full"
                  style={{ 
                    backgroundColor: color,
                    transform: `skewY(calc(90deg - var(--slice-angle)))`,
                    transformOrigin: '50% 50%',
                  }}
                />
                <div 
                    className="absolute w-1/2 h-1/2 flex items-center justify-start pl-4"
                    style={{
                      transformOrigin: '100% 100%',
                      transform: `rotate(calc(var(--slice-angle) / 2))`,
                      right: '0',
                    }}
                >
                    <span 
                      className="text-white text-xs font-bold whitespace-nowrap" 
                      style={{ 
                        display: 'inline-block',
                        transform: `rotate(-90deg) translate(-50%, -50%)`,
                        transformOrigin: 'center center',
                        top: '50%',
                        left: '50%',
                      }}
                    >
                        {reward.name}
                    </span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="absolute w-12 h-12 bg-neutral-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 border-4 border-neutral-700" />
      </div>
    </div>
  );
};

export default Spinner;