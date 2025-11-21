import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Zap as Bolt, Play, CheckCircle, Microscope, Cpu, Battery, X } from 'lucide-react';

const SectionLink: React.FC<{ href: string; label: string; active?: boolean }> = ({ href, label, active }) => (
  <a
    href={href}
    aria-current={active ? 'page' : undefined}
    className={
      `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ` +
      (active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50')
    }
  >
    {label}
  </a>
);

const ZeflashLanding: React.FC = () => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<string | null>(null);

  useEffect(() => {
    const sectionIds = ['what', 'features', 'how', 'science', 'who', 'why'];
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          let current = '';
          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom >= 120) {
              current = id;
              break;
            }
          }
          setActiveSection(current || 'what');
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-blue-200/40">
              <Zap className="text-white" size={20} />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold">Zeflash</div>
              <div className="text-xs text-gray-500">Rapid AI Diagnostics & Power</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <SectionLink href="#what" label="What" active={activeSection==='what'} />
            <SectionLink href="#features" label="Features" active={activeSection==='features'} />
            <SectionLink href="#how" label="How it works" active={activeSection==='how'} />
            <SectionLink href="#science" label="Science" active={activeSection==='science'} />
            <SectionLink href="#who" label="Who it's for" active={activeSection==='who'} />
            <SectionLink href="#why" label="Why Zeflash" active={activeSection==='why'} />
          </nav>
          <div className="flex items-center gap-2">
            <a href="#book" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-3 py-2 hover:from-cyan-600 hover:to-blue-700 shadow-md shadow-blue-200/40">
              <Bolt size={16} /> Quick Test
            </a>
            <Link to={"/"} className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2 hover:bg-gray-50">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={topRef} className="relative overflow-hidden">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute -top-20 -right-24 w-80 h-80 bg-gradient-to-tr from-cyan-400/30 to-blue-500/30 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-emerald-300/25 to-cyan-400/25 blur-3xl rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">Zeflash </p>
              <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                ⚡ Zeflash: Rapid AI Diagnostics & Power
              </h1>
              <p className="mt-4 text-gray-700 text-lg">
                Quick 15 mins EV & Battery Test, anytime you charge your EV! With Zeflash, get a precise rapid battery health insight report in minutes, not hours.
              </p>
              <p className="mt-2 text-gray-700">
                Zeflash combines flash-based EV testing at Fast Chargers with ZipsureAI's battery physics-driven AI Deeptech to decode your EV's true performance, aging, and safety condition on the spot.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#book" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-2.5 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200/30">
                  <CheckCircle size={18} /> Book a Zeflash RapidTest
                </a>
                <a href="#demo" className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium px-4 py-2.5 hover:bg-gray-50 shadow-sm">
                  <Play size={18} /> Request a Free Demo
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                    <div className="text-xs text-blue-700 font-semibold">Instant Health Report</div>
                    <div className="text-3xl font-extrabold text-blue-700 mt-1">15 min</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <div className="text-xs text-emerald-700 font-semibold">Accuracy</div>
                    <div className="text-3xl font-extrabold text-emerald-700 mt-1">90%+</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 col-span-2 hover:bg-amber-100 transition-colors">
                    <div className="text-xs text-amber-700 font-semibold">Outputs</div>
                    <div className="mt-2 text-sm text-amber-800">SoP, SoF, Efficiency variance, range loss estimates, and expert recommendations.</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Illustrative metrics. Live values depend on vehicle and session.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is Zeflash */}
      <section id="what" className="py-12 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">What is Zeflash?</h2>
          <p className="mt-4 text-gray-700 max-w-4xl">
            Zeflash Rapid Diagnostics is an advanced EV battery testing platform designed for fast, field-ready health checks. Accurately measuring State of Power (SoP) and State of Function (SoF) at pack levels — helping fleets, garages, and OEMs make instant, confident decisions for servicing, second life repurposing and safe recycling!
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Bolt size={18} /> Rapid Flash Testing</div>
              <p className="mt-2 text-gray-700">Get real-time diagnostic scans that capture your battery's true energy output and internal efficiency — all within minutes.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><ActivityIcon /> Multi-Signal Scanning</div>
              <p className="mt-2 text-gray-700">Go beyond surface readings. Integrates current signals, temperature, impedance and multiple parameters to detect early degradation and unsafe charging.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Cpu size={18} /> AI + Digital Twin Intelligence</div>
              <p className="mt-2 text-gray-700">Physics-based machine learning predicts lifespan, efficiency, and early failure trends with high precision.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Battery size={18} /> Portable Analysis at EV Chargers</div>
              <p className="mt-2 text-gray-700">Compact, rugged, and easy to use — brings lab-grade diagnostics to the charging station.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><Microscope size={18} /> Benchmark & Traceability</div>
              <p className="mt-2 text-gray-700">Benchmarks across chemistries and manufacturers to enable consistent, traceable results for certification and resale.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-blue-700 font-semibold"><FileIcon /> Instant Health Report</div>
              <p className="mt-2 text-gray-700">Clear, visual reports including SoP, SoF, Accuracy %, Efficiency variance, range loss estimate, and recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">How It Works</h2>
          <ol className="space-y-4">
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">1. Locate, Connect & Start:</span> Find Zeflash-enabled EV Chargers, book a session, and start charging — no disassembly required.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">2. Analyze & Detect:</span> Zeflash performs Rapid AI Diagnostics and creates datasets for quick processing.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">3. Report & Recommend:</span> In minutes, AI models process your EV data and generate a detailed Rapid Health report to download.</li>
          </ol>
        </div>
      </section>

      {/* Science */}
      <section id="science" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">The Science Inside</h2>
          <p className="text-gray-700 max-w-4xl">
            Zeflash integrates advanced AI Deeptech for electrochemical modeling, impedance testing, multi-parameter dataset analysis, and machine-learning algorithms. By reading subtle internal responses at each charging cycle, it builds a lifecycle profile — predicting degradation, aging, and thermal risks with above 90% accuracy.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Who It's For</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">EV Fleet Operators:</span> Schedule maintenance, manage warranties, and avoid downtime.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">Service Centers:</span> Diagnose instantly, verify warranty coverage, and improve TAT.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">Second-Life & Recyclers:</span> Verify pack health without dismantling; certify for reuse or recycling.</li>
            <li className="bg-gray-50 border border-gray-200 rounded-xl p-4"><span className="font-semibold">OEMs, Insurance & Manufacturers:</span> On-demand diagnostics and insights for design, passports, insurance and warranties.</li>
          </ul>
        </div>
      </section>

      {/* Why choose */}
      <section id="why" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Why Choose Zeflash: Rapid AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Real-time on-field testing — results in minutes',
              'Lab-grade precision at a nearby EV Charger',
              'Portable and easily accessible for every EV user',
              'Predictive, AI-driven insights for thermal risks',
              'Certified, secure performance reports',
              'See beyond the battery with clear actions'
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 bg-white border border-gray-200 rounded-xl p-4">
                <CheckCircle className="text-emerald-600 mt-0.5" size={18} />
                <span className="text-gray-800 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="book" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">🔋 See Beyond the Battery</h2>
          <p className="mt-2 text-gray-700 max-w-3xl mx-auto">
            Zeflash turns complex battery data into clear, confident action — empowering every EV decision with real-time intelligence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="#book" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-5 py-3 hover:bg-blue-700">
              <Bolt size={18} /> Book a Zeflash RapidTest
            </a>
            <a href="#demo" className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium px-5 py-3 hover:bg-gray-50">
              <Play size={18} /> Request a Free Demo
            </a>
          </div>
        </div>
      </section>

      {/* Bottom mobile CTA */}
      <div className="fixed bottom-3 inset-x-0 px-3 sm:px-6 z-40 md:hidden pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-white/95 backdrop-blur shadow-lg p-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Start a Quick Zeflash Test</div>
          <a href="#book" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-3 py-2">
            <Bolt size={16} /> Quick Test
          </a>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setModalOpen(null)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalOpen === 'privacy' && '🔐 Privacy Policy'}
                  {modalOpen === 'terms' && '📄 Terms of Use'}
                  {modalOpen === 'refund' && '💸 Refund & Cancellation Policy'}
                </h2>
                <button onClick={() => setModalOpen(null)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              
              <div className="px-6 py-6">
                {modalOpen === 'privacy' && (
                  <div className="space-y-6 text-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Personal Information:</strong> Name, contact details, vehicle information.</li>
                        <li><strong>Usage Data:</strong> App usage logs, platform interactions.</li>
                        <li><strong>Telematics Data:</strong> GPS coordinates, battery status, diagnostics from IoT hardware.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">2. How We Use It</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>To operate and improve the platform.</li>
                        <li>To provide you with billing, diagnostics, smart usage alerts, and warranty tracking.</li>
                        <li>To communicate with you, including support and service notifications.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Data Sharing</h3>
                      <p className="mb-2">We may share data with:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Service centers (for diagnostics and repair).</li>
                        <li>Authorized warranty providers.</li>
                        <li>Legal authorities when required by law.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">4. Data Security</h3>
                      <p>We implement administrative, technical, and physical safeguards to protect your data from unauthorized access.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">5. Your Rights</h3>
                      <p className="mb-2">You may:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Access and correct your personal data.</li>
                        <li>Request deletion of your personal data.</li>
                        <li>Opt out of non-essential communications.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">6. Policy Changes</h3>
                      <p>We may update this Policy. Notification will be provided via the app or email. Continued use means you accept the changes.</p>
                    </div>
                  </div>
                )}

                {modalOpen === 'terms' && (
                  <div className="space-y-6 text-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
                      <p>By using the Zeflash app, web dashboard, or hardware services, you agree to these Terms of Use and our Privacy Policy.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">2. License to Use</h3>
                      <p>We grant you a non-exclusive, non-transferable license to access and use the platform solely for managing your EV(s), fleet, or related business operations.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Restrictions</h3>
                      <p className="mb-2">You must not:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Reproduce, distribute, modify, or publicly display content from the platform.</li>
                        <li>Reverse-engineer, decompile, or attempt to derive source code.</li>
                        <li>Use the platform for illegal or unauthorized purposes.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">4. User Responsibilities</h3>
                      <p className="mb-2">You are responsible for:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Maintaining confidentiality of account credentials.</li>
                        <li>Ensuring your use of the platform complies with applicable local laws and regulations.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">5. Warranty</h3>
                      <p>The platform and services are provided "as-is," without any express or implied warranties. Ziptrax Technologies disclaims all warranties, including merchantability or fitness for a particular purpose.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">6. Limitation of Liability</h3>
                      <p>Ziptrax Technologies (and its affiliates) will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">7. Termination</h3>
                      <p>We may suspend or terminate your account and access immediately if you violate these Terms.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">8. Modifications</h3>
                      <p>These Terms may be updated from time to time. Continued use of the platform constitutes acceptance of changes.</p>
                    </div>
                  </div>
                )}

                {modalOpen === 'refund' && (
                  <div className="space-y-6 text-gray-700">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Hardware + Installation</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>All device + installation purchases are final – no refunds.</li>
                        <li>You may cancel your order before it is dispatched for a full refund, minus any processing fee.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Software Subscriptions</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Annual subscriptions may be canceled within 14 days of purchase for a full refund.</li>
                        <li>No refunds are issued after the 14-day period.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Renewal Policy</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Software renewals are automatic. To avoid renewal, cancel at least 7 days before expiry.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">4. How to Request</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>To request a refund or cancellation, contact support at <a href="mailto:support@zeflash.app" className="text-blue-600 hover:underline">support@zeflash.app</a> with your order or subscription ID.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 bg-gradient-to-br from-gray-800 via-gray-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <Zap className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold">Zeflash</h3>
              </div>
              <p className="text-gray-300 text-sm">
                India's leading AI & IoT-driven EV battery diagnostics platform.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#what" className="hover:text-cyan-400 transition-colors">Home</a></li>
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#how" className="hover:text-cyan-400 transition-colors">Coverage</a></li>
                <li><a href="#book" className="hover:text-cyan-400 transition-colors">Get Quote</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setModalOpen('privacy')} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => setModalOpen('terms')} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Terms of Use
                  </button>
                </li>
                <li>
                  <button onClick={() => setModalOpen('refund')} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm underline">
                    Refund & Cancellation Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Details & Contact */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Company Details & Contact</h3>
              <div className="text-gray-300 text-sm space-y-2">
                <p className="font-semibold text-white">Zipbolt Technologies Pvt Ltd</p>
                <p>MGF Metropolis Mall, MG Road,<br />Gurgaon, Haryana – 122002</p>
                <p>Phone: <a href="tel:+918368681769" className="hover:text-cyan-400">+91 83686 81769</a></p>
                <p>Email: <a href="mailto:contact@zeflash.app" className="hover:text-cyan-400">contact@zeflash.app</a></p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Zeflash. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const ActivityIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const FileIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

export default ZeflashLanding;