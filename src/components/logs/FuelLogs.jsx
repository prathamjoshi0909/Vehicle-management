import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FuelLogs({ vehicleId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [kmpl, setKmpl] = useState('');
  const [isFullTank, setIsFullTank] = useState(false);

  const calculatedFuel = (totalCost && pricePerLiter && Number(pricePerLiter) > 0) 
    ? (Number(totalCost) / Number(pricePerLiter)).toFixed(2) 
    : '0.00';

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(
          collection(db, 'fuelLogs'), 
          where('vehicleId', '==', vehicleId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedLogs = [];
        querySnapshot.forEach((docSnap) => {
          fetchedLogs.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort by date desc
        fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching fuel logs", error);
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
    setPricePerLiter(log.pricePerLiter || '');
    setTotalCost(log.totalCost || '');
    setKmpl(log.kmpl || '');
    setIsFullTank(log.isFullTank !== false);
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fuel log?")) {
      try {
        await deleteDoc(doc(db, 'fuelLogs', id));
        setLogs(logs.filter(log => log.id !== id));
      } catch (error) {
        console.error("Error deleting log", error);
      }
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingLogId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer('');
    setPricePerLiter('');
    setTotalCost('');
    setKmpl('');
    setIsFullTank(false);
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      const logData = {
        vehicleId,
        date,
        odometer: odometer ? Number(odometer) : '',
        pricePerLiter: pricePerLiter ? Number(pricePerLiter) : '',
        totalCost: totalCost ? Number(totalCost) : '',
        fuelFilled: Number(calculatedFuel),
        kmpl: kmpl ? Number(kmpl) : '',
        isFullTank
      };
      
      if (editingLogId) {
        const logRef = doc(db, 'fuelLogs', editingLogId);
        await updateDoc(logRef, logData);
        setLogs(logs.map(log => log.id === editingLogId ? { id: editingLogId, ...logData, createdAt: log.createdAt } : log).sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        logData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'fuelLogs'), logData);
        setLogs([{ id: docRef.id, ...logData }, ...logs].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving fuel log", error);
    }
  }

  // Calculate Overall Average Mileage
  let overallAverageMileage = '-';
  const validLogs = logs.filter(l => l.odometer !== '' && l.odometer !== null && l.odometer !== undefined);
  if (validLogs.length >= 2) {
    // logs are sorted by date desc, so index 0 is newest
    const maxOdometerLog = validLogs[0];
    const minOdometerLog = validLogs[validLogs.length - 1];
    
    const distance = Number(maxOdometerLog.odometer) - Number(minOdometerLog.odometer);
    
    const maxIndex = logs.indexOf(maxOdometerLog);
    const minIndex = logs.indexOf(minOdometerLog);
    
    let totalFuel = 0;
    // Include fuel from newest valid log DOWN TO (but NOT including) the oldest valid log
    for (let i = maxIndex; i < minIndex; i++) {
      let cost = Number(logs[i].totalCost || 0);
      let price = Number(logs[i].pricePerLiter || 0);
      if (cost > 0 && price > 0) {
        totalFuel += (cost / price);
      }
    }
    
    if (distance > 0 && totalFuel > 0) {
      overallAverageMileage = (distance / totalFuel).toFixed(2);
    }
  }

  // Pre-calculate Actual KMPL for all logs and chart data
  const processedLogs = logs.map((log, index) => {
    let actualKmpl = '-';
    const hasOdometer = log.odometer !== '' && log.odometer !== null && log.odometer !== undefined;

    if (hasOdometer) {
      let prevValidLog = null;
      let prevValidIndex = -1;
      for (let i = index + 1; i < logs.length; i++) {
        if (logs[i].odometer !== '' && logs[i].odometer !== null && logs[i].odometer !== undefined) {
          prevValidLog = logs[i];
          prevValidIndex = i;
          break;
        }
      }

      if (prevValidLog) {
        let totalFuelConsumed = 0;
        for (let i = index; i < prevValidIndex; i++) {
          let cost = Number(logs[i].totalCost || 0);
          let price = Number(logs[i].pricePerLiter || 0);
          if (cost > 0 && price > 0) {
            totalFuelConsumed += (cost / price);
          }
        }

        const distance = Number(log.odometer) - Number(prevValidLog.odometer);
        if (distance > 0 && totalFuelConsumed > 0) {
          actualKmpl = (distance / totalFuelConsumed).toFixed(2);
        }
      }
    }
    return { ...log, actualKmpl };
  });

  const chartData = [];
  // Build chart data in chronological order (oldest to newest)
  for (let i = processedLogs.length - 1; i >= 0; i--) {
    const log = processedLogs[i];
    if (log.actualKmpl !== '-') {
      chartData.push({
        date: new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        kmpl: Number(log.actualKmpl)
      });
    }
  }

  return (
    <div data-average-mileage={overallAverageMileage}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h2>Fuel Logs</h2>
        <button className="btn" onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}>
          <Plus size={18} /> Add Fuel Log
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="surface" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <h3 style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            {editingLogId ? 'Edit Fuel Log' : 'New Fuel Log'}
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
            <label>Price per Liter (₹)</label>
            <input type="number" step="0.01" className="input" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Total Cost (₹)</label>
            <input type="number" className="input" value={totalCost} onChange={e => setTotalCost(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Dash KMPL (Optional)</label>
            <input type="number" step="0.1" className="input" value={kmpl} onChange={e => setKmpl(e.target.value)} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fill Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsFullTank(false)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: !isFullTank ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: !isFullTank ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  color: !isFullTank ? '#f59e0b' : 'var(--text-main)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Partial Fill
              </button>
              <button
                type="button"
                onClick={() => setIsFullTank(true)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: isFullTank ? '2px solid #10b981' : '1px solid var(--border-color)',
                  background: isFullTank ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: isFullTank ? '#10b981' : 'var(--text-main)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Full Tank
              </button>
            </div>
          </div>
          
          <div className="input-group" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Calculated Fuel Filled:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{calculatedFuel} L</span>
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
          No fuel logs found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {chartData.length > 1 && (
            <div className="surface" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Mileage Trend (KMPL)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1e1e', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="kmpl" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)' }} activeDot={{ r: 6 }} name="Actual KMPL" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="surface" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Odometer</th>
                <th style={{ padding: '1rem' }}>Price/L</th>
                <th style={{ padding: '1rem' }}>Total Cost</th>
                <th style={{ padding: '1rem' }}>Fuel (L)</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Dash KMPL</th>
                <th style={{ padding: '1rem', color: 'var(--accent)' }}>Actual KMPL</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedLogs.map((log) => {
                const isFull = log.isFullTank !== false;
                const actualKmpl = log.actualKmpl;

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: isFull ? 1 : 0.75 }}>
                    <td style={{ padding: '1rem' }}>{log.date}</td>
                    <td style={{ padding: '1rem' }}>{log.odometer ? `${log.odometer} km` : '-'}</td>
                    <td style={{ padding: '1rem' }}>{log.pricePerLiter ? `₹${log.pricePerLiter}` : '-'}</td>
                    <td style={{ padding: '1rem' }}>{log.totalCost ? `₹${log.totalCost}` : '-'}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.fuelFilled ? `${log.fuelFilled} L` : '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        background: isFull ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        color: isFull ? '#10b981' : '#f59e0b', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {isFull ? 'Full' : 'Partial'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{log.kmpl || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                      {actualKmpl !== '-' ? `${actualKmpl}` : isFull ? '-' : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Waiting for full tank</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} onClick={() => handleEditClick(log)} title="Edit log">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none', color: 'var(--danger)' }} onClick={() => handleDelete(log.id)} title="Delete log">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
