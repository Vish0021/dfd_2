import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAdminStores } from "~/hooks/use-admin-stores";
import { useAdminItems } from "~/hooks/use-admin-items";
import type { DFDItem } from "~/lib/firebase/schema";
import styles from "./admin.items.module.css";

interface ItemFormValues {
  name: string;
  category: string;
  price: string;
  description: string;
  available: boolean;
}

const DEFAULT_FORM: ItemFormValues = {
  name: "",
  category: "",
  price: "",
  description: "",
  available: true,
};

export default function AdminItems() {
  const { stores, loading: storesLoading } = useAdminStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const { items, loading: itemsLoading, create, update, remove, toggleAvailable } = useAdminItems(selectedStoreId);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DFDItem | null>(null);
  const [form, setForm] = useState<ItemFormValues>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(item: DFDItem) {
    setEditTarget(item);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      available: item.available,
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
    if (!selectedStoreId) return;
    const price = parseFloat(form.price);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (!form.category.trim()) return setFormError("Category is required.");
    if (isNaN(price) || price < 0) return setFormError("Price must be a positive number.");
    setFormError("");
    setSaving(true);
    try {
      if (editTarget) {
        await update(editTarget.id, {
          name: form.name.trim(),
          category: form.category.trim(),
          price,
          description: form.description.trim(),
        });
      } else {
        await create({
          storeId: selectedStoreId,
          name: form.name.trim(),
          category: form.category.trim(),
          price,
          description: form.description.trim(),
          available: form.available,
        });
      }
      closeForm();
    } catch {
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: DFDItem) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try { await remove(item.id); } finally { setDeletingId(null); }
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Items</h1>
        {selectedStoreId && (
          <button className={styles.addBtn} onClick={openCreate}>
            <Plus size={16} />
            Add Item
          </button>
        )}
      </div>

      {/* Store selector */}
      <div className={styles.storeSelector}>
        <label className={styles.selectorLabel}>Select Store</label>
        {storesLoading ? (
          <p className={styles.info}>Loading stores…</p>
        ) : (
          <div className={styles.storePills}>
            {stores.map((store) => (
              <button
                key={store.id}
                className={`${styles.storePill} ${selectedStoreId === store.id ? styles.pillActive : ""}`}
                onClick={() => setSelectedStoreId(store.id)}
              >
                {store.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item form modal */}
      {showForm && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editTarget ? "Edit Item" : `Add Item — ${selectedStore?.name}`}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>Name *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Margherita Pizza"
                autoFocus
              />

              <label className={styles.label}>Category *</label>
              <input
                className={styles.input}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Pizza, Drinks, Snacks"
              />

              <label className={styles.label}>Price (₹) *</label>
              <input
                type="number"
                className={styles.input}
                value={form.price}
                min="0"
                step="0.01"
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="e.g. 299"
              />

              <label className={styles.label}>Description (optional)</label>
              <textarea
                className={styles.textarea}
                value={form.description}
                rows={2}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description of the item"
              />

              {!editTarget && (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))}
                  />
                  Available immediately
                </label>
              )}

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeForm}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item list */}
      {!selectedStoreId ? (
        <p className={styles.prompt}>Select a store above to manage its items.</p>
      ) : itemsLoading ? (
        <p className={styles.info}>Loading items…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>No items yet. Add one above.</p>
      ) : (
        <div className={styles.itemList}>
          {items.map((item) => (
            <div key={item.id} className={`${styles.itemCard} ${!item.available ? styles.itemUnavailable : ""}`}>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemCategory}>{item.category}</span>
                  <span className={styles.itemPrice}>₹{item.price.toFixed(2)}</span>
                  <span className={`${styles.availBadge} ${item.available ? styles.availOn : styles.availOff}`}>
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                {item.description && <p className={styles.itemDesc}>{item.description}</p>}
              </div>

              <div className={styles.itemActions}>
                <button
                  className={styles.iconBtn}
                  title={item.available ? "Mark unavailable" : "Mark available"}
                  onClick={() => toggleAvailable(item.id, !item.available)}
                >
                  {item.available
                    ? <ToggleRight size={20} className={styles.toggleOn} />
                    : <ToggleLeft size={20} />
                  }
                </button>
                <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(item)}>
                  <Pencil size={16} />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.deleteIcon}`}
                  title="Delete"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
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
