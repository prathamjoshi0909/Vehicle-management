import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Trash2, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Bin() {
  const [deletedVehicles, setDeletedVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const fetchDeletedVehicles = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'vehicles'), where('userId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const vehicles = [];
      const now = new Date();
      
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.deletedAt) {
          const deletedDate = new Date(data.deletedAt);
          const daysInBin = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24));
          
          if (daysInBin > 30) {
            // Auto delete if > 30 days
            await executePermanentDelete(docSnap.id);
          } else {
            vehicles.push({ id: docSnap.id, ...data, daysInBin, daysLeft: 30 - daysInBin });
          }
        }
      }
      setDeletedVehicles(vehicles);
    } catch (error) {
      console.error("Error fetching bin vehicles", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedVehicles();
  }, [currentUser]);

  const handleRestore = async (id) => {
    try {
      const docRef = doc(db, 'vehicles', id);
      await updateDoc(docRef, { deletedAt: null });
      setDeletedVehicles(deletedVehicles.filter(v => v.id !== id));
    } catch (error) {
      console.error("Error restoring vehicle", error);
    }
  };

  const executePermanentDelete = async (vehicleId) => {
    const collectionsToClean = ['fuelLogs', 'adBlueLogs', 'serviceLogs', 'oilLogs', 'tyreLogs', 'brakeLogs', 'documentLogs'];
    
    for (const colName of collectionsToClean) {
      const q = query(collection(db, colName), where('vehicleId', '==', vehicleId));
      const snaps = await getDocs(q);
      snaps.forEach(async (d) => {
        await deleteDoc(doc(db, colName, d.id));
      });
    }
    await deleteDoc(doc(db, 'vehicles', vehicleId));
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm("WARNING: This will permanently delete this vehicle and ALL of its logs forever. This cannot be undone. Are you sure?")) {
      try {
        await executePermanentDelete(id);
        setDeletedVehicles(deletedVehicles.filter(v => v.id !== id));
      } catch (error) {
        console.error("Error deleting vehicle permanently", error);
      }
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Garage
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Trash2 size={32} color="var(--danger)" />
          <div>
            <h1 style={{ margin: 0 }}>Recycle Bin</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Items here will be permanently deleted after 30 days.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading bin...</div>
      ) : deletedVehicles.length === 0 ? (
        <div className="surface" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
          <Trash2 size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>Bin is empty</h3>
          <p style={{ color: 'var(--text-muted)' }}>No deleted vehicles found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {deletedVehicles.map(vehicle => (
            <div key={vehicle.id} className="surface" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{vehicle.name} <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{vehicle.registration}</span></h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <AlertTriangle size={14} color="#f59e0b" />
                  Permanently deleting in {vehicle.daysLeft} days
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => handleRestore(vehicle.id)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={16} /> Restore
                </button>
                <button onClick={() => handlePermanentDelete(vehicle.id)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <Trash2 size={16} /> Delete Forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
