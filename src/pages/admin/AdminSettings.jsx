import { ShieldCheck } from 'lucide-react';

const AdminSettings = () => (
  <div className="admin-section">
    <div className="admin-section-head">
      <div>
        <p className="eyebrow">Sistem</p>
        <h2>Ayarlar</h2>
      </div>
      <span className="admin-count-pill">
        <ShieldCheck size={15} aria-hidden="true" />
        Güvenli
      </span>
    </div>

    <div className="admin-grid-two">
      <section className="admin-panel-card">
        <h3>Firestore Koleksiyonları</h3>
        <div className="admin-rule-list">
          <span>announcements</span>
          <span>notifications</span>
          <span>bannedWords</span>
          <span>heroBanners</span>
        </div>
      </section>
      <section className="admin-panel-card">
        <h3>Rol ve Hesap Kontrolü</h3>
        <p className="admin-muted">
          Admin erişimi users koleksiyonundaki role: admin alanına ve aktif hesap kontrolüne bağlıdır.
          Pasif hesaplar admin paneline ve korumalı verilere erişemez.
        </p>
      </section>
    </div>
  </div>
);

export default AdminSettings;
