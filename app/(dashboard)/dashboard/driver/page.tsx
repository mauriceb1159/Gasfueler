import { Metadata } from 'next';
import { Truck, Clock, MapPin, DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Driver Dashboard'
};

export default function DriverDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Truck className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Deliveries</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <MapPin className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Completed Today</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Clock className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Hours Worked</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Earnings Today</div>
          <div className="text-3xl font-bold">$0.00</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Today's Routes</h2>
        <div className="text-gray-500 py-8 text-center">
          <p>No active routes. Check back for new delivery assignments.</p>
        </div>
      </div>
    </div>
  );
}
