import { Metadata } from 'next';
import { Navigation, Users, Truck, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dispatcher Dashboard'
};

export default function DispatcherDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dispatcher Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Navigation className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Routes</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Truck className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Available Drivers</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Clock className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Pending Orders</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Users className="h-6 w-6 text-purple-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Teams</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Dispatch Management</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Assign Routes</h3>
            <p className="text-sm text-gray-500 mt-1">Create and assign delivery routes</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Track Drivers</h3>
            <p className="text-sm text-gray-500 mt-1">Monitor all active deliveries</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Manage Orders</h3>
            <p className="text-sm text-gray-500 mt-1">View and optimize order assignments</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Driver Performance</h3>
            <p className="text-sm text-gray-500 mt-1">View metrics and reports</p>
          </a>
        </div>
      </div>
    </div>
  );
}
