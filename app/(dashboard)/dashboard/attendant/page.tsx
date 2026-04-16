import { Metadata } from 'next';
import { MapPin, BarChart3, AlertCircle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fuel Attendant Dashboard'
};

export default function AttendantDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Attendant Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <MapPin className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Station Status</div>
          <div className="text-lg font-bold text-green-600">Open</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Clock className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Today's Shifts</div>
          <div className="text-3xl font-bold">1</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Fuel Pumped Today</div>
          <div className="text-3xl font-bold">0 gal</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <AlertCircle className="h-6 w-6 text-yellow-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Alerts</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Station Management</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Fuel Inventory</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage fuel levels</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Update Prices</h3>
            <p className="text-sm text-gray-500 mt-1">Update fuel pricing</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Shift Schedule</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage shifts</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Daily Report</h3>
            <p className="text-sm text-gray-500 mt-1">Generate end-of-day reports</p>
          </a>
        </div>
      </div>
    </div>
  );
}
