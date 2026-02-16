
import React from 'react';

const SnowEffect: React.FC = () => {
  // Generate a fixed number of snowflakes
  const snowflakes = Array.from({ length: 50 });

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
        {/* Garland Lights at the top */}
        <div className="absolute top-0 left-0 right-0 h-12 z-[61]" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'40\' viewBox=\'0 0 100 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0 Q 50 40 100 0\' stroke=\'%23555\' fill=\'none\' stroke-width=\'2\'/%3E%3Ccircle cx=\'25\' cy=\'15\' r=\'4\' fill=\'%23ff0000\' opacity=\'0.8\' class=\'light-red\'/%3E%3Ccircle cx=\'50\' cy=\'20\' r=\'4\' fill=\'%2300ff00\' opacity=\'0.8\' class=\'light-green\'/%3E%3Ccircle cx=\'75\' cy=\'15\' r=\'4\' fill=\'%23ffff00\' opacity=\'0.8\' class=\'light-gold\'/%3E%3C/svg%3E") repeat-x top center' }}></div>

        {snowflakes.map((_, i) => {
            const left = Math.random() * 100;
            const animDelay = Math.random() * 10;
            const animDuration = 10 + Math.random() * 20;
            const opacity = 0.3 + Math.random() * 0.5;
            const size = 3 + Math.random() * 5;

            return (
                <div 
                    key={i}
                    className="absolute top-[-20px] bg-white rounded-full snowflake"
                    style={{
                        left: `${left}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        opacity: opacity,
                        animation: `fall ${animDuration}s linear infinite`,
                        animationDelay: `-${animDelay}s`,
                    }}
                />
            );
        })}
    </div>
  );
};

export default SnowEffect;