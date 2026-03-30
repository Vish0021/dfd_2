import { NavLink } from "react-router";
import { Home, ShoppingBag, User } from "lucide-react";
import styles from "./user-bottom-nav.module.css";

const NAV_ITEMS = [
  { to: "/user", label: "Home", icon: Home, end: true },
  { to: "/user/orders", label: "Orders", icon: ShoppingBag, end: false },
  { to: "/user/profile", label: "Profile", icon: User, end: false },
] as const;

export function UserBottomNav() {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ""}`
          }
        >
          <Icon size={22} className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
