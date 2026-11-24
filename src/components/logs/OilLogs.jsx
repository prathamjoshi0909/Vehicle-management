import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2 } from 'lucide-react';

export default function OilLogs({ vehicleId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [oilUsed, setOilUsed] = useState('');
  const [filterChanged, setFilterChanged] = useState('');
  const [cost, setCost] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(collection(db, 'oilLogs'), where('vehicleId', '==', vehicleId));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = [];
        querySnapshot.forEach((docSnap) => {
          fetchedLogs.push({ id: docSnap.id, ...docSnap.data() });
        });
        fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching oil logs", error);
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
    setOilUsed(log.oilUsed || '');
    setFilterChanged(log.filterChanged || '');
    setCost(log.cost || '');
    setNextDueDate(log.nextDueDate || '');
    setRemarks(log.remarks || '');
    setShowAdd(true);
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingLogId(null);
    setFilterChanged('');    setDate(new Date().toISOString().split('T')[0]); setOdometer(''); setOilUsed(''); setCost(''); setNextDueDate(''); setRemarks('');
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      const logData = {
        vehicleId,
        date,
        odometer: odometer ? Number(odometer) : '',
        oilUsed,
        filterChanged,
        cost: cost ? Number(cost) : '',
        nextDueDate,
        remarks,
      };
      
      if (nextDueDate && !editingLogId) {
        logData.completed = false;
      }
      
      if (editingLogId) {
        const logRef = doc(db, 'oilLogs', editingLogId);
        await updateDoc(logRef, logData);
        setLogs(logs.map(log => log.id === editingLogId ? { id: editingLogId, ...logData, createdAt: log.createdAt } : log));
      } else {
        logData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'oilLogs'), logData);
        setLogs([{ id: docRef.id, ...logData }, ...logs].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving oil log", error);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h2>Oil & Filter Changes</h2>
        <button className="btn" onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}>
          <Plus size={18} /> Add Oil Log
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="surface" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <h3 style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            {editingLogId ? 'Edit Oil Log' : 'New Oil Log'}
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
            <label>Oil Used (Brand/Viscosity)</label>
            <input type="text" className="input" placeholder="e.g. Castrol 5W-40" value={oilUsed} onChange={e => setOilUsed(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Oil Filter Changed?</label>
            <input type="text" className="input" placeholder="e.g. Yes (Bosch)" value={filterChanged} onChange={e => setFilterChanged(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Cost (₹)</label>
            <input type="number" className="input" value={cost} onChange={e => setCost(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Next Due Date</label>
            <input type="date" className="input" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Remarks</label>
            <input type="text" className="input" value={remarks} onChange={e => setRemarks(e.target.value)} />
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
          No oil logs found.
        </div>
      ) : (
        <div className="surface" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Odometer</th>
                <th style={{ padding: '1rem' }}>Oil Used</th>
                <th style={{ padding: '1rem' }}>Filter Changed</th>
                <th style={{ padding: '1rem' }}>Cost (₹)</th>
                <th style={{ padding: '1rem' }}>Next Due</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{log.date}</td>
                  <td style={{ padding: '1rem' }}>{log.odometer ? `${log.odometer} km` : '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.oilUsed || '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.filterChanged || '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.cost ? `₹${log.cost}` : '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.nextDueDate || '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => handleEditClick(log)} title="Edit log">
                      <Edit2 size={16} />
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
