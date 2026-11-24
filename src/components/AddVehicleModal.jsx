import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

export default function AddVehicleModal({ isOpen, onClose, onVehicleAdded }) {
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !registration) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'vehicles'), {
        userId: currentUser.uid,
        name,
        registration,
        fuelType,
        createdAt: new Date()
      });
      onVehicleAdded({ id: docRef.id, name, registration, fuelType });
      setName('');
      setRegistration('');
      setFuelType('Petrol');
      onClose();
    } catch (error) {
      console.error("Error adding vehicle: ", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div className="surface animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem' }}>Add New Vehicle</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Vehicle Name/Model</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Honda Civic"
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Registration Number</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. MH-12-AB-1234"
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Fuel Type</label>
            <select className="input" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="EV">Electric (EV)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn" style={{ flex: 1 }}>
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
