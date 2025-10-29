"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div style={{minHeight: '100vh', background: '#0a0a0f', color: 'var(--text)'}}>
      {/* Sticky Navigation */}
      <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="brand" style={{fontSize: '18px', fontWeight: 700}}>🎓 EduDash Pro</div>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 0, color: '#fff', cursor: 'pointer', fontSize: '24px', padding: '8px' }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          
          {/* Desktop Navigation */}
          <nav style={{display: 'flex', alignItems: 'center', gap: '28px'}} className="desktop-nav">
            <button onClick={() => scrollToSection('features')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s'}}>Features</button>
            <button onClick={() => scrollToSection('dash-ai')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s'}}>Dash AI</button>
            <button onClick={() => scrollToSection('pricing')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s'}}>Pricing</button>
            <button onClick={() => scrollToSection('faq')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s'}}>FAQ</button>
            <Link href="/sign-in" style={{color: '#00f5ff', textDecoration: 'none', fontSize: '14px', fontWeight: 600}}>Sign In</Link>
            <Link href="/sign-in" className="btn btnCyan" style={{fontSize: '14px', padding: '8px 18px', borderRadius: '8px'}}>Get Started</Link>
          </nav>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu" style={{ background: 'rgba(10, 10, 15, 0.98)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={() => scrollToSection('features')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '16px', fontWeight: 500, textAlign: 'left', padding: '8px 0'}}>Features</button>
              <button onClick={() => scrollToSection('dash-ai')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '16px', fontWeight: 500, textAlign: 'left', padding: '8px 0'}}>Dash AI</button>
              <button onClick={() => scrollToSection('pricing')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '16px', fontWeight: 500, textAlign: 'left', padding: '8px 0'}}>Pricing</button>
              <button onClick={() => scrollToSection('faq')} style={{background: 'none', border: 0, color: '#9CA3AF', cursor: 'pointer', fontSize: '16px', fontWeight: 500, textAlign: 'left', padding: '8px 0'}}>FAQ</button>
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link href="/sign-in" style={{color: '#00f5ff', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '12px', textAlign: 'center', border: '1px solid #00f5ff', borderRadius: '8px'}}>Sign In</Link>
                <Link href="/sign-in" className="btn btnCyan" style={{fontSize: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', display: 'block'}}>Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </header>
      
      <style jsx global>{`
        /* Prevent horizontal scroll */
        body, html {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        /* Navigation hover effects */
        nav button:hover {
          color: #00f5ff !important;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .landingHero {
            padding-top: 40px !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
        
        /* Smooth transitions */
        header {
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Hero */}
      <section className="landingHero" style={{paddingTop: '60px'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <div style={{marginBottom: '16px'}}>
            <span className="pillCyan" style={{fontSize: '11px'}}>🇿🇦 Built for South Africa</span>
          </div>
          <h1 className="heroTitle">
            Educational dashboard for <br />
            <span className="accent">South African preschools</span>
          </h1>
          <p className="heroLead">
            Engage every student, empower every teacher, and connect every parent with <strong style={{color: 'var(--cyan)'}}>AI-enhanced tools</strong> built for South Africa.
          </p>
          <div className="heroCtas">
            <Link href="/sign-in" className="btn btnCyan" style={{height: '48px', padding: '0 28px', fontSize: '16px', borderRadius: '12px'}}>Get started →</Link>
            <a href="https://play.google.com/store/apps/details?id=com.edudashpro" target="_blank" rel="noopener noreferrer" className="btn btnOutlineCyan" style={{height: '48px', padding: '0 28px', fontSize: '16px', borderRadius: '12px'}}>Download app</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-section alt">
        <div className="container">
          <div className="sectionHeader">
            <span className="kicker" style={{color: 'var(--cyan)'}}>Features</span>
            <h2 style={{fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginTop: '8px'}}>Built for South African education</h2>
          </div>
          <div className="featureGrid">
            <div className="featureCard">
              <div className="featureIcon">🎓</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Student-centered</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Track progress, homework, and achievements with ease. Personalized learning paths powered by AI.</p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">👨‍🏫</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Teacher tools</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Lesson planning, attendance, grading, and parent communication—all in one place.</p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">👪</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Parent engagement</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Real-time updates, messaging, and insights into your child's learning journey.</p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">🇿🇦</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Locally relevant</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Multi-language support (English, Afrikaans, Zulu, Xhosa), ZAR pricing, and South African curriculum alignment.</p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">🤖</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>AI-enhanced</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Generate lessons, grade homework, and analyze progress with child-safe AI tools.</p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">📱</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Mobile-first</h3>
              <p className="muted" style={{fontSize: '14px', lineHeight: 1.6}}>Works on any device—web, Android, iOS—with offline support for low-connectivity areas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dash AI Section */}
      <section id="dash-ai" className="lp-section" style={{background: 'radial-gradient(circle at 50% 50%, rgba(0,245,255,.1), transparent 60%)'}}>
        <div className="container" style={{textAlign: 'center', maxWidth: '900px'}}>
          <span className="pillCyan">🤖 Dash AI Assistant</span>
          <h2 style={{fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, margin: '16px 0'}}>Your Intelligent Teaching Partner</h2>
          <p className="muted" style={{fontSize: '18px', marginBottom: '40px'}}>AI-powered tools that understand South African education</p>
          <div className="aiGrid">
            <div className="aiCard">
              <div style={{fontSize: '40px', marginBottom: '12px'}}>🎓</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Voice Commands</h3>
              <p className="muted" style={{fontSize: '13px'}}>Control with voice in en-ZA, af-ZA, zu-ZA, xh-ZA</p>
            </div>
            <div className="aiCard">
              <div style={{fontSize: '40px', marginBottom: '12px'}}>✨</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>Smart Reports</h3>
              <p className="muted" style={{fontSize: '13px'}}>Generate insights and progress analytics</p>
            </div>
            <div className="aiCard">
              <div style={{fontSize: '40px', marginBottom: '12px'}}>🧠</div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px'}}>AI Insights</h3>
              <p className="muted" style={{fontSize: '13px'}}>Actionable child development insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Features */}
      <section className="lp-section alt">
        <div className="container">
          <div className="sectionHeader">
            <span className="kicker" style={{color: 'var(--cyan)'}}>Built for Everyone</span>
            <h2 style={{fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, marginTop: '8px'}}>Tailored for Each Role</h2>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px'}}>
            <div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--cyan)'}}>👨‍🏫 For Teachers</h3>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', color: 'var(--muted)', lineHeight: '2'}}>
                <li>AI-powered lesson planning</li>
                <li>Automated grading & feedback</li>
                <li>Real-time progress tracking</li>
                <li>Parent communication tools</li>
              </ul>
            </div>
            <div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--cyan)'}}>👪 For Parents</h3>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', color: 'var(--muted)', lineHeight: '2'}}>
                <li>Daily updates on child progress</li>
                <li>Direct messaging with teachers</li>
                <li>Photo & video sharing</li>
                <li>Event notifications</li>
              </ul>
            </div>
            <div>
              <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--cyan)'}}>🏫 For Principals</h3>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', color: 'var(--muted)', lineHeight: '2'}}>
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
      <section className="lp-section">
        <div className="container">
          <div className="sectionHeader">
            <span className="kicker" style={{color: 'var(--cyan)'}}>Testimonials</span>
            <h2 style={{fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, marginTop: '8px'}}>Loved by Educators</h2>
          </div>
          <div className="testimonialsGrid">
            <div className="testimonialCard">
              <p style={{fontSize: '16px', fontStyle: 'italic', marginBottom: '20px', lineHeight: 1.6}}>
                "EduDash Pro helped my class improve within weeks."
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a0a0f'}}>
                  LM
                </div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: 600}}>Lerato M.</p>
                  <p className="muted" style={{margin: 0, fontSize: '12px'}}>Teacher, Johannesburg</p>
                </div>
              </div>
            </div>
            <div className="testimonialCard">
              <p style={{fontSize: '16px', fontStyle: 'italic', marginBottom: '20px', lineHeight: 1.6}}>
                "I finally know how my child is doing every day."
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a0a0f'}}>
                  TK
                </div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: 600}}>Thabo K.</p>
                  <p className="muted" style={{margin: 0, fontSize: '12px'}}>Parent, Pretoria</p>
                </div>
              </div>
            </div>
            <div className="testimonialCard">
              <p style={{fontSize: '16px', fontStyle: 'italic', marginBottom: '20px', lineHeight: 1.6}}>
                "Simplifies admin so I can focus on teaching."
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a0a0f'}}>
                  MN
                </div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: 600}}>Ms. Naidoo</p>
                  <p className="muted" style={{margin: 0, fontSize: '12px'}}>Principal, Durban East</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="lp-section alt" style={{textAlign: 'center'}}>
        <div className="container">
          <div className="sectionHeader">
            <span className="kicker" style={{color: 'var(--cyan)'}}>Pricing</span>
            <h2 style={{fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, marginTop: '8px'}}>Simple, Transparent Pricing</h2>
            <p className="muted" style={{fontSize: '16px', marginTop: '12px'}}>Choose the plan that fits your preschool's needs</p>
          </div>
          <div className="pricingGrid">
            <div className="pricingCard">
              <p className="kicker" style={{marginBottom: '12px', fontSize: '11px'}}>Free Plan</p>
              <h3 style={{fontSize: '36px', fontWeight: 800, marginBottom: '4px'}}>R0</h3>
              <p className="muted" style={{fontSize: '13px', marginBottom: '24px'}}>forever</p>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', textAlign: 'left', color: 'var(--muted)', marginBottom: '32px', lineHeight: '2'}}>
                <li>Basic student management</li>
                <li>Parent communication</li>
                <li>Basic reporting</li>
              </ul>
              <button className="btn btnOutlineCyan" style={{width: '100%', fontSize: '14px'}}>Get Started</button>
            </div>
            <div className="pricingCard highlight" style={{position: 'relative'}}>
              <div style={{position: 'absolute', top: '-12px', right: '24px', background: '#22c55e', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 700}}>POPULAR</div>
              <p style={{marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em'}}>Parent Starter</p>
              <h3 style={{fontSize: '36px', fontWeight: 800, marginBottom: '4px', color: '#0a0a0f'}}>R49.99</h3>
              <p style={{fontSize: '13px', marginBottom: '24px', color: '#0a0a0f'}}>per month</p>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', textAlign: 'left', color: '#0a0a0f', marginBottom: '32px', lineHeight: '2'}}>
                <li>Homework Helper (500/month)</li>
                <li>AI lesson support</li>
                <li>Child-book equivalents</li>
                <li>Progress tracking</li>
              </ul>
              <button className="btn" style={{width: '100%', fontSize: '14px', background: '#0a0a0f', color: '#fff'}}>Start Free Trial</button>
            </div>
            <div className="pricingCard">
              <p className="kicker" style={{marginBottom: '12px', fontSize: '11px'}}>Enterprise Plan</p>
              <h3 style={{fontSize: '36px', fontWeight: 800, marginBottom: '4px'}}>Custom</h3>
              <p className="muted" style={{fontSize: '13px', marginBottom: '24px'}}>per school</p>
              <ul style={{listStyleType: 'disc', paddingLeft: '20px', textAlign: 'left', color: 'var(--muted)', marginBottom: '32px', lineHeight: '2'}}>
                <li>Everything in Premium</li>
                <li>Unlimited team</li>
                <li>Custom integrations</li>
                <li>Advanced security</li>
              </ul>
              <button className="btn btnOutlineCyan" style={{width: '100%', fontSize: '14px'}}>Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-section">
        <div className="container" style={{maxWidth: '900px'}}>
          <div className="sectionHeader">
            <span className="kicker" style={{color: 'var(--cyan)'}}>FAQ</span>
            <h2 style={{fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, marginTop: '8px'}}>Frequently Asked Questions</h2>
          </div>
          <div className="faqGroup" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <details>
              <summary style={{fontSize: '16px', fontWeight: 700}}>How does the AI assistance work?</summary>
              <p className="muted" style={{marginTop: '16px', lineHeight: 1.6, fontSize: '14px'}}>
                Dash AI uses Claude to generate lesson plans, grade assignments, and provide insights—all processed securely via our Edge Functions with child-safe guardrails.
              </p>
            </details>
            <details>
              <summary style={{fontSize: '16px', fontWeight: 700}}>Is it safe for preschool children?</summary>
              <p className="muted" style={{marginTop: '16px', lineHeight: 1.6, fontSize: '14px'}}>
                Yes. We comply with COPPA, GDPR, and POPIA. Parental consent is required, minimal data is collected, and child data is never used for AI training or advertising.
              </p>
            </details>
            <details>
              <summary style={{fontSize: '16px', fontWeight: 700}}>Do I need technical skills to use it?</summary>
              <p className="muted" style={{marginTop: '16px', lineHeight: 1.6, fontSize: '14px'}}>
                No. EduDash Pro is designed for educators and parents with no technical background. Simple, intuitive interface with voice control in multiple South African languages.
              </p>
            </details>
            <details>
              <summary style={{fontSize: '16px', fontWeight: 700}}>Can I try before committing?</summary>
              <p className="muted" style={{marginTop: '16px', lineHeight: 1.6, fontSize: '14px'}}>
                Yes! We offer a free tier and a 14-day trial for premium plans. No credit card required to start.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta">
        <div className="dots"></div>
        <div className="inner container">
          <h2 style={{fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: '16px', color: '#0a0a0f'}}>Ready to Transform Your Preschool?</h2>
          <p style={{fontSize: '18px', marginBottom: '32px', color: 'rgba(10,10,15,.75)', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto'}}>
            Join hundreds of educators using EduDash Pro to enhance learning outcomes
          </p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link href="/sign-in" className="btn" style={{background: '#0a0a0f', color: '#fff', height: '48px', padding: '0 28px', borderRadius: '12px', fontSize: '16px'}}>Get Started Free →</Link>
            <a href="https://play.google.com/store/apps/details?id=com.edudashpro" target="_blank" rel="noopener noreferrer" className="btn" style={{background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)', color: '#0a0a0f', border: '2px solid #0a0a0f', height: '48px', padding: '0 28px', borderRadius: '12px', fontSize: '16px'}}>Download App</a>
          </div>
          <p style={{marginTop: '24px', fontSize: '13px', color: 'rgba(10,10,15,.6)'}}>✅ No credit card required • 🎉 14-day free trial • ⭐ Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop: '1px solid var(--border)', background: '#0a0a0f', padding: '48px 24px', textAlign: 'center'}}>
        <div className="container" style={{maxWidth: '1200px'}}>
          <div style={{marginBottom: '24px'}}>
            <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>🎓 <span style={{color: 'var(--cyan)'}}>EduDash Pro</span></h3>
            <p className="muted" style={{fontSize: '13px'}}>Built with ❤️ for South African preschools</p>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', marginBottom: '32px'}}>
            <Link href="/privacy" className="muted" style={{fontSize: '14px'}}>Privacy Policy</Link>
            <Link href="/terms" className="muted" style={{fontSize: '14px'}}>Terms of Service</Link>
            <Link href="/popia" className="muted" style={{fontSize: '14px'}}>POPIA Compliance</Link>
            <a href="https://edudashpro.org.za" target="_blank" rel="noopener noreferrer" className="muted" style={{fontSize: '14px'}}>Contact</a>
          </div>
          <div style={{borderTop: '1px solid var(--border)', paddingTop: '24px'}}>
            <p style={{color: '#6B7280', fontSize: '13px'}}>© 2025 EduDash Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
