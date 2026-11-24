import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Trash2 } from 'lucide-react';

export default function EditVehicleModal({ isOpen, onClose, vehicle, onVehicleUpdated, onVehicleDeleted }) {
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle && isOpen) {
      setName(vehicle.name || '');
      setRegistration(vehicle.registration || '');
      setFuelType(vehicle.fuelType || 'Petrol');
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !registration) return;

    setLoading(true);
    try {
      const docRef = doc(db, 'vehicles', vehicle.id);
      await updateDoc(docRef, {
        name,
        registration,
        fuelType
      });
      onVehicleUpdated({ ...vehicle, name, registration, fuelType });
      onClose();
    } catch (error) {
      console.error("Error updating vehicle: ", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveToBin() {
    if (window.confirm("Are you sure you want to move this vehicle to the Bin?")) {
      setLoading(true);
      try {
        const docRef = doc(db, 'vehicles', vehicle.id);
        await updateDoc(docRef, {
          deletedAt: new Date().toISOString()
        });
        onVehicleDeleted(vehicle.id);
        onClose();
      } catch (error) {
        console.error("Error moving vehicle to bin: ", error);
      } finally {
        setLoading(false);
      }
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
        
        <h2 style={{ marginBottom: '1.5rem' }}>Edit Vehicle</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Vehicle Name/Model</label>
            <input 
              type="text" 
              className="input" 
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
            <button type="button" onClick={handleMoveToBin} className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={16} /> Bin
            </button>
            <button type="submit" disabled={loading} className="btn" style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
