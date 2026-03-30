import { Search, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "~/hooks/use-auth";
import { useLocationStore } from "~/hooks/use-location";
import { useActiveStores } from "~/hooks/use-active-stores";
import { StoreListCard } from "~/components/store-list-card/store-list-card";
import type { StoreType } from "~/lib/firebase/schema";
import { updateUser } from "~/lib/firebase/services/users.service";
import styles from "./user.home.module.css";

const STORE_TYPE_FILTERS: { id: StoreType | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "🏪" },
  { id: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { id: "grocery", label: "Grocery", emoji: "🛒" },
];

export default function UserHome() {
  const { profile } = useAuth();
  const { stores, loading, error } = useActiveStores();
  const { label, address, detectLocation, isDetecting } = useLocationStore();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StoreType | "all">("all");
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    if (showLocationModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [showLocationModal]);

  const firstName = profile?.name?.split(" ")[0] ?? "there";

  const filtered = stores.filter((s) => {
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.greetingHeader}>
            <p className={styles.greeting}>Delivering to {label} <span className={styles.arrowDown}>▼</span></p>
            <button 
              className={styles.locationBtn}
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin size={16} className={styles.locationIcon} />
              <span className={styles.locationText}>{address}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={17} className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Search stores..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Filter chips */}
      <div className={styles.filters}>
        {STORE_TYPE_FILTERS.map(({ id, label, emoji }) => (
          <button
            key={id}
            className={`${styles.chip} ${typeFilter === id ? styles.chipActive : ""}`}
            onClick={() => setTypeFilter(id as StoreType | "all")}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Store list */}
      <main className={styles.main}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {typeFilter === "all" ? "All Stores" : STORE_TYPE_FILTERS.find((f) => f.id === typeFilter)?.label}
          </h2>
          {!loading && <span className={styles.count}>{filtered.length} open</span>}
        </div>

        {loading && (
          <div className={styles.storeList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏪</span>
            <p>No stores found</p>
            <span>Try adjusting your search or filters</span>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.storeList}>
            {filtered.map((store) => (
              <StoreListCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </main>

      {/* Location Bottom Sheet / Modal Simulation */}
      {showLocationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLocationModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Select a Location</h3>
              <button onClick={() => setShowLocationModal(false)}>✕</button>
            </div>
            
            <button 
              className={styles.detectLocationBtn}
              onClick={async () => {
                await detectLocation();
                const newLoc = useLocationStore.getState();
                if (profile?.uid && newLoc.address) {
                  await updateUser(profile.uid, { location: { label: newLoc.label, address: newLoc.address, lat: newLoc.lat, lng: newLoc.lng } }).catch(e => console.error(e));
                }
                setShowLocationModal(false);
              }}
              disabled={isDetecting}
            >
              <MapPin size={18} />
              <div className={styles.detectText}>
                <strong>{isDetecting ? "Detecting GPS..." : "Use Current Location"}</strong>
                <span>Using GPS accuracy</span>
              </div>
            </button>

            <div className={styles.savedAddresses}>
              <h4 className={styles.sectionTitle}>Saved Addresses</h4>
              {profile?.addresses?.length ? profile.addresses.map((addr) => (
                <button 
                  key={addr.id} 
                  className={styles.addressRow}
                  onClick={async () => {
                    const locData = {
                      label: addr.label,
                      address: `${addr.house}, ${addr.street}, ${addr.area}, ${addr.city} ${addr.pincode}`,
                      lat: 0,
                      lng: 0,
                    };
                    useLocationStore.getState().setLocation(locData);
                    if (profile?.uid) {
                      await updateUser(profile.uid, { location: locData }).catch(e => console.error(e));
                    }
                    setShowLocationModal(false);
                  }}
                >
                  <MapPin size={16} />
                  <div>
                    <strong>{addr.label}</strong>
                    <span>{addr.house}, {addr.street}, {addr.area}</span>
                  </div>
                </button>
              )) : (
                <div className={styles.emptyAddresses}>
                  <p>No saved addresses.</p>
                  <span>Add one in your profile.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
