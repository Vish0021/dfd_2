import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAdminStores } from "~/hooks/use-admin-stores";
import type { DFDStore, StoreType } from "~/lib/firebase/schema";
import styles from "./admin.stores.module.css";

interface StoreFormValues {
  name: string;
  type: StoreType;
  taxPercentage: string;
}

const DEFAULT_FORM: StoreFormValues = { name: "", type: "restaurant", taxPercentage: "5" };

export default function AdminStores() {
  const { stores, loading, error, create, update, remove, toggleActive } = useAdminStores();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DFDStore | null>(null);
  const [form, setForm] = useState<StoreFormValues>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(store: DFDStore) {
    setEditTarget(store);
    setForm({
      name: store.name,
      type: store.type,
      taxPercentage: String(store.taxPercentage),
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tax = parseFloat(form.taxPercentage);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (isNaN(tax) || tax < 0) return setFormError("Tax percentage must be a positive number.");
    setFormError("");
    setSaving(true);
    try {
      if (editTarget) {
        await update(editTarget.id, { name: form.name.trim(), type: form.type, taxPercentage: tax });
      } else {
        await create({ name: form.name.trim(), type: form.type, taxPercentage: tax });
      }
      closeForm();
    } catch {
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(store: DFDStore) {
    if (!window.confirm(`Delete "${store.name}"? This cannot be undone.`)) return;
    setDeletingId(store.id);
    try { await remove(store.id); } finally { setDeletingId(null); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Stores</h1>
        <button className={styles.addBtn} onClick={openCreate}>
          <Plus size={16} />
          Add Store
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.info}>Loading stores…</p>}

      {/* Store Form Modal */}
      {showForm && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editTarget ? "Edit Store" : "New Store"}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>Store Name *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Pizza Palace"
                autoFocus
              />

              <label className={styles.label}>Type</label>
              <select
                className={styles.select}
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as StoreType }))}
              >
                <option value="restaurant">Restaurant</option>
                <option value="grocery">Grocery</option>
              </select>

              <label className={styles.label}>Tax Percentage (%)</label>
              <input
                type="number"
                className={styles.input}
                value={form.taxPercentage}
                min="0"
                step="0.1"
                onChange={(e) => setForm((p) => ({ ...p, taxPercentage: e.target.value }))}
              />

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeForm}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store List */}
      {!loading && (
        <div className={styles.storeList}>
          {stores.length === 0 && <p className={styles.empty}>No stores yet. Create one above.</p>}
          {stores.map((store) => (
            <div key={store.id} className={styles.storeCard}>
              <div className={styles.storeInfo}>
                <div className={styles.storeName}>{store.name}</div>
                <div className={styles.storeMeta}>
                  <span className={`${styles.typeBadge} ${styles[`type_${store.type}`]}`}>
                    {store.type}
                  </span>
                  <span className={styles.tax}>Tax: {store.taxPercentage}%</span>
                  <span className={`${styles.activeBadge} ${store.active ? styles.activeOn : styles.activeOff}`}>
                    {store.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className={styles.storeActions}>
                <button
                  className={styles.iconBtn}
                  title={store.active ? "Deactivate" : "Activate"}
                  onClick={() => toggleActive(store.id, !store.active)}
                >
                  {store.active ? <ToggleRight size={20} className={styles.toggleOn} /> : <ToggleLeft size={20} />}
                </button>
                <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(store)}>
                  <Pencil size={16} />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.deleteIcon}`}
                  title="Delete"
                  onClick={() => handleDelete(store)}
                  disabled={deletingId === store.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
