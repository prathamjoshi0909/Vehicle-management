import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ExpenseBreakdownChart({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Get user's vehicles
        const vQ = query(collection(db, 'vehicles'), where('userId', '==', userId));
        const vSnap = await getDocs(vQ);
        if (vSnap.empty) {
          setLoading(false);
          return;
        }
        
        const vehicleIds = [];
        const vehicleMap = {};
        vSnap.forEach(doc => {
          vehicleIds.push(doc.id);
          vehicleMap[doc.id] = doc.data().name;
        });

        // 2. Fetch expenses from different collections
        const activeIds = vehicleIds.slice(0, 10);

        let fuelTotal = 0;
        let serviceTotal = 0;
        let oilTotal = 0;
        
        const fuelBreakdown = {};
        const serviceBreakdown = {};
        const oilBreakdown = {};

        // Fetch Fuel Costs
        const fuelQ = query(collection(db, 'fuelLogs'), where('vehicleId', 'in', activeIds));
        const fuelSnap = await getDocs(fuelQ);
        fuelSnap.forEach(doc => {
          const cost = Number(doc.data().totalCost || 0);
          if (cost > 0) {
            fuelTotal += cost;
            const vName = vehicleMap[doc.data().vehicleId];
            fuelBreakdown[vName] = (fuelBreakdown[vName] || 0) + cost;
          }
        });

        // Fetch Service Costs
        const serviceQ = query(collection(db, 'serviceLogs'), where('vehicleId', 'in', activeIds));
        const serviceSnap = await getDocs(serviceQ);
        serviceSnap.forEach(doc => {
          const cost = Number(doc.data().cost || 0);
          if (cost > 0) {
            serviceTotal += cost;
            const vName = vehicleMap[doc.data().vehicleId];
            serviceBreakdown[vName] = (serviceBreakdown[vName] || 0) + cost;
          }
        });

        // Fetch Oil Costs
        const oilQ = query(collection(db, 'oilLogs'), where('vehicleId', 'in', activeIds));
        const oilSnap = await getDocs(oilQ);
        oilSnap.forEach(doc => {
          const cost = Number(doc.data().cost || 0);
          if (cost > 0) {
            oilTotal += cost;
            const vName = vehicleMap[doc.data().vehicleId];
            oilBreakdown[vName] = (oilBreakdown[vName] || 0) + cost;
          }
        });

        let tyreTotal = 0;
        const tyreBreakdown = {};
        // Fetch Tyre Costs
        const tyreQ = query(collection(db, 'tyreLogs'), where('vehicleId', 'in', activeIds));
        const tyreSnap = await getDocs(tyreQ);
        tyreSnap.forEach(doc => {
          const cost = Number(doc.data().cost || 0);
          if (cost > 0) {
            tyreTotal += cost;
            const vName = vehicleMap[doc.data().vehicleId];
            tyreBreakdown[vName] = (tyreBreakdown[vName] || 0) + cost;
          }
        });

        const chartData = [];
        if (fuelTotal > 0) chartData.push({ name: 'Fuel', value: fuelTotal, breakdown: fuelBreakdown });
        if (serviceTotal > 0) chartData.push({ name: 'Service & Repairs', value: serviceTotal, breakdown: serviceBreakdown });
        if (oilTotal > 0) chartData.push({ name: 'Oil & Filters', value: oilTotal, breakdown: oilBreakdown });
        if (tyreTotal > 0) chartData.push({ name: 'Tyre Maintenance', value: tyreTotal, breakdown: tyreBreakdown });

        setData(chartData);
      } catch (error) {
        console.error("Error fetching expense data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, [userId]);

  if (loading) {
    return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Calculating expenses...</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderStyle: 'dashed', borderWidth: '1px', borderColor: 'var(--border-color)', borderRadius: '8px' }}>
        Not enough cost data yet. Add some logs with costs!
      </div>
    );
  }

  const formatCurrency = (value) => `₹${value.toLocaleString()}`;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#1e1e1e', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
          <p style={{ margin: '0 0 8px 0', color: payload[0].payload.fill, fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
            {data.name}: {formatCurrency(data.value)}
          </p>
          
          {Object.entries(data.breakdown || {}).map(([carName, carCost]) => (
            <div key={carName} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '4px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{carName}:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{formatCurrency(carCost)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => <span style={{ color: 'var(--text-main)' }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
