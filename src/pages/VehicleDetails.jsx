import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';
import { ArrowLeft, Settings, Droplets, PenTool, Circle, Disc, FileText, Edit } from 'lucide-react';
import FuelLogs from '../components/logs/FuelLogs';
import ServiceLogs from '../components/logs/ServiceLogs';
import OilLogs from '../components/logs/OilLogs';
import TyreLogs from '../components/logs/TyreLogs';
import BrakeLogs from '../components/logs/BrakeLogs';
import DocumentLogs from '../components/logs/DocumentLogs';
import AdBlueLogs from '../components/logs/AdBlueLogs';
import EditVehicleModal from '../components/EditVehicleModal';

export default function VehicleDetails() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('fuel');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchVehicle() {
      try {
        const docRef = doc(db, 'vehicles', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVehicle({ id: docSnap.id, ...docSnap.data() });
        } else {
          setVehicle({ id, name: 'Mock Vehicle', registration: 'TEST-123' }); // fallback
        }
      } catch (error) {
        console.error("Error fetching vehicle", error);
        setVehicle({ id, name: 'Mock Vehicle', registration: 'TEST-123' }); // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchVehicle();
  }, [id]);

  const tabs = [
    { id: 'fuel', label: 'Fuel Logs', icon: <Droplets size={18} /> },
    ...(vehicle?.fuelType === 'Diesel' ? [{ id: 'adblue', label: 'AdBlue / DEF', icon: <Droplets size={18} color="#3b82f6" /> }] : []),
    { id: 'service', label: 'Service History', icon: <Settings size={18} /> },
    { id: 'oil', label: 'Oil & Filter', icon: <PenTool size={18} /> },
    { id: 'tyres', label: 'Tyre Maintenance', icon: <Circle size={18} /> },
    { id: 'brakes', label: 'Brake Service', icon: <Disc size={18} /> },
    { id: 'docs', label: 'Documents', icon: <FileText size={18} /> },
  ];

  if (loading) return <Layout><div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div></Layout>;
  if (!vehicle) return <Layout><div>Vehicle not found</div></Layout>;

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Garage
        </Link>
        <div className="flex-between">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {vehicle.name}
              <button onClick={() => setIsEditModalOpen(true)} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none', background: 'none' }} title="Edit Vehicle">
                <Edit size={18} color="var(--text-muted)" />
              </button>
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Reg: <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{vehicle.registration}</span>
              {vehicle.fuelType && <span style={{ marginLeft: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{vehicle.fuelType}</span>}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'fuel' && <FuelLogs vehicleId={id} />}
        {activeTab === 'adblue' && <AdBlueLogs vehicleId={id} />}
        {activeTab === 'service' && <ServiceLogs vehicleId={id} />}
        {activeTab === 'oil' && <OilLogs vehicleId={id} />}
        {activeTab === 'tyres' && <TyreLogs vehicleId={id} />}
        {activeTab === 'brakes' && <BrakeLogs vehicleId={id} />}
        {activeTab === 'docs' && <DocumentLogs vehicleId={id} />}
      </div>

      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        vehicle={vehicle}
        onVehicleUpdated={setVehicle}
        onVehicleDeleted={() => navigate('/')}
      />
    </Layout>
  );
}
