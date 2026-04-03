"use client";

export function StudentsPageStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280;--field-bg:#F9FBFF;--field-text:#0F172A;--field-border:rgba(15,23,42,0.1);--field-border-strong:rgba(79,140,255,0.42);--field-ring:rgba(79,140,255,0.14);--field-shadow:inset 0 1px 0 rgba(255,255,255,0.82);}
      body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
      .layout{display:flex;height:100vh}
      .sidebar{width:200px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(108,74,182,0.1);flex-shrink:0}
      .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
      .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
      .logo-ico svg{width:18px;height:18px;fill:white}
      .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
      .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
      .nav:hover{background:rgba(108,74,182,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
      .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
      .sep{height:1px;background:rgba(108,74,182,0.12);margin:.4rem 0}
      .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
      .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(108,74,182,0.08);flex-shrink:0}
      .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
      .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}

      /* TABS */
      .tabs{display:flex;gap:.4rem;margin-bottom:1rem;background:white;border-radius:13px;padding:.5rem;box-shadow:0 2px 8px rgba(108,74,182,0.07)}
      .tab{flex:1;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .8rem;border-radius:9px;cursor:pointer;font-size:.8rem;font-weight:700;color:var(--gray);transition:all .2s;border:none;background:none;font-family:var(--font-manrope),Segoe UI,sans-serif}
      .tab-ico{display:inline-flex;align-items:center;justify-content:center}
      .tab:hover{background:#F0EEFF;color:var(--p3)}
      .tab.active{background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 4px 12px rgba(108,74,182,0.3)}
      .tab-count{background:rgba(255,255,255,0.25);padding:.1rem .4rem;border-radius:10px;font-size:.7rem}
      .tab:not(.active) .tab-count{background:rgba(108,74,182,0.1);color:var(--p3)}

      /* STATS */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1rem}
      .sc{background:white;border-radius:12px;padding:.8rem 1rem;border:1px solid rgba(108,74,182,0.06);box-shadow:0 2px 8px rgba(108,74,182,0.06)}
      .sc-label{font-size:.7rem;color:var(--gray);font-weight:500}.sc-val{font-size:1rem;font-weight:800;margin-top:.1rem}

      /* TOOLBAR */
      .toolbar{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem;flex-wrap:wrap}
      .srch{position:relative;flex:1;min-width:160px}
      .srch svg{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--gray)}
      .srch input{width:100%;padding:.55rem 2.1rem .55rem .8rem;background:var(--field-bg);border:1px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .srch input:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .filter-sel{padding:.55rem .8rem;background:var(--field-bg);border:1px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .filter-sel:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .btn-add{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-excel{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#D1FAE5;color:#065F46;border:1.5px solid #6EE7B7;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-export{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#DBEAFE;color:#1E40AF;border:1.5px solid #93C5FD;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-print{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#fef3c7;color:#92400e;border:1.5px solid #f59e0b;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}

      /* TABLE */
      .tbl-wrap{background:white;border-radius:13px;border:1px solid rgba(108,74,182,0.06);overflow:hidden;box-shadow:0 2px 8px rgba(108,74,182,0.06)}
      .tbl-mobile-cards{display:none}
      .tbl-mobile-card{display:none}
      table{width:100%;border-collapse:collapse}
      thead{background:#F8F6FF}
      th{padding:.6rem .9rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:left;border-bottom:1px solid rgba(108,74,182,0.08)}
      td{padding:.6rem .9rem;font-size:.78rem;border-bottom:1px solid rgba(108,74,182,0.04)}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:#FAFAFE}
      .badge{display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.66rem;font-weight:700}
      .empty{text-align:center;padding:3rem;color:var(--gray);font-size:.85rem}
      .spin{width:22px;height:22px;border:3px solid rgba(108,74,182,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:2rem auto}
      @keyframes sp{to{transform:rotate(360deg)}}

      /* ACTION MENU */
      .btn-action{padding:.28rem .7rem;background:#EDE8FA;color:var(--p3);border:none;border-radius:7px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer}
      .btn-action:hover{background:#C8B8F0}
      .dropdown-menu{position:fixed;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);border:1px solid rgba(108,74,182,0.1);z-index:9999;min-width:180px;overflow:hidden}
      .d-item{display:flex;align-items:center;gap:.6rem;padding:.62rem 1rem;font-size:.8rem;font-weight:600;cursor:pointer;color:var(--dark);white-space:nowrap}
      .d-item svg{flex-shrink:0}
      .d-item:hover{background:#F8F6FF}
      .d-item.danger{color:#EF4444}.d-item.danger:hover{background:#FEE2E2}
      .d-sep{height:1px;background:rgba(108,74,182,0.08)}

      /* MODALS */
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
      .modal{background:white;border-radius:18px;padding:1.6rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
      .modal-sm{max-width:400px}.modal-lg{max-width:620px}
      .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
      .mt{font-size:1rem;font-weight:800}
      .mc{width:30px;height:30px;border-radius:7px;background:#F3F4F6;border:none;cursor:pointer;font-size:1rem}
      .fg{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      .ff{display:flex;flex-direction:column;gap:.32rem}.ff.full{grid-column:1/-1}
      .fl{font-size:.875rem;font-weight:600}.opt{font-size:.8rem;color:var(--gray);font-weight:400}
      .fi,.fs{padding:.65rem .85rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .fi:focus,.fs:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .fa{display:flex;gap:.7rem;margin-top:1.1rem}
      .bs{flex:1;padding:.75rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bs:disabled{opacity:.65;cursor:not-allowed}
      .bs-danger{flex:1;padding:.75rem;background:#EF4444;color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bc{padding:.75rem 1.2rem;background:#F3F4F6;color:var(--gray);border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
      .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .del-ico{font-size:2.5rem;text-align:center;margin-bottom:.8rem}
      .del-msg{text-align:center;font-size:.88rem;color:var(--gray);margin-bottom:1.2rem;line-height:1.7}
      .upload-area{border:2px dashed rgba(108,74,182,0.3);border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;background:#FAFAFE;margin-bottom:1rem}
      .upload-area:hover{border-color:var(--p3);background:#F0EEFF}
      .upload-area svg{width:36px;height:36px;color:var(--p4);margin-bottom:.5rem}
      .template-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1rem;background:#EDE8FA;color:var(--p3);border:none;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;margin-bottom:1rem}
      .preview-table{width:100%;border-collapse:collapse;font-size:.72rem;margin-bottom:.5rem}
      .preview-table th{background:#F8F6FF;padding:.4rem .6rem;text-align:left;font-weight:700;color:var(--p2);border-bottom:1px solid rgba(108,74,182,0.1)}
      .preview-table td{padding:.4rem .6rem;border-bottom:1px solid rgba(108,74,182,0.05)}
      .cols-info{background:#F0EEFF;border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem}
      .cols-title{font-size:.78rem;font-weight:700;color:var(--p2);margin-bottom:.4rem}
      .cols-grid{display:grid;grid-template-columns:1fr 1fr;gap:.2rem}
      .col-item{font-size:.72rem;display:flex;align-items:center;gap:.3rem}
      @media (max-width: 1080px){
        .stats{grid-template-columns:repeat(2,1fr)}
      }
      @media (max-width: 820px){
        .tabs{flex-wrap:wrap}
        .tab{min-width:calc(50% - .2rem)}
        .stats,.fg,.cols-grid{grid-template-columns:1fr}
        .toolbar,.fa{flex-direction:column;align-items:stretch}
        .srch,.filter-sel,.btn-add,.btn-export,.btn-excel,.btn-print,.bc,.bs,.bs-danger{width:100%}
        .tbl-wrap{overflow:auto}
        th,td{white-space:nowrap}
        .modal,.modal-lg,.modal-sm{max-width:100%}
      }
      @media (max-width: 767px){
        .tbl-wrap{overflow:visible;padding:1rem}
        .tbl-wrap table{display:none}
        .tbl-mobile-cards{display:grid;gap:.85rem}
        .tbl-mobile-card{display:flex;flex-direction:column;gap:.9rem;border:1px solid rgba(108,74,182,0.08);border-radius:16px;background:#fff;padding:1rem;box-shadow:0 10px 24px rgba(108,74,182,0.08)}
        .tbl-mobile-card__header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}
        .tbl-mobile-card__title{padding:0;border:none;background:none;color:var(--p2);font-size:.95rem;font-weight:800;text-align:right;text-decoration:underline;text-underline-offset:3px}
        .tbl-mobile-card__subtitle{margin-top:.3rem;font-size:.8rem;color:var(--gray);line-height:1.6}
        .tbl-mobile-card__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
        .tbl-mobile-card__item{display:flex;flex-direction:column;gap:.22rem;padding:.75rem;border-radius:12px;background:#F8F6FF}
        .tbl-mobile-card__item span{font-size:.8rem;color:var(--gray)}
        .tbl-mobile-card__item strong{font-size:.88rem;color:var(--dark);line-height:1.5}
        .tbl-mobile-card__action{width:100%;justify-content:center;padding:.7rem .9rem}
      }
    `}</style>
  );
}
