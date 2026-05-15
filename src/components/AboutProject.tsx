import { motion } from "framer-motion";

const AboutProject = () => {
  return (
    <section
      id="about-project"
      className="bg-gradient-to-b from-midnight to-black py-20 px-4 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
            About the <span className="text-electric-blue">Project</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-neon-gold to-hologram-cyan mx-auto rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="prose prose-base prose-invert mx-auto text-gray-300 leading-relaxed font-light"
        >
          <p>
            Alternative Futures of Software Work is a research initiative
            exploring how AI is reshaping the practice, organization, and
            meaning of software development. Run by VTT and the University of
            Helsinki and funded by Business Finland, the project tracks emerging
            AI signals weekly, publishes expert insights from researchers and
            practitioners, and collaborates with Finnish software companies to
            anticipate the socio-technical shifts now underway.
          </p>

          <p>
            Software work has significantly evolved over the past decades, and
            the demand for software professionals has skyrocketed. According to
            a report published in 2023, Finland was estimated to need 200,000
            new software professionals by 2030. However, the development of
            large language models, has rapidly changed the landscape. In 2026,
            advanced AI-driven development tools handle routine programming
            tasks and are about to surpass the skills of even the best
            programmers.
          </p>

          <p>
            The breakthrough in AI has also transformed the nature of software
            work. This creates challenges in terms of employee motivation,
            well-being, and ensuring organizational competitiveness. The impact
            of AI on the workplace is not merely technological but constitutes
            an unpredictable socio-technical shift.
          </p>

          <p>
            The project investigates the impact of AI on software work and
            collaborates with companies to develop a vision for sustainable and
            human-centered software work. Solutions are sought for current
            challenges such as the skills shortage and workload management, as
            well as for long-term transformations.
          </p>

          <p>
            The project enhances participants' ability to anticipate,
            understand, and prepare for various futures, learn by experimenting
            with new work methods, and develop skills and competences.
            Additionally, it provides guidelines for management, HR, and
            operational teams, and improves companies' ethical and
            responsibility competencies in the face of the AI revolution. The
            project supports employee well-being and motivation, encourages
            creativity and enthusiasm, and strengthens ethical and responsible
            productivity growth.
          </p>
        </motion.div>

        {/* Partner Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-8 md:gap-12"
        >
          <img
            src={`${import.meta.env.BASE_URL}VTT.jpg`}
            alt="VTT"
            className="h-16 md:h-20 object-contain rounded-sm mix-blend-screen"
          />
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-400 font-sans opacity-80">
              Funded by
            </span>
            <img
              src={`${import.meta.env.BASE_URL}BF.svg`}
              alt="Business Finland"
              className="h-10 md:h-12 object-contain brightness-0 invert opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
          <img
            src={`${import.meta.env.BASE_URL}UH.jpg`}
            alt="University of Helsinki"
            className="h-16 md:h-20 object-contain rounded-sm mix-blend-screen"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default AboutProject;
