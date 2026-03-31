/** Shared scoped styles for school module pages (RTL, matches the active student-facing modules). */
export const SCHOOL_MODULE_CSS = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#255EA8;--p3:#4F8CFF;--p4:#79D7FF;--bg:#EEF4FB;--dark:#16324F;--gray:#6B7280;}
      body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
      .layout{display:flex;height:100vh}
      .sidebar{width:200px;background:linear-gradient(180deg,#EDF6FF,#DDEAFB);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(79,140,255,0.1);flex-shrink:0}
      .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
      .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
      .nav:hover{background:rgba(79,140,255,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
      .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
      .sep{height:1px;background:rgba(79,140,255,0.12);margin:.4rem 0}
      .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
      .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(79,140,255,0.08);flex-shrink:0;gap:.75rem;flex-wrap:wrap}
      .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
      .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}
      .toolbar{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem;flex-wrap:wrap}
      .srch{position:relative;flex:1;min-width:160px}
      .srch input{width:100%;padding:.55rem .8rem;background:white;border:1px solid rgba(79,140,255,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none}
      .srch input:focus{border-color:var(--p3)}
      .filter-sel{padding:.55rem .8rem;background:white;border:1px solid rgba(79,140,255,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;outline:none;color:var(--dark)}
      .btn-add{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-linkish{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#EDF6FF;color:var(--p3);border:1.5px solid rgba(79,140,255,0.22);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;text-decoration:none}
      .tbl-wrap{background:white;border-radius:13px;border:1px solid rgba(79,140,255,0.06);overflow:hidden;box-shadow:0 2px 8px rgba(79,140,255,0.06)}
      table{width:100%;border-collapse:collapse}
      thead{background:#F7FBFF}
      th{padding:.6rem .9rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:right;border-bottom:1px solid rgba(79,140,255,0.08)}
      td{padding:.6rem .9rem;font-size:.78rem;border-bottom:1px solid rgba(79,140,255,0.04);text-align:right}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:#F8FBFF}
      .empty{text-align:center;padding:3rem;color:var(--gray);font-size:.85rem}
      .spin{width:22px;height:22px;border:3px solid rgba(79,140,255,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:2rem auto}
      @keyframes sp{to{transform:rotate(360deg)}}
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
      .modal{background:white;border-radius:18px;padding:1.6rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
      .modal-lg{max-width:640px}
      .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
      .mt{font-size:1rem;font-weight:800}
      .mc{width:30px;height:30px;border-radius:7px;background:#F3F4F6;border:none;cursor:pointer;font-size:1rem}
      .fg{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      .ff{display:flex;flex-direction:column;gap:.32rem}.ff.full{grid-column:1/-1}
      .fl{font-size:.76rem;font-weight:600}
      .fi,.fs{padding:.65rem .85rem;background:#F7FBFF;border:1.5px solid rgba(79,140,255,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;width:100%}
      .fi:focus,.fs:focus{border-color:var(--p3);background:white}
      .fa{display:flex;gap:.7rem;margin-top:1.1rem}
      .bs{flex:1;padding:.75rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bs:disabled{opacity:.65;cursor:not-allowed}
      .bs-danger{flex:1;padding:.75rem;background:#EF4444;color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bc{padding:.75rem 1.2rem;background:#F3F4F6;color:var(--gray);border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
      .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .pager{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:1rem;flex-wrap:wrap;padding:.5rem}
      .pager button{padding:.4rem .75rem;border-radius:8px;border:1px solid rgba(79,140,255,0.18);background:white;cursor:pointer;font-size:.78rem;font-weight:600;font-family:inherit}
      .pager button:disabled{opacity:.5;cursor:not-allowed}
      .pager-info{font-size:.75rem;color:var(--gray)}
      .subgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.75rem;margin-bottom:1rem}
      .card{background:white;border-radius:12px;padding:1rem;border:1px solid rgba(79,140,255,0.08);box-shadow:0 2px 8px rgba(79,140,255,0.06)}
      .card h3{font-size:.85rem;margin-bottom:.35rem}
      .muted{font-size:.72rem;color:var(--gray)}
      .tabs-mini{display:flex;gap:.35rem;margin-bottom:.75rem;flex-wrap:wrap}
      .tab-mini{padding:.35rem .75rem;border-radius:8px;border:1px solid rgba(79,140,255,0.15);background:white;cursor:pointer;font-size:.75rem;font-weight:600}
      .tab-mini.on{background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border-color:transparent}

      /* ── Breadcrumb ──────────────────────────────────────────────────────── */
      .bc-nav{display:flex;align-items:center;gap:.25rem;flex-wrap:wrap;margin-bottom:.5rem}
      .bc-item{display:inline-flex;align-items:center;gap:.25rem}
      .bc-sep{color:var(--gray);font-size:.8rem;opacity:.6}
      .bc-link{font-size:.72rem;color:var(--p2);text-decoration:none;opacity:.75;transition:opacity .15s}
      .bc-link:hover{opacity:1;text-decoration:underline}
      .bc-current{font-size:.72rem;color:var(--gray);font-weight:600}

      /* ── Dark Mode Overrides ─────────────────────────────────────────────── */
      html.dark .tbl-wrap{background:var(--surface-strong);border-color:var(--border)}
      html.dark thead{background:var(--surface-soft)}
      html.dark th{color:var(--text-secondary);border-color:var(--border)}
      html.dark td{border-color:var(--border);color:var(--text-primary)}
      html.dark tr:hover td{background:rgba(118,169,255,0.06)}
      html.dark .topbar{background:var(--surface);border-color:var(--border)}
      html.dark .srch input{background:var(--surface-soft);border-color:var(--border);color:var(--text-primary)}
      html.dark .srch input:focus{border-color:var(--p3);background:var(--surface-strong)}
      html.dark .filter-sel{background:var(--surface-soft);border-color:var(--border);color:var(--text-primary)}
      html.dark .fi,html.dark .fs{background:var(--surface-soft);border-color:var(--border);color:var(--text-primary)}
      html.dark .fi:focus,html.dark .fs:focus{background:var(--surface-strong);border-color:var(--p3)}
      html.dark .pager button{background:var(--surface-strong);border-color:var(--border);color:var(--text-primary)}
      html.dark .pager button:hover:not(:disabled){background:var(--surface-soft)}
      html.dark .modal{background:var(--surface-strong);border:1px solid var(--border-strong)}
      html.dark .mc{background:var(--surface-soft);color:var(--text-secondary)}
      html.dark .bc{background:var(--surface-soft);color:var(--text-secondary)}
      html.dark .ok{background:rgba(53,197,138,0.14);color:#35c58a;border-color:rgba(53,197,138,0.28)}
      html.dark .err{background:rgba(240,90,90,0.14);color:#ff7272;border-color:rgba(240,90,90,0.28)}
      html.dark .card{background:var(--surface-strong);border-color:var(--border)}
      html.dark .tab-mini{background:var(--surface-strong);border-color:var(--border);color:var(--text-secondary)}
      html.dark .bc-link{color:var(--p3)}
      html.dark .btn-linkish{background:var(--surface-soft);color:var(--p3);border-color:rgba(118,169,255,0.22)}
      html.dark .btn-linkish:hover{background:var(--surface-strong)}
      html.dark .fee-btn-outline{background:var(--surface-soft);border-color:var(--p4)}
      html.dark .fee-btn-outline:hover{background:var(--surface-strong)}
      html.dark .ov-card{background:rgba(240,90,90,0.12);border-color:rgba(240,90,90,0.22)}
      html.dark .paid-badge{background:rgba(53,197,138,0.16);color:#35c58a}
`;
