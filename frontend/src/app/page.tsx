import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-[#FFFDF7]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2D9C4A] via-[#38B254] to-[#1E7A34] text-white overflow-hidden">
        {/* Dekorativa former */}
        <div className="absolute top-[-60px] right-[-40px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-30px] left-[-20px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-20 right-1/3 w-20 h-20 rounded-full bg-[#FF6B35]/20" />

        <div className="max-w-4xl mx-auto px-4 py-20 md:py-28 text-center relative z-10">
          <p className="inline-block bg-white/15 text-white/90 px-5 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            🎪 Sveriges fräschaste festivaltoaletter
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Skitbra toaletter
            <br />
            <span className="text-[#FFEAA7]">för ditt evenemang</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Från bröllop till festivaler. Välj modell, datum och tillval — 
            priset får du direkt. Inga dolda avgifter, bara fräscha toaletter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/boka"
              className="inline-block bg-[#FF6B35] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#E55A2B] transition-all hover:scale-105 shadow-lg shadow-[#FF6B35]/25"
            >
              Boka nu — få pris direkt →
            </Link>
            <a
              href="#how"
              className="inline-block bg-white/15 text-white px-8 py-4 rounded-2xl font-medium text-lg hover:bg-white/25 transition-all backdrop-blur-sm"
            >
              Hur funkar det?
            </a>
          </div>
        </div>

        {/* Vågig bottenkant */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-auto" preserveAspectRatio="none">
            <path
              d="M0 40 C240 0 480 60 720 30 C960 0 1200 60 1440 30 L1440 60 L0 60 Z"
              fill="#FFFDF7"
            />
          </svg>
        </div>
      </section>

      {/* Stats / Social proof */}
      <section className="max-w-5xl mx-auto px-4 py-16 -mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { number: '500+', label: 'Nöjda kunder', emoji: '⭐' },
            { number: '2 500+', label: 'Uthyrda dagar', emoji: '📅' },
            { number: '4,9/5', label: 'Snittbetyg', emoji: '❤️' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-6 text-center shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <span className="text-3xl">{stat.emoji}</span>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {stat.number}
              </p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hur funkar det */}
      <section id="how" className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-center text-[#2D9C4A] font-semibold text-sm uppercase tracking-wider mb-3">
          Så enkelt
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">
          Så enkelt — fyra steg
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 stagger">
          {[
            {
              step: '01',
              icon: '📍',
              title: 'Ange plats',
              desc: 'Skriv ditt postnummer — vi hittar närmaste hub och kollar tillgänglighet.',
            },
            {
              step: '02',
              icon: '📅',
              title: 'Välj datum',
              desc: 'Ange när du behöver toaletterna levererade.',
            },
            {
              step: '03',
              icon: '🚽',
              title: 'Välj toaletter',
              desc: 'Välj premium, standard, handikapp och lyx — blanda fritt!',
            },
            {
              step: '04',
              icon: '✨',
              title: 'Boka & klart!',
              desc: 'Fyll i dina uppgifter och få bekräftelse med pris direkt.',
            },
          ].map((item) => (
            <div key={item.step} className="group relative">
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <span className="text-5xl mb-4 block">{item.icon}</span>
                <div className="text-xs font-bold text-[#2D9C4A] mb-2">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
              {/* Pil mellan steg (desktop) */}
              {item.step !== '04' && (
                <div className="hidden md:block absolute top-1/2 -right-4 text-2xl text-gray-300 group-hover:text-[#FF6B35] transition-colors">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Produkter */}
      <section className="bg-gradient-to-b from-[#FFFDF7] to-[#F0FDF4] py-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-[#2D9C4A] font-semibold text-sm uppercase tracking-wider mb-3">
            Våra modeller
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">
            Hitta rätt toalett för ditt event
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {[
              { name: 'Premium', price: '1 500', emoji: '🚽', color: 'from-emerald-500 to-green-600', desc: 'Handfat, spegel, belysning — perfekt för bröllop' },
              { name: 'Standard', price: '900', emoji: '🚻', color: 'from-blue-500 to-cyan-600', desc: 'Pålitlig och prisvärd för alla typer av event' },
              { name: 'Handikapp', price: '1 800', emoji: '♿', color: 'from-purple-500 to-indigo-600', desc: 'Fullt rullstolsanpassad med extra utrymme' },
              { name: 'Lyx', price: '2 500', emoji: '👑', color: 'from-amber-500 to-orange-600', desc: 'Marmorlook, musik & AC — lyx på riktigt' },
            ].map((p) => (
              <div
                key={p.name}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                {/* Färgad topp */}
                <div className={`bg-gradient-to-r ${p.color} p-6 text-center`}>
                  <span className="text-5xl">{p.emoji}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {p.name}toalett
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{p.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-[#FF6B35]">
                      {p.price} kr
                    </span>
                    <span className="text-sm text-gray-400">/dag</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <p className="text-center text-[#2D9C4A] font-semibold text-sm uppercase tracking-wider mb-3">
          Vad andra säger
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">
          ⭐ 4,9 av 5 i snittbetyg
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: 'Räddade vårt bröllop! Fräscha, snygga och levererade i tid.', name: 'Maria & Johan', event: 'Bröllop, juli 2026' },
            { quote: 'Bästa toaletterna vi haft på festivalen. Inga köer, alltid rena.', name: 'David', event: 'Musikfestival, aug 2026' },
            { quote: 'Smidig bokning, bra pris, och toaletterna var i toppskick!', name: 'Företagsevent AB', event: 'Kickoff, sep 2026' },
          ].map((t, i) => (
            <div
              key={i}
              className="bg-[#FFF8F0] rounded-2xl p-6 border border-orange-100"
            >
              <div className="text-[#FF6B35] text-3xl mb-3">"</div>
              <p className="text-gray-700 italic mb-4">{t.quote}</p>
              <p className="font-semibold text-gray-900">{t.name}</p>
              <p className="text-sm text-gray-400">{t.event}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-[#2D9C4A] to-[#1E7A34] text-white py-20 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute bottom-[-50px] left-[-30px] w-64 h-64 rounded-full bg-[#FF6B35]/15" />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            Redo att boka? 🚀
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Välj datum, modell och tillval. Priset får du direkt — 
            inga konstigheter, bara fräscha toaletter.
          </p>
          <Link
            href="/boka"
            className="inline-block bg-[#FF6B35] text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-[#E55A2B] transition-all hover:scale-105 shadow-xl shadow-[#FF6B35]/30"
          >
            Boka din toalett nu →
          </Link>
          <p className="text-white/50 text-sm mt-4">
            Få priset direkt — ingen registrering krävs
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A2F1D] text-green-200/70 py-10 text-center text-sm">
        <p className="font-bold text-white mb-1">🚽 Hyrtoaletter</p>
        <p>© {new Date().getFullYear()} — Fräscha toaletter för alla evenemang</p>
      </footer>
    </div>
  );
}
