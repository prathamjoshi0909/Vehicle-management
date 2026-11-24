import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import AddVehicleModal from '../components/AddVehicleModal';
import ExpenseBreakdownChart from '../components/charts/ExpenseBreakdownChart';
import { Plus, Car, ChevronRight, PieChart, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      
      try {
        // Fetch Vehicles
        const vQ = query(collection(db, 'vehicles'), where('userId', '==', currentUser.uid));
        const vSnap = await getDocs(vQ);
        const fetchedVehicles = [];
        const vehicleMap = {};
        vSnap.forEach((doc) => {
          const data = doc.data();
          if (!data.deletedAt) {
            fetchedVehicles.push({ id: doc.id, ...data });
            vehicleMap[doc.id] = data.name;
          }
        });
        setVehicles(fetchedVehicles);

        // Fetch Alerts from all log collections
        if (fetchedVehicles.length > 0) {
          const vehicleIds = fetchedVehicles.map(v => v.id);
          const activeAlerts = [];
          const now = new Date();

          const logCollections = [
            { name: 'documentLogs', dateField: 'expiryDate', typeField: 'type' },
            { name: 'serviceLogs', dateField: 'nextDueDate', typeField: '"Service"' },
            { name: 'oilLogs', dateField: 'nextDueDate', typeField: '"Oil Change"' },
            { name: 'tyreLogs', dateField: 'nextDueDate', typeField: '"Tyre Maintenance"' },
            { name: 'brakeLogs', dateField: 'nextDueDate', typeField: '"Brake Service"' }
          ];

          for (const col of logCollections) {
            const docQ = query(collection(db, col.name), where('vehicleId', 'in', vehicleIds.slice(0, 10)));
            const docSnap = await getDocs(docQ);
            
            docSnap.forEach(d => {
              const docData = d.data();
              const dueDate = docData[col.dateField];
              if (docData.completed || !dueDate) return;
              
              const daysLeft = Math.ceil((new Date(dueDate) - now) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 15) {
                activeAlerts.push({
                  id: d.id,
                  collectionName: col.name,
                  vehicleName: vehicleMap[docData.vehicleId],
                  vehicleId: docData.vehicleId,
                  type: col.typeField.startsWith('"') ? col.typeField.replace(/"/g, '') : docData[col.typeField],
                  daysLeft
                });
              }
            });
          }
          
          // Sort alerts by urgency
          activeAlerts.sort((a, b) => a.daysLeft - b.daysLeft);
          setAlerts(activeAlerts);
          
          // Fetch fuel logs for KMPL calculation
          const fuelQ = query(collection(db, 'fuelLogs'), where('vehicleId', 'in', vehicleIds.slice(0, 10)));
          const fuelSnap = await getDocs(fuelQ);
          const fuelLogsByVehicle = {};
          fuelSnap.forEach(d => {
            const data = d.data();
            if (!fuelLogsByVehicle[data.vehicleId]) fuelLogsByVehicle[data.vehicleId] = [];
            fuelLogsByVehicle[data.vehicleId].push({ id: d.id, ...data });
          });
          
          fetchedVehicles.forEach(v => {
            let kmpl = '-';
            const logs = fuelLogsByVehicle[v.id] || [];
            // Sort by date desc
            logs.sort((a, b) => new Date(b.date) - new Date(a.date));
            const validLogs = logs.filter(l => l.odometer !== '' && l.odometer !== null && l.odometer !== undefined);
            if (validLogs.length >= 2) {
              const maxOdometerLog = validLogs[0];
              const minOdometerLog = validLogs[validLogs.length - 1];
              
              const distance = Number(maxOdometerLog.odometer) - Number(minOdometerLog.odometer);
              const maxIndex = logs.indexOf(maxOdometerLog);
              const minIndex = logs.indexOf(minOdometerLog);
              
              let totalFuel = 0;
              for (let i = maxIndex; i < minIndex; i++) {
                let cost = Number(logs[i].totalCost || 0);
                let price = Number(logs[i].pricePerLiter || 0);
                if (cost > 0 && price > 0) {
                  totalFuel += (cost / price);
                }
              }
              
              if (distance > 0 && totalFuel > 0) {
                kmpl = (distance / totalFuel).toFixed(2);
              }
            }
            v.kmpl = kmpl;
          });
          
          // Update vehicles state with KMPL
          setVehicles([...fetchedVehicles]);
        }

      } catch (error) {
        console.error("Error fetching data: ", error);
        setVehicles([{ id: 'mock-1', name: `ERROR: ${error.message}`, registration: 'TEST-123' }]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  const handleVehicleAdded = (newVehicle) => {
    setVehicles([...vehicles, newVehicle]);
  };

  const handleMarkAsDone = async (collectionName, id) => {
    try {
      await updateDoc(doc(db, collectionName, id), { completed: true });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error marking alert as done", error);
    }
  };

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>My Garage</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your vehicles and their service logs</p>
        </div>
        <button className="btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Add Vehicle
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(alert => (
            <div key={alert.id} className="surface" style={{ 
              padding: '1rem 1.5rem', 
              borderLeft: `4px solid ${alert.daysLeft < 0 ? 'var(--danger)' : '#fbbf24'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <AlertTriangle color={alert.daysLeft < 0 ? 'var(--danger)' : '#fbbf24'} size={24} />
                <div>
                  <h4 style={{ margin: 0, color: alert.daysLeft < 0 ? 'var(--danger)' : '#fbbf24' }}>
                    {alert.daysLeft < 0 ? 'Expired' : `Expiring in ${alert.daysLeft} days`}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {alert.vehicleName} - {alert.type}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleMarkAsDone(alert.collectionName, alert.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={14} /> Done
                </button>
                <Link to={`/vehicle/${alert.vehicleId}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="surface" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
          <Car size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No vehicles found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Add your first vehicle to start tracking logs.</p>
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Add Vehicle
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {vehicles.map(vehicle => (
              <Link to={`/vehicle/${vehicle.id}`} key={vehicle.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="surface" style={{ padding: '1.5rem', transition: 'all 0.2s', cursor: 'pointer' }} 
                     onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div className="flex-between">
                    <div>
                      <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Car size={20} color="var(--primary)" />
                        {vehicle.name}
                      </h3>
                      <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '1px', fontFamily: 'monospace' }}>
                        {vehicle.registration}
                      </div>
                      {vehicle.fuelType && (
                        <div style={{ display: 'inline-block', marginLeft: '0.5rem', background: vehicle.fuelType === 'Diesel' ? 'var(--accent)' : 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {vehicle.fuelType}
                        </div>
                      )}
                      {vehicle.kmpl && vehicle.kmpl !== '-' && (
                        <div style={{ display: 'inline-block', marginLeft: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {vehicle.kmpl} KMPL
                        </div>
                      )}
                    </div>
                    <ChevronRight color="var(--text-muted)" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="surface" style={{ padding: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PieChart color="var(--accent)" />
              Total Cost Breakdown
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Track your total expenses across Fuel, Service, and Oil.</p>
            <ExpenseBreakdownChart userId={currentUser?.uid} />
          </div>
        </>
      )}

      <AddVehicleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onVehicleAdded={handleVehicleAdded}
      />
    </Layout>
  );
}
