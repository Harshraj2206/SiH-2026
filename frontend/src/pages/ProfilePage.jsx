import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  CheckCircle2, 
  Phone, 
  Mail, 
  HeartHandshake, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  MapPin, 
  LogOut, 
  AlertCircle 
} from 'lucide-react';

export const ProfilePage = () => {
  const { 
    currentUser, 
    updateProfile, 
    addEmergencyContact, 
    deleteEmergencyContact, 
    logout,
    locationStatus,
    requestLocationPermission
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser?.full_name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: 'Family', phone: '' });
  const [addingContact, setAddingContact] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await updateProfile({
        full_name: editFullName.trim(),
        phone: editPhone.trim() || null
      });
      setIsEditing(false);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    setAddingContact(true);
    try {
      await addEmergencyContact(newContact);
      setNewContact({ name: '', relationship: 'Family', phone: '' });
      setShowAddContact(false);
      setProfileMsg({ type: 'success', text: 'Emergency contact added.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await deleteEmergencyContact(contactId);
      setProfileMsg({ type: 'success', text: 'Emergency contact removed.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 w-full select-none pb-10">
      
      {/* Toast Notification */}
      {profileMsg.text && (
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in ${
          profileMsg.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : 'bg-red-950/80 border-red-500/40 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{profileMsg.text}</span>
          </div>
          <button onClick={() => setProfileMsg({ type: '', text: '' })} className="p-1 hover:bg-[#181818] rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Profile Header Card - Full Width */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-black shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{currentUser?.full_name || 'User'}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {currentUser?.role || 'Citizen'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">@{currentUser?.username}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {currentUser?.email}
              </span>
              {currentUser?.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {currentUser?.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {!isEditing ? (
            <button
              onClick={() => {
                setEditFullName(currentUser?.full_name || '');
                setEditPhone(currentUser?.phone || '');
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-[#121212] hover:bg-[#1a1a1a] text-neutral-200 hover:text-white rounded-xl text-xs font-bold border border-[#222222] flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-[#121212] hover:bg-[#1a1a1a] text-neutral-400 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={logout}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Profile Edit Inline Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-[#0a0a0a] border border-emerald-500/40 p-6 rounded-2xl space-y-4 animate-in fade-in shadow-sm">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-emerald-400" />
            <span>Edit Profile Information</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300" htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#222222] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300" htmlFor="prof-phone">Phone Number</label>
              <input
                id="prof-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98XXX-XXXXX"
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#222222] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Emergency Contacts Manager - Full Width */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a1a1a] pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <span>Emergency Contacts</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Designated relatives or guardians automatically notified upon emergency SOS trigger.
            </p>
          </div>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Add Contact Modal / Form */}
        {showAddContact && (
          <form onSubmit={handleAddContact} className="p-4 bg-[#121212] border border-rose-500/40 rounded-xl space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-white">Add New Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Relationship</label>
                <select
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Family">Family</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98XXX-XXXXX"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingContact}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {addingContact ? 'Adding...' : 'Save Contact'}
              </button>
            </div>
          </form>
        )}

        {/* Contacts List */}
        {currentUser?.emergency_contacts && currentUser.emergency_contacts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentUser.emergency_contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{contact.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-rose-300 font-medium">
                      {contact.relationship}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-neutral-500" />
                    {contact.phone}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center py-6 bg-[#0f0f0f] rounded-xl border border-dashed border-[#222222]">
            No emergency contacts added yet. Click &quot;Add Contact&quot; to designate emergency contacts.
          </p>
        )}
      </div>

      {/* Location Toggle - Full Width */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Location Access</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Used for localized landslide hazard alerts, real-time risk telemetry, and closest safe shelter routing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3.5 py-1 rounded-full font-medium ${
              locationStatus === 'GRANTED'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#181818] text-neutral-400 border border-[#2a2a2a]'
            }`}>
              {locationStatus === 'GRANTED' ? 'Location Enabled' : 'Location Disabled'}
            </span>
            {locationStatus !== 'GRANTED' && (
              <button
                onClick={requestLocationPermission}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold"
              >
                Enable
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
