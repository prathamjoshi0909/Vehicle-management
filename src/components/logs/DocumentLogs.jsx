import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

export default function DocumentLogs({ vehicleId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Form states
  const [type, setType] = useState('PUC'); // PUC or Insurance
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(collection(db, 'documentLogs'), where('vehicleId', '==', vehicleId));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = [];
        querySnapshot.forEach((docSnap) => {
          fetchedLogs.push({ id: docSnap.id, ...docSnap.data() });
        });
        fetchedLogs.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching documents", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [vehicleId]);

  const handleEditClick = (log) => {
    setEditingLogId(log.id);
    setType(log.type || 'PUC');
    setDocumentNumber(log.documentNumber || '');
    setIssueDate(log.issueDate || '');
    setExpiryDate(log.expiryDate || '');
    setCompleted(log.completed || false);
    setShowAdd(true);
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingLogId(null);
    setType('PUC'); setDocumentNumber(''); setIssueDate(new Date().toISOString().split('T')[0]); 
    setExpiryDate(''); setCompleted(false);
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      const logData = {
        vehicleId,
        type,
        documentNumber,
        issueDate,
        expiryDate,
        completed,
      };
      
      if (editingLogId) {
        const logRef = doc(db, 'documentLogs', editingLogId);
        await updateDoc(logRef, logData);
        setLogs(logs.map(log => log.id === editingLogId ? { id: editingLogId, ...logData, createdAt: log.createdAt } : log));
      } else {
        logData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'documentLogs'), logData);
        setLogs([{ id: docRef.id, ...logData }, ...logs].sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate)));
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving document", error);
    }
  }

  const getStatusDisplay = (expiryDate, completed) => {
    if (completed) return <span style={{ color: 'var(--accent)' }}>Completed</span>;
    if (!expiryDate) return '-';
    
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Expired</span>;
    if (daysLeft <= 15) return <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14}/> Expires in {daysLeft} days</span>;
    return <span style={{ color: 'var(--text-main)' }}>Active</span>;
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Compliance & Documents</h2>
          <p style={{ color: 'var(--text-muted)' }}>Track PUC and Insurance renewals.</p>
        </div>
        <button className="btn" onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="surface" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <h3 style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            {editingLogId ? 'Edit Document' : 'New Document'}
          </h3>
          
          <div className="input-group">
            <label>Document Type</label>
            <select className="input" value={type} onChange={e => setType(e.target.value)}>
              <option value="PUC">PUC</option>
              <option value="Insurance">Insurance</option>
            </select>
          </div>
          
          <div className="input-group">
            <label>Document / Policy Number</label>
            <input type="text" className="input" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
          </div>
          
          <div className="input-group">
            <label>Issue Date</label>
            <input type="date" className="input" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          
          <div className="input-group">
            <label>Expiry Date</label>
            <input type="date" className="input" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>

          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', height: '100%', paddingBottom: '0.6rem' }}>
            <input type="checkbox" id="completed" checked={completed} onChange={e => setCompleted(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <label htmlFor="completed" style={{ margin: 0, cursor: 'pointer' }}>Mark as Completed / Renewed</label>
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
          No documents tracked yet. Add your PUC or Insurance to get started.
        </div>
      ) : (
        <div className="surface" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Number</th>
                <th style={{ padding: '1rem' }}>Issue Date</th>
                <th style={{ padding: '1rem' }}>Expiry Date</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.type}</td>
                  <td style={{ padding: '1rem' }}>{log.documentNumber || '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.issueDate || '-'}</td>
                  <td style={{ padding: '1rem' }}>{log.expiryDate}</td>
                  <td style={{ padding: '1rem' }}>{getStatusDisplay(log.expiryDate, log.completed)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => handleEditClick(log)} title="Edit Document">
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
