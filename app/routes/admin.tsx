import { Outlet, NavLink, useNavigate } from "react-router";
import { useAuth } from "~/hooks/use-auth";
import { useEffect, useState } from "react";
import { LayoutDashboard, Store, Package, ClipboardList, LogOut, Menu, X } from "lucide-react";
import { useAdminNotifications } from "~/hooks/use-admin-notifications";
import styles from "./admin.module.css";

export default function AdminLayout() {
  const { profile, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mount real-time alerts
  useAdminNotifications();

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.spinner} />
        <p>Loading…</p>
      </div>
    );
  }

  if (profile?.role !== "admin") return null;

  const navItems = [
    { to: "/admin/orders", icon: <ClipboardList size={18} />, label: "Orders" },
    { to: "/admin/stores", icon: <Store size={18} />, label: "Stores" },
    { to: "/admin/items", icon: <Package size={18} />, label: "Items" },
  ];

  function NavContent() {
    return (
      <>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ""}`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className={styles.logoutBtn}
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </>
    );
  }

  return (
    <div className={styles.shell}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <LayoutDashboard size={22} />
          <span>DFD Admin</span>
        </div>
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <header className={styles.mobileHeader}>
        <div className={styles.brand}>
          <LayoutDashboard size={20} />
          <span>DFD Admin</span>
        </div>
        <button
          className={styles.menuBtn}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <NavContent />
        </div>
      )}

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
