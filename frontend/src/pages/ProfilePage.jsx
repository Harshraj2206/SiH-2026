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
        <div className={`p-3.5 rounded-card border flex items-center justify-between text-xs animate-in fade-in ${
          profileMsg.type === 'success' 
            ? 'bg-risk-low/[0.12] border-risk-low/30 text-risk-low' 
            : 'bg-risk-critical/[0.12] border-risk-critical/30 text-risk-critical'
        }`}>
          <div className="flex items-center gap-2">
            {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-risk-low" /> : <AlertCircle className="w-4 h-4 text-risk-critical" />}
            <span>{profileMsg.text}</span>
          </div>
          <button onClick={() => setProfileMsg({ type: '', text: '' })} className="p-1 hover:bg-surface-2 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Profile Header Card - Full Width */}
      <div className="bg-surface border border-line p-6 rounded-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low text-2xl font-semibold shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-label">{currentUser?.full_name || 'User'}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-risk-low/[0.12] text-risk-low border border-risk-low/30">
                {currentUser?.role || 'Citizen'}
              </span>
            </div>
            <p className="text-xs text-label-2 tabular-nums">@{currentUser?.username}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-label-2 pt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-label-2" />
                {currentUser?.email}
              </span>
              {currentUser?.phone && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-label-2" />
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
              className="px-4 py-2 bg-surface hover:bg-surface-2 text-label hover:text-label rounded-tile text-xs font-semibold border border-line flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-risk-low" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-surface hover:bg-surface-2 text-label-2 rounded-tile text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={logout}
            className="px-4 py-2 bg-risk-critical/[0.12] hover:bg-risk-critical/[0.12] text-risk-critical hover:text-label border border-risk-critical/30 rounded-tile text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-risk-critical" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Profile Edit Inline Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-surface border border-risk-low/30 p-6 rounded-card space-y-4 animate-in fade-in shadow-sm">
          <h3 className="text-xs font-semibold text-label flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-risk-low" />
            <span>Edit Profile Information</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label-2" htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-tile text-xs text-label focus:outline-none focus:border-risk-low/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-label-2" htmlFor="prof-phone">Phone Number</label>
              <input
                id="prof-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98XXX-XXXXX"
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-tile text-xs text-label focus:outline-none focus:border-risk-low/30 tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs text-label-2 hover:text-label"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Emergency Contacts Manager - Full Width */}
      <div className="bg-surface border border-line p-6 rounded-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-sm font-semibold text-label flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-risk-critical" />
              <span>Emergency Contacts</span>
            </h2>
            <p className="text-xs text-label-2 mt-0.5">
              Designated relatives or guardians automatically notified upon emergency SOS trigger.
            </p>
          </div>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="px-4 py-2 bg-risk-critical hover:bg-risk-critical text-label rounded-tile text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Add Contact Modal / Form */}
        {showAddContact && (
          <form onSubmit={handleAddContact} className="p-4 bg-surface border border-risk-critical/30 rounded-tile space-y-3 animate-in fade-in">
            <h4 className="text-xs font-semibold text-label">Add New Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-label-2 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-page border border-line rounded-lg text-xs text-label focus:outline-none focus:border-risk-critical/30"
                />
              </div>
              <div>
                <label className="text-xs text-label-2 block mb-1">Relationship</label>
                <select
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-page border border-line rounded-lg text-xs text-label focus:outline-none focus:border-risk-critical/30"
                >
                  <option value="Family">Family</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-label-2 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98XXX-XXXXX"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-page border border-line rounded-lg text-xs text-label focus:outline-none focus:border-risk-critical/30 tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="px-3 py-1.5 text-xs text-label-2 hover:text-label"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingContact}
                className="px-4 py-1.5 bg-risk-critical hover:bg-risk-critical text-label rounded-lg text-xs font-semibold"
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
                className="p-4 bg-surface border border-line rounded-tile flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-label">{contact.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-risk-critical font-medium">
                      {contact.relationship}
                    </span>
                  </div>
                  <span className="text-xs text-label-2 tabular-nums flex items-center gap-1">
                    <Phone className="w-3 h-3 text-label-3" />
                    {contact.phone}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-1.5 text-label-2 hover:text-risk-critical rounded-lg hover:bg-risk-critical/[0.12] transition-colors"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-label-2 text-center py-6 bg-surface rounded-tile border border-dashed border-line">
            No emergency contacts added yet. Click &quot;Add Contact&quot; to designate emergency contacts.
          </p>
        )}
      </div>

      {/* Location Toggle - Full Width */}
      <div className="bg-surface border border-line p-6 rounded-card space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-label flex items-center gap-2">
              <MapPin className="w-4 h-4 text-risk-low" />
              <span>Location Access</span>
            </h2>
            <p className="text-xs text-label-2 mt-0.5">
              Used for localized landslide hazard alerts, real-time risk telemetry, and closest safe shelter routing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3.5 py-1 rounded-full font-medium ${
              locationStatus === 'GRANTED'
                ? 'bg-risk-low/[0.12] text-risk-low border border-risk-low/30'
                : 'bg-surface-2 text-label-2 border border-line'
            }`}>
              {locationStatus === 'GRANTED' ? 'Location Enabled' : 'Location Disabled'}
            </span>
            {locationStatus !== 'GRANTED' && (
              <button
                onClick={requestLocationPermission}
                className="px-4 py-1.5 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold"
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
