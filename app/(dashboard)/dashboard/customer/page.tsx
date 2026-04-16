import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Dashboard'
};

export default function CustomerDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-500">Upcoming Deliveries</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-500">Total Spent</div>
          <div className="text-3xl font-bold">$0.00</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-500">Favorite Stations</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-500">Account Status</div>
          <div className="text-lg font-bold text-green-600">Active</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <a href="/book" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Book Fuel Delivery
          </a>
          <a href="/market" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Visit Marketplace
          </a>
        </div>
      </div>
    </div>
  );
}
