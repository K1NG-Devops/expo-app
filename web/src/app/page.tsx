import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .fade-in-delay-1 { animation: fadeIn 0.6s ease-out 0.1s forwards; opacity: 0; }
        .fade-in-delay-2 { animation: fadeIn 0.6s ease-out 0.2s forwards; opacity: 0; }
        .fade-in-delay-3 { animation: fadeIn 0.6s ease-out 0.3s forwards; opacity: 0; }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#1f1f23] px-6 py-5">
        <h1 className="m-0 text-2xl font-bold text-white">EduDash Pro</h1>
        <nav className="flex items-center gap-5">
          <Link href="/sign-in" className="text-white no-underline">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-[#00f5ff] px-4 py-2 font-semibold text-black no-underline"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="fade-in mb-5 text-5xl font-bold leading-tight text-white">
            Educational dashboard for <br />South African preschools
          </h2>
          <p className="fade-in-delay-1 mx-auto mb-10 max-w-[700px] text-[20px] text-gray-400">
            Engage every student, empower every teacher, and connect every parent with AI-enhanced tools built for South Africa.
          </p>
          <div className="fade-in-delay-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-in"
              className="rounded-lg bg-[#00f5ff] px-7 py-3 text-[18px] font-bold text-black no-underline"
            >
              Get started
            </Link>
            <a
              href="https://play.google.com/store/apps/details?id=com.edudashpro"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border-2 border-[#00f5ff] px-7 py-3 text-[18px] font-semibold text-[#00f5ff] no-underline"
            >
              Download app
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#111113] px-6 py-[60px]">
        <div className="mx-auto max-w-[1200px]">
          <h3 className="fade-in-delay-3 mb-[60px] text-center text-3xl font-bold text-white">
            Built for South African education
          </h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-10">
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">🎓 Student-centered</h4>
              <p className="text-gray-400 leading-relaxed">
                Track progress, homework, and achievements with ease. Personalized learning paths powered by AI.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">👨‍🏫 Teacher tools</h4>
              <p className="text-gray-400 leading-relaxed">
                Lesson planning, attendance, grading, and parent communication—all in one place.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">👪 Parent engagement</h4>
              <p className="text-gray-400 leading-relaxed">
                Real-time updates, messaging, and insights into your child's learning journey.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">🇿🇦 Locally relevant</h4>
              <p className="text-gray-400 leading-relaxed">
                Multi-language support (English, Afrikaans, Zulu, Xhosa), ZAR pricing, and South African curriculum alignment.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">🤖 AI-enhanced</h4>
              <p className="text-gray-400 leading-relaxed">
                Generate lessons, grade homework, and analyze progress with child-safe AI tools.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[20px] font-semibold text-white">📱 Mobile-first</h4>
              <p className="text-gray-400 leading-relaxed">
                Works on any device—web, Android, iOS—with offline support for low-connectivity areas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dash AI Section */}
      <section className="bg-[#0a0a0f] px-6 py-20 text-center">
        <div className="mx-auto max-w-[900px]">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-[#00f5ff]">
            Dash AI Assistant
          </span>
          <h3 className="mt-3 mb-5 text-[36px] font-bold text-white">Your Intelligent Teaching Partner</h3>
          <p className="mb-10 text-[18px] text-gray-400">AI-powered tools that understand South African education</p>
          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <div className="mb-3 text-[32px]">🎓</div>
              <h4 className="mb-2 text-[18px] font-semibold text-white">Voice Commands</h4>
              <p className="text-[14px] leading-relaxed text-gray-400">Control with voice in en-ZA, af-ZA, zu-ZA, xh-ZA</p>
            </div>
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <div className="mb-3 text-[32px]">✨</div>
              <h4 className="mb-2 text-[18px] font-semibold text-white">Smart Reports</h4>
              <p className="text-[14px] leading-relaxed text-gray-400">Generate insights and progress analytics</p>
            </div>
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <div className="mb-3 text-[32px]">🧠</div>
              <h4 className="mb-2 text-[18px] font-semibold text-white">AI Insights</h4>
              <p className="text-[14px] leading-relaxed text-gray-400">Actionable child development insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Features */}
      <section className="bg-[#111113] px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <span className="block text-center text-[14px] font-semibold uppercase tracking-wide text-[#00f5ff]">
            Built for Everyone
          </span>
          <h3 className="mb-15 mt-3 text-center text-3xl font-bold text-white">Tailored for Each Role</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
            <div>
              <h4 className="mb-4 text-[20px] font-semibold text-[#00f5ff]">👨‍🏫 For Teachers</h4>
              <ul className="list-disc space-y-1 pl-5 text-gray-400 leading-8">
                <li>AI-powered lesson planning</li>
                <li>Automated grading & feedback</li>
                <li>Real-time progress tracking</li>
                <li>Parent communication tools</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[20px] font-semibold text-[#00f5ff]">👪 For Parents</h4>
              <ul className="list-disc space-y-1 pl-5 text-gray-400 leading-8">
                <li>Daily updates on child progress</li>
                <li>Direct messaging with teachers</li>
                <li>Photo & video sharing</li>
                <li>Event notifications</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[20px] font-semibold text-[#00f5ff]">🏫 For Principals</h4>
              <ul className="list-disc space-y-1 pl-5 text-gray-400 leading-8">
                <li>School-wide insights dashboard</li>
                <li>Teacher performance analytics</li>
                <li>Enrollment management</li>
                <li>Compliance tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0a0a0f] px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <span className="block text-center text-[14px] font-semibold uppercase tracking-wide text-[#00f5ff]">
            Testimonials
          </span>
          <h3 className="mb-[60px] mt-3 text-center text-3xl font-bold text-white">Loved by Educators</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-8">
              <p className="mb-5 text-[16px] italic leading-relaxed text-white">
                "EduDash Pro helped my class improve within weeks."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00f5ff] font-bold text-black">
                  LM
                </div>
                <div>
                  <p className="m-0 text-[14px] font-semibold text-white">Lerato M.</p>
                  <p className="m-0 text-[12px] text-gray-400">Teacher, Johannesburg</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-8">
              <p className="mb-5 text-[16px] italic leading-relaxed text-white">
                "I finally know how my child is doing every day."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00f5ff] font-bold text-black">
                  TK
                </div>
                <div>
                  <p className="m-0 text-[14px] font-semibold text-white">Thabo K.</p>
                  <p className="m-0 text-[12px] text-gray-400">Parent, Pretoria</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#1f1f23] bg-[#111113] p-8">
              <p className="mb-5 text-[16px] italic leading-relaxed text-white">
                "Simplifies admin so I can focus on teaching."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00f5ff] font-bold text-black">
                  MN
                </div>
                <div>
                  <p className="m-0 text-[14px] font-semibold text-white">Ms. Naidoo</p>
                  <p className="m-0 text-[12px] text-gray-400">Principal, Durban East</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="bg-[#111113] px-6 py-20 text-center">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-[#00f5ff]">Pricing</span>
          <h3 className="mt-3 mb-5 text-3xl font-bold text-white">Simple, Transparent Pricing</h3>
          <p className="mb-[60px] text-[18px] text-gray-400">Choose the plan that fits your preschool's needs</p>
          <div className="mx-auto grid max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
            <div className="rounded-xl border border-[#1f1f23] bg-[#0a0a0f] p-8">
              <p className="mb-3 text-[14px] font-semibold uppercase text-gray-400">Free Plan</p>
              <h4 className="mb-1 text-[36px] font-bold text-white">Custom</h4>
              <p className="mb-6 text-[14px] text-gray-400">Contact us</p>
              <ul className="mb-8 list-disc space-y-1 pl-5 text-left text-gray-400 leading-8">
                <li>Basic student management</li>
                <li>Parent communication</li>
                <li>Basic reporting</li>
              </ul>
              <button className="w-full rounded-lg border-2 border-[#00f5ff] px-4 py-3 text-[16px] font-semibold text-[#00f5ff]">
                Contact Sales
              </button>
            </div>
            <div className="relative rounded-xl border-2 border-[#00f5ff] bg-[linear-gradient(135deg,#00f5ff_0%,#0088cc_100%)] p-8">
              <div className="absolute -top-3 right-6 rounded-2xl bg-[#22c55e] px-3 py-1 text-[12px] font-semibold text-white">
                POPULAR
              </div>
              <p className="mb-3 text-[14px] font-semibold uppercase text-black">Parent Starter</p>
              <h4 className="mb-1 text-[36px] font-bold text-black">R49.99</h4>
              <p className="mb-6 text-[14px] text-black">per month</p>
              <ul className="mb-8 list-disc space-y-1 pl-5 text-left text-black leading-8">
                <li>Homework Helper (500/month)</li>
                <li>AI lesson support</li>
                <li>Child-book equivalents</li>
                <li>Progress tracking</li>
              </ul>
              <button className="w-full rounded-lg bg-black px-4 py-3 text-[16px] font-semibold text-white">
                Start Free Trial
              </button>
            </div>
            <div className="rounded-xl border border-[#1f1f23] bg-[#0a0a0f] p-8">
              <p className="mb-3 text-[14px] font-semibold uppercase text-gray-400">Enterprise Plan</p>
              <h4 className="mb-1 text-[36px] font-bold text-white">Custom</h4>
              <p className="mb-6 text-[14px] text-gray-400">per school</p>
              <ul className="mb-8 list-disc space-y-1 pl-5 text-left text-gray-400 leading-8">
                <li>Everything in Premium</li>
                <li>Unlimited team</li>
                <li>Custom integrations</li>
                <li>Advanced security</li>
              </ul>
              <button className="w-full rounded-lg border-2 border-[#00f5ff] px-4 py-3 text-[16px] font-semibold text-[#00f5ff]">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#0a0a0f] px-6 py-20">
        <div className="mx-auto max-w-[900px]">
          <span className="block text-center text-[14px] font-semibold uppercase tracking-wide text-[#00f5ff]">
            FAQ
          </span>
          <h3 className="mb-[60px] mt-3 text-center text-3xl font-bold text-white">
            Frequently Asked Questions
          </h3>
          <div className="flex flex-col gap-6">
            <details className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <summary className="cursor-pointer text-[18px] font-semibold text-white">
                How does the AI assistance work?
              </summary>
              <p className="mt-4 leading-relaxed text-gray-400">
                Dash AI uses Claude to generate lesson plans, grade assignments, and provide insights—all processed securely via our Edge Functions with child-safe guardrails.
              </p>
            </details>
            <details className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <summary className="cursor-pointer text-[18px] font-semibold text-white">
                Is it safe for preschool children?
              </summary>
              <p className="mt-4 leading-relaxed text-gray-400">
                Yes. We comply with COPPA, GDPR, and POPIA. Parental consent is required, minimal data is collected, and child data is never used for AI training or advertising.
              </p>
            </details>
            <details className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <summary className="cursor-pointer text-[18px] font-semibold text-white">
                Do I need technical skills to use it?
              </summary>
              <p className="mt-4 leading-relaxed text-gray-400">
                No. EduDash Pro is designed for educators and parents with no technical background. Simple, intuitive interface with voice control in multiple South African languages.
              </p>
            </details>
            <details className="rounded-xl border border-[#1f1f23] bg-[#111113] p-6">
              <summary className="cursor-pointer text-[18px] font-semibold text-white">
                Can I try before committing?
              </summary>
              <p className="mt-4 leading-relaxed text-gray-400">
                Yes! We offer a free tier and a 14-day trial for premium plans. No credit card required to start.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[linear-gradient(135deg,#00f5ff_0%,#0088cc_100%)] px-6 py-20 text-center">
        <h3 className="mb-5 text-[36px] font-bold text-black">Ready to Transform Your Preschool?</h3>
        <p className="mb-10 text-[18px] text-black/80">
          Join hundreds of educators using EduDash Pro to enhance learning outcomes
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/sign-in"
            className="rounded-lg bg-black px-7 py-3 text-[18px] font-bold text-white no-underline"
          >
            Get Started Free
          </Link>
          <a
            href="https://play.google.com/store/apps/details?id=com.edudashpro"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border-2 border-black px-7 py-3 text-[18px] font-semibold text-black no-underline"
          >
            Download App
          </a>
        </div>
        <p className="mt-6 text-[14px] text-black/70">
          No credit card required • 14-day free trial
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f23] px-6 py-10 text-center text-[#6B7280]">
        <p>© 2025 EduDash Pro. Built for South African preschools.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-5">
          <Link href="/privacy" className="text-[#9CA3AF] no-underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-[#9CA3AF] no-underline">
            Terms of Service
          </Link>
          <Link href="/popia" className="text-[#9CA3AF] no-underline">
            POPIA Compliance
          </Link>
          <a
            href="https://edudashpro.org.za"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9CA3AF] no-underline"
          >
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
