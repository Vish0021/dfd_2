import { useState } from "react";
import { LogOut, User, Phone, Mail, MapPin, ChevronRight, Edit2, Plus, Trash2, Home, Briefcase, Map, Clock } from "lucide-react";
import { useAuth } from "~/hooks/use-auth";
import { updateUser } from "~/lib/firebase/services/users.service";
import { useNavigate, Link } from "react-router";
import type { Address } from "~/lib/firebase/schema";
import styles from "./user.profile.module.css";

export default function UserProfile() {
  const { profile, firebaseUser, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({ name: profile?.name || "", phone: profile?.phone || "" });
  
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<Address>>({ label: "Home", house: "", street: "", area: "", city: "", pincode: "" });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const saveProfile = async () => {
    if (!firebaseUser) return;
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    await updateUser(firebaseUser.uid, { name: formData.name, phone: formData.phone });
    await refreshProfile();
    setIsEditingProfile(false);
  };

  const saveAddress = async () => {
    if (!firebaseUser || !profile) return;
    if (!addressForm.house || !addressForm.street || !addressForm.city || !addressForm.pincode) {
      alert("Please fill in all required address fields.");
      return;
    }
    if (!/^\d{6}$/.test(addressForm.pincode)) {
      alert("Please enter a valid 6-digit Indian Pincode.");
      return;
    }
    
    let updatedAddresses = [...(profile.addresses || [])];
    
    if (editingAddrId) {
      updatedAddresses = updatedAddresses.map(a => 
        a.id === editingAddrId 
          ? { ...a, ...addressForm, label: addressForm.label as any || "Other" } as Address
          : a
      );
    } else {
      const newAddress: Address = {
        id: "addr_" + Date.now(),
        label: addressForm.label as any || "Other",
        house: addressForm.house || "",
        street: addressForm.street || "",
        area: addressForm.area || "",
        city: addressForm.city || "",
        pincode: addressForm.pincode || "",
        isDefault: profile.addresses?.length === 0,
      };
      updatedAddresses.push(newAddress);
    }

    await updateUser(firebaseUser.uid, { addresses: updatedAddresses });
    await refreshProfile();
    setIsAddingAddress(false);
    setEditingAddrId(null);
    setAddressForm({ label: "Home", house: "", street: "", area: "", city: "", pincode: "" });
  };

  const deleteAddress = async (addrId: string) => {
    if (!firebaseUser || !profile) return;
    const updated = (profile.addresses || []).filter(a => a.id !== addrId);
    await updateUser(firebaseUser.uid, { addresses: updated });
    await refreshProfile();
  };

  const setAsDefault = async (addrId: string) => {
    if (!firebaseUser || !profile) return;
    const updated = (profile.addresses || []).map(a => ({
      ...a,
      isDefault: a.id === addrId
    }));
    await updateUser(firebaseUser.uid, { addresses: updated });
    await refreshProfile();
  };

  const displayName = profile?.name ?? firebaseUser?.displayName ?? "User";
  const initials = displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Account</h1>
      </header>

      <main className={styles.main}>
        {/* Personal Info Section */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.nameBlock}>
                <p className={styles.name}>{displayName}</p>
                <p className={styles.subText}>{firebaseUser?.email || profile?.phone}</p>
              </div>
            </div>
            {!isEditingProfile ? (
              <button className={styles.textBtn} onClick={() => setIsEditingProfile(true)}>Edit</button>
            ) : (
              <button className={styles.textBtnDone} onClick={saveProfile}>Save</button>
            )}
          </div>

          {isEditingProfile && (
            <div className={styles.editForm}>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className={styles.inputField} />
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone Number" className={styles.inputField} />
            </div>
          )}
        </section>

        {/* Global Actions */}
        <section className={styles.actionNav}>
          <Link to="/user/orders" className={styles.navLink}>
            <div className={styles.navIcon}><Clock size={20} /></div>
            <div className={styles.navList}>
              <span className={styles.navTitle}>Order History</span>
              <span className={styles.navSub}>View previous orders and reorder</span>
            </div>
            <ChevronRight size={18} className={styles.navArrow} />
          </Link>
        </section>

        {/* Address Book Section */}
        <section className={styles.addressSection}>
          <div className={styles.addressHeader}>
            <h2 className={styles.sectionTitle}>Saved Addresses</h2>
            {(!isAddingAddress && !editingAddrId) && (
              <button 
                className={styles.addAddrBtn} 
                onClick={() => {
                  setAddressForm({ label: "Home", house: "", street: "", area: "", city: "", pincode: "" });
                  setIsAddingAddress(true);
                }}
              >
                <Plus size={16} /> Add New
              </button>
            )}
          </div>

          {(isAddingAddress || editingAddrId) && (
            <div className={styles.addressForm}>
              <div className={styles.labelPicker}>
                {['Home', 'Work', 'Other'].map(lbl => (
                  <button key={lbl} className={addressForm.label === lbl ? styles.labelBtnActive : styles.labelBtn} onClick={() => setAddressForm({...addressForm, label: lbl as any})}>
                    {lbl === 'Home' ? <Home size={14}/> : lbl === 'Work' ? <Briefcase size={14}/> : <Map size={14}/>} {lbl}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="House / Flat No." value={addressForm.house} onChange={e => setAddressForm({...addressForm, house: e.target.value})} className={styles.inputField} />
              <input type="text" placeholder="Street / Area" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className={styles.inputField} />
              <div className={styles.rowInputs}>
                <input type="text" placeholder="City" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className={styles.inputField} />
                <input type="text" placeholder="Pincode" value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} className={styles.inputField} />
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => { setIsAddingAddress(false); setEditingAddrId(null); }}>Cancel</button>
                <button className={styles.saveBtn} onClick={saveAddress}>Save Address</button>
              </div>
            </div>
          )}

          <div className={styles.addressList}>
            {profile?.addresses?.length ? profile.addresses.map((addr) => (
              <div key={addr.id} className={`${styles.addressCard} ${addr.isDefault ? styles.defaultCard : ''}`}>
                <div className={styles.addrIcon}>
                  {addr.label === 'Home' ? <Home size={20}/> : addr.label === 'Work' ? <Briefcase size={20}/> : <MapPin size={20}/>}
                </div>
                <div className={styles.addrDetails}>
                  <div className={styles.addrtop}>
                    <h4>{addr.label}</h4>
                    {addr.isDefault && <span className={styles.defaultBadge}>Default</span>}
                  </div>
                  <p>{addr.house}, {addr.street}</p>
                  <p>{addr.area}, {addr.city} {addr.pincode}</p>
                  <div className={styles.addrActions}>
                    {!addr.isDefault && <button onClick={() => setAsDefault(addr.id)}>Set Default</button>}
                    <button className={styles.editText} onClick={() => {
                      setAddressForm(addr);
                      setEditingAddrId(addr.id);
                    }}><Edit2 size={13}/> Edit</button>
                    <button className={styles.deleteText} onClick={() => deleteAddress(addr.id)}><Trash2 size={13}/> Delete</button>
                  </div>
                </div>
              </div>
            )) : (
              !isAddingAddress && !editingAddrId && <div className={styles.emptyAddresses}>No addresses saved yet.</div>
            )}
          </div>
        </section>

        {/* Settings & Logout */}
        <section className={styles.actionNav}>
          <button className={styles.logoutRow} onClick={handleLogout}>
            <div className={styles.logoutIcon}><LogOut size={20} /></div>
            <span className={styles.navTitle}>Sign Out</span>
          </button>
        </section>

        <div className={styles.versionFooter}>
          DFD App v1.0.0
        </div>
      </main>
    </div>
  );
}
