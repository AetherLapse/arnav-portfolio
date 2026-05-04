import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useVelocity, useMotionTemplate } from 'framer-motion';

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Poppins:wght@600&display=swap');

  :root {
    --bg: #0A0A0A;          /* Deep Dark Background */
    --black: #F5F0E8;       /* Cream text */
    --red: #FF2A2A;         /* Primary Red */
    --red-soft: rgba(255,42,42,0.08);
    --muted: #A0A0A0;       
    --border: rgba(255,255,255,0.15); 
    --white: #1A1A1A;       
  }

  body {
    background-color: var(--bg);
    background-image: radial-gradient(var(--border) 1px, transparent 1px);
    background-size: 32px 32px;
    color: var(--black);
    font-family: 'Space Mono', monospace;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  * {
    cursor: none !important;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .font-bebas { font-family: 'Bebas Neue', sans-serif; }
  .font-caveat { font-family: 'Caveat', cursive; }
  .font-dancing { font-family: 'Dancing Script', cursive; }
  .font-space { font-family: 'Space Mono', monospace; }

  /* Custom Glitch Preloader */
  .loader-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    width: auto;
    margin: 2rem;
    font-family: "Poppins", sans-serif;
    font-size: 1.6em;
    font-weight: 600;
    user-select: none;
    color: var(--black);
    scale: 2;
  }

  .loader {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 1;
    background-color: transparent;
    -webkit-mask: repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px);
    mask: repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px);
  }

  .loader::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(circle at 50% 50%, #ff0 0%, transparent 50%),
      radial-gradient(circle at 45% 45%, #f00 0%, transparent 45%),
      radial-gradient(circle at 55% 55%, #0ff 0%, transparent 45%),
      radial-gradient(circle at 45% 55%, #0f0 0%, transparent 45%),
      radial-gradient(circle at 55% 45%, #00f 0%, transparent 45%);
    -webkit-mask: radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%);
    mask: radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%);
    animation: transform-animation 2s infinite alternate, opacity-animation 4s infinite;
    animation-timing-function: cubic-bezier(0.6, 0.8, 0.5, 1);
  }

  @keyframes transform-animation {
    0% { transform: translate(-55%); }
    100% { transform: translate(55%); }
  }

  @keyframes opacity-animation {
    0%, 100% { opacity: 0; }
    15% { opacity: 1; }
    65% { opacity: 0; }
  }

  .loader-letter {
    display: inline-block;
    opacity: 0;
    animation: loader-letter-anim 4s infinite linear;
    z-index: 2;
  }

  .loader-letter:nth-child(1) { animation-delay: 0.1s; }
  .loader-letter:nth-child(2) { animation-delay: 0.205s; }
  .loader-letter:nth-child(3) { animation-delay: 0.31s; }
  .loader-letter:nth-child(4) { animation-delay: 0.415s; }
  .loader-letter:nth-child(5) { animation-delay: 0.521s; }
  .loader-letter:nth-child(6) { animation-delay: 0.626s; }
  .loader-letter:nth-child(7) { animation-delay: 0.731s; }
  .loader-letter:nth-child(8) { animation-delay: 0.837s; }
  .loader-letter:nth-child(9) { animation-delay: 0.942s; }
  .loader-letter:nth-child(10) { animation-delay: 1.047s; }

  @keyframes loader-letter-anim {
    0% { opacity: 0; }
    5% { opacity: 1; text-shadow: 0 0 4px var(--black); transform: scale(1.1) translateY(-2px); }
    20% { opacity: 0.2; }
    100% { opacity: 0; }
  }

  @keyframes spin-forward {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spin-backward {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  @keyframes scan {
    0% { top: 0%; opacity: 0; }
    10% { opacity: 0.5; }
    90% { opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
  }
`;

// Global contexts
const CursorContext = React.createContext({ cursorX: null, cursorY: null });

// --- PHYSICS ENGINES ---

const MagneticRepulsion = ({ children, repulsionForce = 60, radius = 200, className = "" }) => {
  const { cursorX, cursorY } = useContext(CursorContext);
  const triggerRef = useRef(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.2 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.2 });
  const springScale = useSpring(scale, { stiffness: 120, damping: 15 });
  const springRotate = useSpring(rotate, { stiffness: 80, damping: 20 });

  useEffect(() => {
    let animationFrameId;
    const checkDistance = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      scale.set(1);
      rotate.set(0);
      
      if (cursorX && cursorY) {
        const distanceX = cursorX.get() - centerX;
        const distanceY = cursorY.get() - centerY;
        const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

        if (distance < radius) {
          const force = (radius - distance) / radius; 
          x.set(-(distanceX / distance) * force * repulsionForce);
          y.set(-(distanceY / distance) * force * repulsionForce);
        } else {
          x.set(0);
          y.set(0);
        }
      }
      animationFrameId = requestAnimationFrame(checkDistance);
    };

    animationFrameId = requestAnimationFrame(checkDistance);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cursorX, cursorY, radius, repulsionForce, x, y, scale, rotate]);

  return (
    <div ref={triggerRef} className={`inline-block relative ${className}`}>
      <motion.div 
        style={{ x: springX, y: springY, scale: springScale, rotate: springRotate }} 
        whileHover={{ scale: 1.05, rotate: Math.random() > 0.5 ? 2 : -2 }} 
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
        className="inline-block w-full h-full pointer-events-auto origin-center"
      >
        {children}
      </motion.div>
    </div>
  );
};

const ParticleFlyer = ({ children, className, style, delay = 0 }) => {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 50, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { delay, duration: 0.8, ease: "easeOut" } }}
      exit={{
        opacity: 0,
        y: -20,
        filter: "blur(20px)",
        transition: { duration: 0.8, ease: "easeIn" }
      }}
    >
      {children}
    </motion.div>
  );
};

const ParticleTextSwap = ({ text }) => {
  return (
    <span className="relative inline-block w-full text-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ opacity: 0, filter: "blur(20px)", scale: 0.9, y: 20 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.1, y: -20 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="inline-block relative z-20"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

const ScrambleText = ({ children, delay = 0 }) => {
  const [text, setText] = useState(children.replace(/./g, '_'));

  useEffect(() => {
    let iterations = 0;
    let interval;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+";
    setText(children.split('').map(() => letters[Math.floor(Math.random() * letters.length)]).join(''));

    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        setText(
          children
            .split("")
            .map((letter, index) => {
              if (index < iterations) return children[index];
              return letters[Math.floor(Math.random() * letters.length)];
            })
            .join("")
        );

        if (iterations >= children.length) {
          clearInterval(interval);
        }
        iterations += 1 / 2;
      }, 30);
    }, delay * 1000);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [children, delay]);

  return <span className="text-[var(--black)] font-bold">{text}</span>;
};

// --- UNICORN STUDIO BACKGROUND COMPONENT ---
const UnicornBackground = ({ active }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!window.UnicornStudio) {
      window.UnicornStudio = { isInitialized: false };
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.9/dist/unicornStudio.umd.js";
      script.onload = () => {
        if (window.UnicornStudio && window.UnicornStudio.init) {
          window.UnicornStudio.init();
        }
      };
      document.head.appendChild(script);
    } else if (window.UnicornStudio.init) {
      // Re-init if switching back or if it was already loaded
      window.UnicornStudio.init();
    }
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <div 
        className="w-full h-full" 
        data-us-project="3dLwfaI5FrrmnY0LS0oc"
      ></div>
    </motion.div>
  );
};

// --- COMPONENTS ---

const Pill = ({ variant, children }) => {
  const styles = {
    white: "bg-[var(--bg)] text-[var(--black)] border border-[var(--border)]",
    red: "bg-[var(--red)] text-[var(--black)] border border-[var(--red)]",
    gray: "bg-[var(--white)] text-[var(--muted)] border border-[var(--border)]"
  };
  
  return (
    <div className={`whitespace-nowrap px-4 py-1.5 rounded-full font-space text-[11px] font-bold shadow-sm ${styles[variant]}`}>
      {children}
    </div>
  );
};

const OrbitalRing = ({ radius, duration, reverse, items, itemVariant }) => {
  const forwardAnim = `spin-forward ${duration}s linear infinite`;
  const backwardAnim = `spin-backward ${duration}s linear infinite`;

  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
      style={{ width: radius * 2, height: radius * 2 }}
    >
      <div className="absolute inset-0 rounded-full border border-dashed border-[var(--border)] opacity-40 pointer-events-none" />
      <div 
        className="absolute inset-0" 
        style={{ animation: reverse ? backwardAnim : forwardAnim }}
      >
        {items.map((item, i) => {
          const angle = (i * 360) / items.length;
          const x = Math.cos(angle * Math.PI / 180) * radius;
          const y = Math.sin(angle * Math.PI / 180) * radius;
          
          return (
            <div
              key={i}
              className="absolute flex justify-center items-center pointer-events-auto"
              style={{
                top: `calc(50% + ${y}px)`,
                left: `calc(50% + ${x}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div style={{ animation: reverse ? forwardAnim : backwardAnim }}>
                <Pill variant={itemVariant}>{item}</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SpotlightCard = ({ children, className = "" }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative rounded-3xl md:rounded-[2rem] bg-[var(--border)] overflow-hidden cursor-none shadow-xl ${className}`}
    >
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-0"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.6), transparent 40%)`
        }}
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-[#0A0A0A]/95 backdrop-blur-md pointer-events-none z-0" />
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`
        }}
      />
      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};

const LiquidGlassText = ({ text }) => {
  const { cursorX, cursorY } = useContext(CursorContext);
  const textRef = useRef(null);
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);

  useEffect(() => {
    let animationFrameId;
    const updatePos = () => {
      if (!textRef.current) return;
      const rect = textRef.current.getBoundingClientRect();
      localX.set(cursorX.get() - rect.left);
      localY.set(cursorY.get() - rect.top);
      animationFrameId = requestAnimationFrame(updatePos);
    };
    animationFrameId = requestAnimationFrame(updatePos);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cursorX, cursorY, localX, localY]);

  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${localX}px ${localY}px, black 0%, transparent 100%)`;

  return (
    <div ref={textRef} className="relative inline-block pointer-events-none" style={{ fontSize: 'clamp(80px, 16vw, 300px)' }}>
      <div style={{ 
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        WebkitTextStroke: '1px rgba(255,255,255,0.08)', 
        textShadow: '0 10px 40px rgba(255,255,255,0.02)' 
      }}>
        {text}
      </div>
      <motion.div
        className="absolute inset-0"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1.2px rgba(255,255,255,0.9)', 
          textShadow: '0 0 15px rgba(255,255,255,0.4)',
          maskImage,
          WebkitMaskImage: maskImage
        }}
      >
        {text}
      </motion.div>
      <motion.div
        className="absolute inset-0"
        style={{
          color: 'rgba(255,255,255,0.1)', 
          maskImage,
          WebkitMaskImage: maskImage
        }}
      >
        {text}
      </motion.div>
    </div>
  );
};

const MagneticVideoCard = () => {
  const { cursorX, cursorY } = useContext(CursorContext);
  const cardRef = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 25, mass: 1 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);
  const scale = useSpring(rawScale, springConfig);
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animationFrameId;
    const updatePhysics = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const cX = cursorX.get();
      const cY = cursorY.get();
      const distX = cX - centerX;
      const distY = cY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      const isInside = Math.abs(distX) < halfW && Math.abs(distY) < halfH;

      if (isInside) {
        setIsHovered(true);
        setSpotlightPos({ x: cX - rect.left, y: cY - rect.top });
        rawScale.set(1.08); 
        rawX.set(0);
        rawY.set(0);
        rawRotateX.set((distY / halfH) * 15);
        rawRotateY.set(-(distX / halfW) * 15);
        cardRef.current.style.zIndex = 30;
      } else {
        setIsHovered(false);
        const pushRadius = rect.width * 1.6; 
        if (distance < pushRadius) {
          const force = (pushRadius - distance) / pushRadius;
          const easeForce = Math.pow(force, 1.5);
          rawScale.set(1);
          rawX.set(-(distX / distance) * easeForce * 35); 
          rawY.set(-(distY / distance) * easeForce * 35); 
          rawRotateX.set(0);
          rawRotateY.set(0);
          cardRef.current.style.zIndex = 10;
        } else {
          rawScale.set(1);
          rawX.set(0);
          rawY.set(0);
          rawRotateX.set(0);
          rawRotateY.set(0);
          cardRef.current.style.zIndex = 1;
        }
      }
      animationFrameId = requestAnimationFrame(updatePhysics);
    };
    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cursorX, cursorY, rawX, rawY, rawScale, rawRotateX, rawRotateY]);

  return (
    <div style={{ perspective: 1200 }} className="w-full aspect-[9/16] relative z-1">
      <motion.div
        ref={cardRef}
        style={{ x, y, scale, rotateX, rotateY }}
        className={`w-full h-full rounded-3xl md:rounded-[2rem] bg-[var(--border)] relative group overflow-hidden shadow-xl cursor-none flex items-center justify-center origin-center`}
      >
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-0"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(255,42,42,0.8), transparent 40%)` 
          }}
        />
        <div className="absolute inset-[1px] rounded-[inherit] bg-[var(--bg)]/95 backdrop-blur-md pointer-events-none z-0" />
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(600px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(255,255,255,0.08), transparent 40%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none z-10 rounded-[inherit]" />
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[var(--red)] flex items-center justify-center pl-1 scale-90 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,42,42,0.6)] transition-all duration-300 z-20 cursor-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--bg)"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </motion.div>
    </div>
  );
};

const WORKS_SUBSECTIONS = [
  "VIDEO EDITING",
  "SOCIAL MEDIA GRIDS",
  "SOCIAL MEDIA POSTS",
  "LOGO FOLIO",
  "FREESTYLE ARTWORKS"
];

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [isInvertHovered, setIsInvertHovered] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const totalSections = 7; 
  const [titleIndex, setTitleIndex] = useState(0);
  const titles = useMemo(() => [
    { left: "MOTION", right: "DESIGNER" },
    { left: "VIDEO", right: "EDITOR" }
  ], []);

  useEffect(() => {
    if (!hasLoaded) return;
    const interval = setInterval(() => {
      setTitleIndex(prev => (prev + 1) % titles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [hasLoaded, titles.length]);

  const sectionMV = useMotionValue(currentSection);
  useEffect(() => {
    sectionMV.set(currentSection);
  }, [currentSection, sectionMV]);

  const starProgress = useSpring(sectionMV, { stiffness: 60, damping: 14 });
  const starLeft = useTransform(starProgress, [0, totalSections - 1], ["0%", "100%"]);
  const starVelocity = useVelocity(starProgress);
  const starScaleX = useTransform(starVelocity, [-3, 0, 3], [2.5, 1, 2.5]);
  const starSkewX = useTransform(starVelocity, [-3, 0, 3], [35, 0, -35]); 
  const tailRotate = useTransform(starVelocity, v => v < 0 ? 180 : 0);
  const tailScaleX = useTransform(starVelocity, [-4, 0, 4], [1.5, 0, 1.5]);
  const tailOpacity = useTransform(starVelocity, [-0.5, 0, 0.5], [1, 0, 1]);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 28, stiffness: 200, mass: 0.2 };
  const wellX = useSpring(cursorX, springConfig);
  const wellY = useSpring(cursorY, springConfig);
  const touchStartY = useRef(0);

  useEffect(() => {
    setIsMounted(true);
    const loadTimer = setTimeout(() => setHasLoaded(true), 6500);
    const move = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener('mousemove', move);
    return () => {
      clearTimeout(loadTimer);
      window.removeEventListener('mousemove', move);
    };
  }, [cursorX, cursorY]);

  const handleWheel = (e) => {
    if (isScrolling) return;
    if (e.deltaY > 50 && currentSection < totalSections - 1) {
      changeSection(currentSection + 1);
    } else if (e.deltaY < -50 && currentSection > 0) {
      changeSection(currentSection - 1);
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isScrolling) return;
    const touchEndY = e.changedTouches[0].clientY;
    const delta = touchStartY.current - touchEndY;
    if (delta > 50 && currentSection < totalSections - 1) {
      changeSection(currentSection + 1);
    } else if (delta < -50 && currentSection > 0) {
      changeSection(currentSection - 1);
    }
  };

  const changeSection = (newSection) => {
    setIsScrolling(true);
    setCurrentSection(newSection);
    setTimeout(() => setIsScrolling(false), 700);
  };

  if (!isMounted) return null;

  return (
    <CursorContext.Provider value={{ cursorX, cursorY }}>
      <div 
        className="relative w-full h-screen overflow-hidden selection:bg-[var(--red)] selection:text-[var(--bg)] text-[var(--black)] bg-[var(--bg)]"
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          fontFamily: "'Space Mono', monospace"
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

        {/* ================= DYNAMIC BACKGROUNDS ================= */}
        <UnicornBackground active={currentSection === 1} />

        {/* ================= PHASE 1 & 2: OVERLAYS & PRELOADER ================= */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 5.15, duration: 0.1 }}
          className="fixed inset-0 bg-[#050505] z-[100] pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.8 }}
          transition={{ delay: 4.5, duration: 0.5 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="loader-wrapper">
            <span className="loader-letter">G</span><span className="loader-letter">e</span>
            <span className="loader-letter">n</span><span className="loader-letter">e</span>
            <span className="loader-letter">r</span><span className="loader-letter">a</span>
            <span className="loader-letter">t</span><span className="loader-letter">i</span>
            <span className="loader-letter">n</span><span className="loader-letter">g</span>
            <div className="loader"></div>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 1, 250], opacity: [0, 1, 1, 0] }}
          transition={{ times: [0, 0.14, 0.14, 1], duration: 1.05, delay: 5.0, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-1/2 left-1/2 w-[20px] h-[20px] rounded-full bg-[var(--black)] z-[150] pointer-events-none"
          style={{ marginLeft: -10, marginTop: -10, boxShadow: '0 0 20px 10px rgba(255,255,255,0.5)' }}
        />

        {/* GLOSS LIGHT SPREAD EFFECT */}
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[5]"
          style={{
            x: wellX,
            y: wellY,
            translateX: '-50%',
            translateY: '-50%',
            width: '700px',
            height: '700px',
            background: `radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, rgba(255, 42, 42, 0.05) 30%, transparent 65%)`,
            filter: 'blur(15px)',
            mixBlendMode: 'screen', 
            opacity: 1,
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* ================= PERMANENT ANCHORS ================= */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 5.8, duration: 0.6, staggerChildren: 0.1 }}
          className="absolute top-0 left-0 w-full z-50 bg-[var(--bg)] border-b border-[var(--border)] px-6 py-4 md:h-[56px] flex flex-wrap md:flex-nowrap justify-between items-center gap-4"
        >
          <div className="flex flex-col">
            <span className="font-space text-[9px] text-[var(--muted)] tracking-[0.15em] mb-0.5">[BASED IN]</span>
            <span className="font-space text-[12px] font-bold text-[var(--black)] leading-tight">Noida, India</span>
            <span className="font-space text-[10px] text-[var(--muted)]">Working globally</span>
          </div>

          <div className="flex flex-col hidden sm:flex">
            <span className="font-space text-[9px] text-[var(--muted)] tracking-[0.15em] mb-0.5">[AVAILABLE FOR]</span>
            <span className="font-space text-[12px] font-bold text-[var(--black)] leading-tight">Motion & Video</span>
            <span className="font-space text-[10px] text-[var(--muted)]">Freelance Open</span>
          </div>

          <div className="flex flex-col hidden md:flex">
            <span className="font-space text-[9px] text-[var(--muted)] tracking-[0.15em] mb-0.5">[EXPERIENCE]</span>
            <span className="font-space text-[12px] font-bold text-[var(--black)] leading-tight">3+ Years</span>
            <span className="font-space text-[10px] text-[var(--muted)]">Since 2022</span>
          </div>

          <div className="flex items-center">
            <MagneticRepulsion repulsionForce={30} radius={100}>
              <button className="bg-[var(--black)] text-[var(--bg)] font-space text-[12px] font-bold py-2 px-6 rounded-full border-2 border-[var(--black)] hover:bg-transparent hover:text-[var(--black)] transition-all duration-300 pointer-events-auto">
                Get in Touch &rarr;
              </button>
            </MagneticRepulsion>
          </div>
        </motion.div>

        {/* Main Portrait */}
        <motion.div
          initial={{ x: "-50%", y: 100, opacity: 0 }}
          animate={{ x: "-50%", y: currentSection === 0 ? 0 : 100, opacity: currentSection === 0 ? 1 : 0, filter: currentSection === 0 ? "blur(0px)" : "blur(20px)", scale: currentSection === 0 ? 1 : 0.9 }}
          transition={{ delay: (!hasLoaded && currentSection === 0) ? 6.2 : 0, duration: 1, ease: "easeOut" }}
          className="absolute bottom-0 left-1/2 z-[90] pointer-events-none w-[120vw] sm:w-[97.5vw] md:w-[82.5vw] max-w-[937.5px] flex justify-center origin-bottom"
        >
          <div className="w-full flex justify-center">
            <img 
              src="https://i.ibb.co/JbHp8w7/Whats-App-Image-2026-04-25-at-1-18-58-PM-Photoroom.png" 
              alt="Arnav Rai" 
              className="w-full h-auto object-contain object-bottom drop-shadow-[0_-10px_50px_rgba(0,0,0,0.8)]"
            />
          </div>
        </motion.div>

        {/* Center Orbital Galaxy */}
        <motion.div 
          animate={{ opacity: currentSection === 0 ? 1 : 0, filter: currentSection === 0 ? "blur(0px)" : "blur(20px)" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-30 pointer-events-none scale-50 md:scale-75 xl:scale-100"
        >
          <div className="w-full h-full relative">
            <OrbitalRing radius={300} duration={30} reverse={false} itemVariant="gray" items={["Noida, India 📍", "3+ Years", "#stAycReative", "Open to Work ✦"]} />
            <OrbitalRing radius={220} duration={20} reverse={true} itemVariant="red" items={["After Effects", "Premiere Pro", "Photoshop"]} />
            <OrbitalRing radius={150} duration={12} reverse={false} itemVariant="white" items={["Motion Design", "Video Editing"]} />
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 6.1, type: "spring", stiffness: 150, damping: 20 }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 ${currentSection === 0 ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="relative flex justify-center items-center">
                <div className="font-space text-[12px] md:text-[14px] text-[var(--red)] tracking-widest font-bold bg-[var(--bg)] px-6 py-2.5 rounded-full border border-[var(--border)] shadow-sm drop-shadow-[0_0_15px_rgba(255,42,42,0.2)]">
                  #stAycReative
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* ================= DYNAMIC VIRTUAL SCROLL SECTIONS ================= */}
        <AnimatePresence>
          {currentSection === 0 && (
            <motion.div key="hero" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1, transition: { duration: 0.8 } }} className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute left-[2%] top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                <ParticleFlyer delay={!hasLoaded ? 6.0 : 0} className="font-bebas leading-none select-none opacity-80">
                  <LiquidGlassText text="ARNAV" />
                </ParticleFlyer>
              </div>
              <div className="absolute right-[2%] top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                <ParticleFlyer delay={!hasLoaded ? 6.0 : 0} className="font-bebas leading-none select-none opacity-80">
                  <LiquidGlassText text="RAI" />
                </ParticleFlyer>
              </div>
              <div className="absolute top-[35%] md:top-[30%] left-[3%] md:left-[4%] z-20 pointer-events-none -rotate-12">
                <ParticleFlyer delay={!hasLoaded ? 6.3 : 0.3}>
                  <motion.div 
                    className="font-dancing text-[70px] md:text-[100px] leading-none origin-center pl-2 text-[var(--black)]" 
                    style={{ textShadow: '4px 4px 0px var(--bg)' }}
                    initial={{ clipPath: "inset(0% 100% 0% -10%)" }} animate={{ clipPath: "inset(0% -10% 0% -10%)" }}
                    transition={{ clipPath: { delay: !hasLoaded ? 6.3 : 0.3, duration: 1.2, ease: "easeInOut" } }}
                  >
                    The
                  </motion.div>
                </ParticleFlyer>
              </div>
              <div className="absolute top-[25%] right-[12%] z-20 pointer-events-none">
                <ParticleFlyer delay={!hasLoaded ? 6.2 : 0.2}>
                  <span className="font-space text-[11px] text-[var(--black)] bg-[#1A1A1A]/90 px-2 py-1 rotate-[6deg] inline-block border border-[var(--border)]">SERIOUSLY</span>
                </ParticleFlyer>
              </div>
              <div className="absolute top-[35%] right-[5%] z-20 pointer-events-none">
                <ParticleFlyer delay={!hasLoaded ? 6.3 : 0.3}>
                  <span className="font-space text-[11px] text-[var(--black)] bg-[#1A1A1A]/90 px-2 py-1 -rotate-[8deg] inline-block border border-[var(--border)]">GOOD</span>
                </ParticleFlyer>
              </div>
              <div className="absolute top-[20%] left-[25%] z-20 pointer-events-none hidden lg:block">
                <ParticleFlyer delay={!hasLoaded ? 6.5 : 0.5}>
                  <span className="font-caveat text-[28px] text-[var(--red)] -rotate-12 inline-block">Raw & Uncut</span>
                </ParticleFlyer>
              </div>
              <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 pb-16 md:pb-20 flex justify-between z-10 pointer-events-none">
                <ParticleFlyer delay={!hasLoaded ? 6.0 : 0}>
                  <motion.span style={{ fontSize: 'clamp(60px, 12vw, 160px)', color: 'var(--black)' }} className="font-bebas leading-[0.85] pointer-events-auto block" onMouseEnter={() => setIsInvertHovered(true)} onMouseLeave={() => setIsInvertHovered(false)}>
                    <ParticleTextSwap text={titles[titleIndex].left} />
                  </motion.span>
                </ParticleFlyer>
                <ParticleFlyer delay={!hasLoaded ? 6.1 : 0.1}>
                  <motion.span style={{ fontSize: 'clamp(60px, 12vw, 160px)', color: 'var(--black)' }} className="font-bebas leading-[0.85] pointer-events-auto block" onMouseEnter={() => setIsInvertHovered(true)} onMouseLeave={() => setIsInvertHovered(false)}>
                    <ParticleTextSwap text={titles[titleIndex].right} />
                  </motion.span>
                </ParticleFlyer>
              </div>
            </motion.div>
          )}

          {currentSection === 1 && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 z-20 flex flex-col justify-center px-4 md:px-12 pointer-events-none">
              <div className="w-full max-w-7xl mx-auto pt-12 md:pt-0 relative z-10">
                <ParticleFlyer delay={0.1}>
                  <motion.h2 className="font-bebas text-[clamp(60px,10vw,120px)] leading-none mb-8 md:mb-12 text-[var(--black)] pointer-events-auto w-fit block" onMouseEnter={() => setIsInvertHovered(true)} onMouseLeave={() => setIsInvertHovered(false)}>
                    INTRODUCTION
                  </motion.h2>
                </ParticleFlyer>
                <div className="w-full max-w-3xl pointer-events-auto relative z-20">
                  <ParticleFlyer delay={0.2}>
                    <div className="bg-[var(--white)]/40 backdrop-blur-md pl-8 p-6 md:pl-10 md:p-8 cursor-none shadow-xl border-l-2 border-[var(--red)] relative overflow-hidden group">
                      <div className="absolute left-0 w-full h-[1px] bg-[var(--red)] opacity-0 group-hover:animate-[scan_2s_ease-in-out_infinite]" />
                      <motion.p initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.4 }} className="font-space text-sm md:text-base text-[var(--black)] leading-relaxed mb-4 md:mb-6">
                        I’m a Motion Designer and Video Editor. For over three years, I’ve been cutting and animating bold, high-retention visual narratives that actually make people stop and watch.
                      </motion.p>
                      <motion.p initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.6 }} className="font-space text-sm md:text-base text-[var(--black)] leading-relaxed mb-4 md:mb-6">
                        I operate at the intersection of raw storytelling and strict technical execution. Give me <ScrambleText delay={0.8}>After Effects</ScrambleText>, <ScrambleText delay={0.9}>Premiere Pro</ScrambleText>, <ScrambleText delay={1.0}>Photoshop</ScrambleText>, and <ScrambleText delay={1.1}>Audition</ScrambleText>, and I'll turn raw footage and static concepts into kinetic reality.
                      </motion.p>
                      <motion.p initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.8 }} className="font-space text-sm md:text-base text-[var(--black)] leading-relaxed">
                        I don't do fluff. I care about pacing, workflow, and the final impact. Every frame I cut or craft is engineered not just to look striking, but to hold attention and perform.
                      </motion.p>
                    </div>
                  </ParticleFlyer>
                </div>
              </div>
            </motion.div>
          )}

          {currentSection >= 2 && currentSection <= 6 && (
            <motion.div key="my-works-shell" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1, transition: { duration: 0.8 } }} className="absolute inset-0 z-20 flex flex-col justify-center px-4 md:px-12 pointer-events-none">
              <div className="w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row pt-24 md:pt-32 pb-24 gap-8 md:gap-16">
                <div className="w-full md:w-1/3 flex flex-col justify-start pointer-events-auto relative z-20 shrink-0">
                  <ParticleFlyer delay={0.1}>
                    <motion.h2 className="font-bebas text-[clamp(50px,8vw,100px)] leading-none mb-10 md:mb-16 text-[var(--black)]" onMouseEnter={() => setIsInvertHovered(true)} onMouseLeave={() => setIsInvertHovered(false)}>MY WORKS</motion.h2>
                  </ParticleFlyer>
                  <ParticleFlyer delay={0.2}>
                    <div className="relative w-[300px] sm:w-[400px] md:w-[600px] -ml-[20px] pl-[20px] h-[300px] md:h-[400px] font-bebas text-[32px] md:text-[48px] leading-none whitespace-nowrap tracking-wide" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)" }}>
                      <div className="absolute left-[20px] top-[10px] bottom-[10px] w-[2px] bg-[var(--border)]/30">
                        <motion.div animate={{ height: `${((currentSection - 2) / (WORKS_SUBSECTIONS.length - 1)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="absolute top-0 left-0 w-full bg-[var(--red)] shadow-[0_0_10px_rgba(255,42,42,0.8)]" />
                        <motion.div animate={{ top: `${((currentSection - 2) / (WORKS_SUBSECTIONS.length - 1)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--red)] flex items-center justify-center w-6 h-6 z-10" style={{ filter: "drop-shadow(0 0 6px rgba(255,42,42,1))" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg></motion.div>
                      </div>
                      <motion.div className="absolute top-1/2 left-[50px] md:left-[70px] flex flex-col w-full" animate={{ y: `-${10 + ((currentSection - 2) * 20)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }}>
                        {WORKS_SUBSECTIONS.map((sub, idx) => {
                          const isActive = (currentSection - 2) === idx;
                          return ( <div key={idx} onClick={() => changeSection(idx + 2)} className={`cursor-none transition-all duration-300 flex items-center w-fit h-[60px] md:h-[80px] origin-left ${isActive ? 'text-[var(--black)] font-bold drop-shadow-[0_0_12px_rgba(245,240,232,0.3)] scale-100' : 'text-[var(--muted)] opacity-20 hover:opacity-100 hover:text-[var(--black)] scale-90'}`}>{sub}</div> );
                        })}
                      </motion.div>
                    </div>
                  </ParticleFlyer>
                </div>
                <div className="w-full md:w-2/3 h-full relative overflow-hidden pointer-events-auto flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {currentSection === 2 && (
                      <motion.div key="v" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="w-full h-full relative">
                        <div className="w-full h-full overflow-y-auto hide-scrollbar px-2 md:px-8" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)" }} onWheel={(e) => { const { scrollTop, scrollHeight, clientHeight } = e.currentTarget; if ((e.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 10) || (e.deltaY < 0 && scrollTop > 10)) e.stopPropagation(); }}>
                          <div className="flex gap-4 md:gap-8 pb-[30vh] pt-[15vh]">
                            <div className="flex-1 flex flex-col gap-4 md:gap-8">{Array.from({ length: 5 }).map((_, i) => <MagneticVideoCard key={`c1-${i}`} />)}</div>
                            <div className="flex-1 flex flex-col gap-4 md:gap-8 pt-12 md:pt-16">{Array.from({ length: 5 }).map((_, i) => <MagneticVideoCard key={`c2-${i}`} />)}</div>
                            <div className="hidden lg:flex-1 lg:flex lg:flex-col lg:gap-4 md:gap-8 pt-6 md:pt-8">{Array.from({ length: 5 }).map((_, i) => <MagneticVideoCard key={`c3-${i}`} />)}</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {currentSection === 3 && ( <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md aspect-square grid grid-cols-3 gap-2">{Array.from({length: 9}).map((_, i) => <SpotlightCard key={i} className="w-full h-full" />)}</motion.div> )}
                    {currentSection === 4 && ( <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl h-[60vh] flex gap-4 md:gap-8 items-center"><SpotlightCard className="w-1/2 md:w-1/3 h-full" /><div className="w-1/2 md:w-1/3 h-full flex flex-col gap-4"><SpotlightCard className="w-full flex-1" /><SpotlightCard className="w-full aspect-square" /></div></motion.div> )}
                    {currentSection === 5 && ( <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xl grid grid-cols-2 gap-4 aspect-square md:aspect-video"><SpotlightCard className="flex items-center justify-center"><div className="w-16 h-16 rounded-full border-2 border-[var(--black)]" /></SpotlightCard><SpotlightCard className="flex items-center justify-center"><div className="w-16 h-16 border-2 border-[var(--black)] rotate-45" /></SpotlightCard></motion.div> )}
                    {currentSection === 6 && ( <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl h-[60vh] relative"><SpotlightCard className="absolute top-[10%] left-[5%] w-[40%] h-[50%] z-10" /><SpotlightCard className="absolute bottom-[5%] left-[20%] w-[35%] h-[35%] z-30" /></motion.div> )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROGRESS BAR */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6.5, duration: 1 }} className="fixed bottom-12 left-8 right-8 md:left-16 md:right-16 h-[1px] bg-[var(--border)] z-[100] pointer-events-none">
          {[3, 4, 5, 6].map(sec => ( <div key={sec} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ left: `${(sec / (totalSections - 1)) * 100}%`, backgroundColor: currentSection >= sec ? 'var(--red)' : 'var(--border)' }} /> ))}
          <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center z-[101]" style={{ left: starLeft }}>
            <motion.div className="absolute top-1/2 right-[50%] -translate-y-1/2 h-[2px] w-[60px] md:w-[100px] origin-right" style={{ background: "linear-gradient(to right, transparent, var(--red))", boxShadow: '0 0 10px rgba(255,42,42,0.8)', rotate: tailRotate, scaleX: tailScaleX, opacity: tailOpacity }} />
            <motion.div className="text-[var(--red)] text-xl md:text-2xl drop-shadow-[0_0_8px_rgba(255,42,42,1)] z-10" style={{ scaleX: starScaleX, skewX: starSkewX }}>✦</motion.div>
          </motion.div>
          <div className="absolute top-4 left-0 -translate-x-4 md:-translate-x-1/2 font-space text-[9px] md:text-[11px]" style={{ color: currentSection === 0 ? 'var(--red)' : 'var(--muted)'}}>01 // HOME</div>
          <div className="absolute top-4 left-[16.66%] -translate-x-1/2 font-space text-[9px] md:text-[11px]" style={{ color: currentSection === 1 ? 'var(--red)' : 'var(--muted)'}}>02 // INTRO</div>
          <div className="absolute top-4 left-[33.33%] -translate-x-1/2 font-space text-[9px] md:text-[11px]" style={{ color: currentSection >= 2 ? 'var(--red)' : 'var(--muted)'}}>03 // MY WORKS</div>
        </motion.div>

        {/* CURSOR */}
        <motion.div className="fixed top-0 left-0 pointer-events-none z-[80] rounded-full bg-white" style={{ x: cursorX, y: cursorY, translateX: '-50%', translateY: '-50%', mixBlendMode: 'difference', filter: 'blur(10px)' }} animate={{ width: isInvertHovered ? 80 : 0, height: isInvertHovered ? 80 : 0, opacity: isInvertHovered ? 1 : 0 }} />
        <motion.svg className="fixed top-0 left-0 z-[9999] pointer-events-none drop-shadow-[5px_5px_0px_var(--red)]" width="36" height="36" viewBox="0 0 24 24" style={{ x: cursorX, y: cursorY, translateX: '-2px', translateY: '-2px' }}>
          <path d="M3 2L10 22L13.5 14.5L21 11L3 2Z" fill="var(--black)" stroke="var(--bg)" strokeWidth="2.5" strokeLinejoin="round" />
        </motion.svg>
      </div>
    </CursorContext.Provider>
  );
}