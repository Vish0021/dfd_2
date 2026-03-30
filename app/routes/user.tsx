import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "~/hooks/use-auth";
import { UserBottomNav } from "~/components/user-bottom-nav/user-bottom-nav";
import styles from "./user.module.css";

export default function UserLayout() {
  const { firebaseUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      navigate("/login", { replace: true });
    }
  }, [firebaseUser, loading, navigate]);

  if (loading) return null;

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <UserBottomNav />
    </div>
  );
}
