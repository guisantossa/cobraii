import React from "react";

const LandingPage = () => (
  <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
    <style>
      {`
      @import url('https://fonts.googleapis.com/css?family=Inter:400,600,700&display=swap');
      :root {
        --primary: #2563eb;
        --primary-dark: #1e40af;
        --secondary: #64748b;
        --bg: #f8fafc;
        --white: #fff;
        --gray: #e5e7eb;
        --shadow: 0 2px 16px rgba(37,99,235,0.07);
      }
      body {
        font-family: 'Inter', Arial, sans-serif;
      }
      header {
        padding: 3rem 1rem 2rem 1rem;
        text-align: center;
        background: var(--white);
        box-shadow: var(--shadow);
      }
      header h1 {
        font-size: 2.2rem;
        color: var(--primary-dark);
        font-weight: 700;
        margin-bottom: 1rem;
      }
      header p {
        font-size: 1.2rem;
        color: var(--secondary);
        max-width: 600px;
        margin: 0 auto;
      }
      .benefits {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 500px;
        margin: 2rem auto;
        background: var(--white);
        border-radius: 1rem;
        box-shadow: var(--shadow);
        padding: 2rem 1.5rem;
      }
      .benefits ul {
        list-style: none;
        font-size: 1.1rem;
        color: var(--primary-dark);
      }
      .benefits li {
        margin-bottom: 0.7rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .plans {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem;
        justify-content: center;
        margin: 2.5rem 0;
      }
      .plan {
        background: var(--white);
        border-radius: 1rem;
        box-shadow: var(--shadow);
        padding: 2rem 1.5rem;
        min-width: 260px;
        flex: 1 1 260px;
        max-width: 320px;
        text-align: center;
        border: 2px solid var(--gray);
        position: relative;
      }
      .plan.pro {
        border-color: var(--primary);
        box-shadow: 0 4px 24px rgba(37,99,235,0.13);
      }
      .plan .plan-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--primary-dark);
        margin-bottom: 0.5rem;
      }
      .plan .plan-price {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 0.5rem;
      }
      .plan .plan-desc {
        color: var(--secondary);
        font-size: 1rem;
        margin-bottom: 1rem;
      }
      .plan .plan-annual {
        font-size: 0.95rem;
        color: var(--primary-dark);
        background: #e0e7ff;
        border-radius: 0.5rem;
        padding: 0.2rem 0.7rem;
        margin-bottom: 0.7rem;
        display: inline-block;
      }
      .plan .plan-highlight {
        position: absolute;
        top: -1.2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary);
        color: var(--white);
        font-size: 0.9rem;
        font-weight: 600;
        border-radius: 1rem;
        padding: 0.3rem 1.2rem;
        box-shadow: 0 2px 8px rgba(37,99,235,0.13);
      }
      .cta-buttons {
        display: flex;
        justify-content: center;
        gap: 1.2rem;
        margin: 2.5rem 0 1.5rem 0;
        flex-wrap: wrap;
      }
      .cta-buttons .btn {
        font-size: 1.1rem;
        font-weight: 600;
        padding: 1rem 2.2rem;
        border: none;
        border-radius: 0.7rem;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        box-shadow: 0 2px 8px rgba(37,99,235,0.09);
      }
      .btn-primary {
        background: var(--primary);
        color: var(--white);
      }
      .btn-primary:hover {
        background: var(--primary-dark);
      }
      .btn-secondary {
        background: var(--gray);
        color: var(--primary-dark);
      }
      .btn-secondary:hover {
        background: #cbd5e1;
      }
      .real-applications {
        max-width: 700px;
        margin: 2.5rem auto 0 auto;
        background: var(--white);
        border-radius: 1rem;
        box-shadow: var(--shadow);
        padding: 2rem 1.5rem;
      }
      .real-applications h2 {
        color: var(--primary-dark);
        font-size: 1.2rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }
      .real-applications ul {
        display: flex;
        flex-wrap: wrap;
        gap: 1.2rem;
        list-style: none;
        font-size: 1.05rem;
        color: var(--secondary);
        padding-left: 0;
      }
      .real-applications li {
        background: var(--bg);
        border-radius: 0.5rem;
        padding: 0.7rem 1.1rem;
        flex: 1 1 220px;
        min-width: 180px;
      }
      .testimonials {
        max-width: 700px;
        margin: 2.5rem auto 0 auto;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        justify-content: center;
      }
      .testimonial {
        background: var(--white);
        border-radius: 1rem;
        box-shadow: var(--shadow);
        padding: 1.2rem 1rem;
        font-size: 1rem;
        color: var(--primary-dark);
        min-width: 220px;
        flex: 1 1 220px;
        max-width: 320px;
        position: relative;
      }
      .testimonial::before {
        content: "“";
        font-size: 2.5rem;
        color: var(--primary);
        position: absolute;
        left: 1rem;
        top: 0.2rem;
        opacity: 0.2;
      }
      .testimonial .author {
        display: block;
        margin-top: 0.8rem;
        color: var(--secondary);
        font-size: 0.95rem;
        font-style: italic;
      }
      footer {
        margin-top: 3rem;
        background: var(--primary-dark);
        color: var(--white);
        text-align: center;
        padding: 1.5rem 1rem;
        font-size: 1.1rem;
        border-radius: 1rem 1rem 0 0;
        letter-spacing: 0.01em;
      }
      @media (max-width: 900px) {
        .plans { flex-direction: column; gap: 1.5rem; }
        .testimonials { flex-direction: column; gap: 1rem; }
      }
      @media (max-width: 600px) {
        header h1 { font-size: 1.3rem; }
        .benefits, .real-applications, .testimonial { padding: 1.2rem 0.7rem; }
        .plans { gap: 1rem; }
        .plan { padding: 1.2rem 0.7rem; }
        .cta-buttons .btn { width: 100%; }
      }
      `}
    </style>
    <header>
      <h1>Chega de gente esquecida atrapalhando seus compromissos</h1>
      <p>
        O Lembrii envia lembretes automáticos para clientes, alunos ou qualquer pessoa. Configure uma vez e nunca mais perca tempo com esquecimentos.
      </p>
    </header>

    <section className="benefits">
      <ul>
        <li>🔔 Lembre clientes de pagamentos e evite calotes</li>
        <li>📅 Confirme consultas e reuniões automaticamente</li>
        <li>💬 Mensagens enviadas por WhatsApp, SMS e e-mail</li>
        <li>⏰ Configure em segundos, esqueça o resto</li>
        <li>💸 Mais barato que perder uma venda</li>
      </ul>
    </section>

    <section className="plans">
      <div className="plan">
        <div className="plan-title">Free Tier</div>
        <div className="plan-price">Grátis</div>
        <div className="plan-desc">2 meses grátis<br />até 2 lembretes</div>
      </div>
      <div className="plan">
        <div className="plan-title">Plano Start</div>
        <div className="plan-price">
          R$ 6,99 <span style={{ fontSize: "1rem", fontWeight: 400 }}>/mês</span>
        </div>
        <div className="plan-annual">
          ou R$ 4,99/mês no anual <span style={{ color: "#059669", fontWeight: 600 }}>(30% OFF)</span>
        </div>
        <div className="plan-desc">até 10 lembretes</div>
      </div>
      <div className="plan pro">
        <div className="plan-highlight">Mais Popular</div>
        <div className="plan-title">Plano Pro</div>
        <div className="plan-price">
          R$ 12,99 <span style={{ fontSize: "1rem", fontWeight: 400 }}>/mês</span>
        </div>
        <div className="plan-annual">
          ou R$ 9,99/mês no anual <span style={{ color: "#059669", fontWeight: 600 }}>(23% OFF)</span>
        </div>
        <div className="plan-desc">lembretes ilimitados</div>
      </div>
    </section>

    <div className="cta-buttons">
      <button className="btn btn-primary">Crie seu lembrete grátis agora</button>
      <button className="btn btn-secondary">Conhecer planos</button>
    </div>

    <section className="real-applications">
      <h2>Exemplos práticos de uso:</h2>
      <ul>
        <li>Cobrar clientes de serviços</li>
        <li>Confirmar consultas médicas</li>
        <li>Lembrar de pagamentos de aluguel</li>
        <li>Confirmar presença em eventos</li>
        <li>Avisar sobre prazos de documentos</li>
      </ul>
    </section>

    <section className="testimonials">
      <div className="testimonial">
        Recuperei 3 clientes que sempre esqueciam de pagar!
        <span className="author">– João, autônomo</span>
      </div>
      <div className="testimonial">
        Meus pacientes nunca mais faltaram sem avisar.
        <span className="author">– Dra. Carla, dentista</span>
      </div>
      <div className="testimonial">
        Automatizei cobranças do aluguel e parei de correr atrás de inquilino.
        <span className="author">– Marcos, proprietário</span>
      </div>
    </section>

    <footer>
      Seguro, simples e automático. O Lembrii trabalha enquanto você vive.
    </footer>
  </div>
);

export default LandingPage;