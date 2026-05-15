import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-midnight text-white">
      {/* Background with Gradient - Using the new hero image */}
      <div className="absolute inset-0 bg-black z-0" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70 z-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}hero-bg.png)`,
        }}
      />

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent z-0" />

      {/* Animated Content */}
      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto mt-20">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl md:text-8xl font-serif font-bold mb-8 tracking-tight text-white drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        >
          Alternative Futures of <br />
          <span className="block mt-2 text-white pb-2">Software Work</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-xl md:text-2xl text-gray-200 mb-12 font-light leading-relaxed max-w-3xl mx-auto"
        >
          <p className="mb-4">
            Exploring the{" "}
            <span className="text-neon-gold font-normal">
              socio-technical shift
            </span>{" "}
            where AI meets human expertise.
          </p>
          <p className="text-lg text-hologram-cyan/80">
            A collaboration between VTT and University of Helsinki. Funded by
            Business Finland.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute -bottom-32 left-1/2 transform -translate-x-1/2"
        >
          <span className="text-xs text-neon-gold uppercase tracking-[0.2em] mb-2 block">
            Read more
          </span>
          <div className="animate-bounce">
            <svg
              className="w-6 h-6 mx-auto text-white shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
