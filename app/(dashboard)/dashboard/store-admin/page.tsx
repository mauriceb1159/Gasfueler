import { Metadata } from 'next';
import { Users, BarChart3, Settings, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Store Admin Dashboard'
};

export default function StoreAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Store Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Users className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Staff</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <UserCheck className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">On Duty</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Performance</div>
          <div className="text-lg font-bold text-green-600">Good</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Settings className="h-6 w-6 text-purple-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Pending Tasks</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Administrative Tasks</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Staff Management</h3>
            <p className="text-sm text-gray-500 mt-1">Add/remove staff members</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Shift Scheduling</h3>
            <p className="text-sm text-gray-500 mt-1">Create and manage schedules</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Permissions</h3>
            <p className="text-sm text-gray-500 mt-1">Manage role permissions</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Reports</h3>
            <p className="text-sm text-gray-500 mt-1">View administrative reports</p>
          </a>
        </div>
      </div>
    </div>
  );
}
