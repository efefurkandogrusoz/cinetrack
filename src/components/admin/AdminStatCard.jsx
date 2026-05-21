const AdminStatCard = ({ icon: Icon, label, value, hint }) => (
  <article className="admin-stat-card">
    {Icon && <Icon size={20} aria-hidden="true" />}
    <span>{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </article>
);

export default AdminStatCard;
