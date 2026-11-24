import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdBlueLogs({ vehicleId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [fluidAdded, setFluidAdded] = useState('');
  const [cost, setCost] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(collection(db, 'adBlueLogs'), where('vehicleId', '==', vehicleId));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = [];
        querySnapshot.forEach((docSnap) => {
          fetchedLogs.push({ id: docSnap.id, ...docSnap.data() });
        });
        fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching AdBlue logs", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [vehicleId]);

  const handleEditClick = (log) => {
    setEditingLogId(log.id);
    setDate(log.date || '');
    setOdometer(log.odometer || '');
    setFluidAdded(log.fluidAdded || '');
    setCost(log.cost || '');
    setRemarks(log.remarks || '');
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this AdBlue log?")) {
      try {
        await deleteDoc(doc(db, 'adBlueLogs', id));
        setLogs(logs.filter(log => log.id !== id));
      } catch (error) {
        console.error("Error deleting AdBlue log", error);
      }
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingLogId(null);
    setDate(new Date().toISOString().split('T')[0]); setOdometer(''); setFluidAdded(''); 
    setCost(''); setRemarks('');
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      const logData = {
        vehicleId,
        date,
        odometer: odometer ? Number(odometer) : '',
        fluidAdded: fluidAdded ? Number(fluidAdded) : '',
        cost: cost ? Number(cost) : '',
        remarks,
      };
      
      if (editingLogId) {
        const logRef = doc(db, 'adBlueLogs', editingLogId);
        await updateDoc(logRef, logData);
        setLogs(logs.map(log => log.id === editingLogId ? { id: editingLogId, ...logData, createdAt: log.createdAt } : log).sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        logData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'adBlueLogs'), logData);
        setLogs([{ id: docRef.id, ...logData }, ...logs].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving AdBlue log", error);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>AdBlue / DEF Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track Diesel Exhaust Fluid top-ups</p>
        </div>
        <button className="btn" onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}>
          <Plus size={18} /> Add Log
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="surface" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <h3 style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            {editingLogId ? 'Edit AdBlue Log' : 'New AdBlue Log'}
          </h3>
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Odometer (km)</label>
            <input type="number" className="input" value={odometer} onChange={e => setOdometer(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Fluid Added (L)</label>
            <input type="number" step="0.1" className="input" placeholder="e.g. 5" value={fluidAdded} onChange={e => setFluidAdded(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Cost (₹)</label>
            <input type="number" className="input" value={cost} onChange={e => setCost(e.target.value)} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label>Remarks / Brand</label>
            <input type="text" className="input" placeholder="e.g. Mak AdBlue" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn" style={{ flex: 1 }}>{editingLogId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div className="surface" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No AdBlue logs found.
        </div>
      ) : (
        <div className="surface" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Odometer</th>
                <th style={{ padding: '1rem' }}>Fluid Added (L)</th>
                <th style={{ padding: '1rem' }}>Cost (₹)</th>
                <th style={{ padding: '1rem' }}>Remarks</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{log.date}</td>
                  <td style={{ padding: '1rem' }}>{log.odometer ? `${log.odometer} km` : '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.fluidAdded ? `${log.fluidAdded} L` : '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.cost ? `₹${log.cost}` : '-'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{log.remarks || '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => handleEditClick(log)} title="Edit log">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none', color: 'var(--danger)' }} onClick={() => handleDelete(log.id)} title="Delete log">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
